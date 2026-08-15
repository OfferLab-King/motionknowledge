import {NextResponse} from 'next/server';
import {getServiceDb} from '../../../../lib/db';
import {subscriptions, creditLedger} from '@motionknowledge/database';
import {eq} from 'drizzle-orm';

/**
 * Stripe webhook: fulfills checkout sessions (plan upgrades and credit
 * packs). Signature-verified; only fires when Stripe is configured.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({received: true, skipped: 'stripe not configured'});
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({error: 'missing signature'}, {status: 400});
  const {default: Stripe} = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: ReturnType<typeof Stripe.webhooks.constructEvent>;
  try {
    event = Stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({error: 'invalid signature'}, {status: 400});
  }
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({received: true});
  }
  const session = event.data.object as {metadata?: Record<string, string>; client_reference_id?: string};
  const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id;
  const kind = session.metadata?.kind;
  const itemId = session.metadata?.itemId;
  if (!workspaceId || !kind || !itemId) {
    return NextResponse.json({error: 'missing metadata'}, {status: 400});
  }
  const db = getServiceDb();
  if (kind === 'plan') {
    await db
      .update(subscriptions)
      .set({status: 'active', plan: itemId, startedAt: new Date(), endedAt: null})
      .where(eq(subscriptions.workspaceId, workspaceId));
  }
  // Monthly credit grants for plans are handled by a scheduled job in a later
  // phase; this webhook grants the immediate purchase value via the pack path.
  const {packForId, planForId} = await import('../../../../lib/billing');
  const amount = kind === 'credits' ? packForId(itemId)?.credits : planForId(itemId)?.monthlyCredits;
  if (amount) {
    await db.insert(creditLedger).values({
      workspaceId,
      entryType: 'grant',
      amountCredits: amount,
      description: `Checkout: ${kind} ${itemId}`,
    });
  }
  return NextResponse.json({received: true});
}
