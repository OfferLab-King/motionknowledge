import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionUser} from '../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../lib/db';
import {resolveWorkspaceId} from '../../../../services/projects';
import {subscriptions, creditLedger} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';
import {planForId, packForId, stripeConfigured} from '../../../../lib/billing';

const CheckoutSchema = z.object({
  kind: z.enum(['plan', 'credits']),
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = await request.json().catch(() => ({}));
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  const db = getServiceDb();
  const workspaceId = await resolveWorkspaceId(db, user.id);
  if (!workspaceId) return NextResponse.json({error: 'no workspace'}, {status: 403});

  const item = parsed.data.kind === 'plan' ? planForId(parsed.data.id) : packForId(parsed.data.id);
  if (!item) return NextResponse.json({error: 'unknown item'}, {status: 400});

  // Stripe path: create a Checkout Session and redirect.
  if (stripeConfigured() && item.stripePriceId) {
    const {default: Stripe} = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{price: item.stripePriceId, quantity: 1}],
      success_url: `${process.env.NEXT_PUBLIC_PRODUCT_DOMAIN ?? 'http://127.0.0.1:3000'}/settings?billing=ok`,
      cancel_url: `${process.env.NEXT_PUBLIC_PRODUCT_DOMAIN ?? 'http://127.0.0.1:3000'}/pricing`,
      metadata: {workspaceId, kind: parsed.data.kind, itemId: parsed.data.id},
      client_reference_id: workspaceId,
    });
    return NextResponse.json({url: session.url});
  }

  // Dev mode: fulfill directly so the flow is testable without Stripe keys.
  if (parsed.data.kind === 'plan') {
    const plan = planForId(parsed.data.id)!;
    await db
      .update(subscriptions)
      .set({status: 'active', plan: plan.id, startedAt: new Date(), endedAt: null})
      .where(eq(subscriptions.workspaceId, workspaceId));
    await db.insert(creditLedger).values({
      workspaceId,
      entryType: 'grant',
      amountCredits: plan.monthlyCredits,
      description: `Plan: ${plan.name} (dev-mode grant)`,
    });
    return NextResponse.json({dev: true, fulfilled: true, redirect: '/settings?billing=ok'});
  }

  const pack = packForId(parsed.data.id)!;
  await db.insert(creditLedger).values({
    workspaceId,
    entryType: 'grant',
    amountCredits: pack.credits,
    description: `Credit pack: ${pack.credits} credits (dev-mode grant)`,
  });
  return NextResponse.json({dev: true, fulfilled: true, redirect: '/settings?billing=ok'});
}
