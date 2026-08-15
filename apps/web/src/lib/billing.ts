/**
 * Billing configuration: plans and credit packs. Stripe price IDs come from
 * the environment; without STRIPE_SECRET_KEY the checkout falls back to a
 * direct grant (dev mode) so the flow is testable end-to-end locally.
 */

export interface PlanPricing {
  id: string;
  name: string;
  priceUsd: number;
  monthlyCredits: number;
  blurb: string;
  features: string[];
  stripePriceId: string | null;
}

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
  stripePriceId: string | null;
}

export const PLANS: PlanPricing[] = [
  {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    monthlyCredits: 5000,
    blurb: 'Try the full pipeline on the house.',
    features: ['5,000 credits to start', 'All styles and templates', 'MP4 + SRT + chapters exports', 'Community support'],
    stripePriceId: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsd: 19,
    monthlyCredits: 50000,
    blurb: 'For creators publishing regularly.',
    features: ['50,000 credits every month', 'Priority rendering queue', 'Brand mark control', 'Email support'],
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  {
    id: 'studio',
    name: 'Studio',
    priceUsd: 49,
    monthlyCredits: 200000,
    blurb: 'For teams and courses.',
    features: ['200,000 credits every month', 'Workspace invites', 'Share links', 'Dedicated support'],
    stripePriceId: process.env.STRIPE_PRICE_STUDIO ?? null,
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  {id: 'credits-5000', credits: 5000, priceUsd: 5, stripePriceId: process.env.STRIPE_PRICE_CREDITS_5000 ?? null},
  {id: 'credits-25000', credits: 25000, priceUsd: 20, stripePriceId: process.env.STRIPE_PRICE_CREDITS_25000 ?? null},
  {id: 'credits-100000', credits: 100000, priceUsd: 60, stripePriceId: process.env.STRIPE_PRICE_CREDITS_100000 ?? null},
];

export function planForId(planId: string): PlanPricing | undefined {
  return PLANS.find((plan) => plan.id === planId);
}

export function packForId(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === packId);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
