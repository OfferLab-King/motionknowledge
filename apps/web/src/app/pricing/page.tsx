import Link from 'next/link';
import {PLANS, CREDIT_PACKS} from '../../lib/billing';
import {CheckoutButton} from '../../components/billing/CheckoutButton';

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-[#f8fafc]">
            Pricing that scales with your <span className="text-[#59d5e0]">creations</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[#9fb2c8]">
            Credits are consumed by paid operations — research, narration, and renders. Start free, buy
            more when you are ready.
          </p>
        </div>

        <div className="mb-16 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan: {id: string; name: string; priceUsd: number; blurb: string; features: string[]}) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.id === 'pro' ? 'border-[#59d5e0] bg-[#0f1c30]' : 'border-[#2a4568] bg-[#0f1c30]'
              }`}
            >
              <h2 className="text-lg font-bold text-[#f8fafc]">{plan.name}</h2>
              <div className="mt-2 text-3xl font-extrabold text-[#f8fafc]">
                {plan.priceUsd === 0 ? 'Free' : `$${plan.priceUsd}`}
                {plan.priceUsd > 0 ? <span className="text-sm font-normal text-[#9fb2c8]">/month</span> : null}
              </div>
              <p className="mt-2 text-sm text-[#9fb2c8]">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[#f8fafc]">
                {plan.features.map((feature: string) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.priceUsd === 0 ? (
                  <Link
                    href="/register"
                    className="block rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-center text-sm font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
                  >
                    Start free
                  </Link>
                ) : (
                  <CheckoutButton kind="plan" id={plan.id} label={`Upgrade to ${plan.name}`} className="w-full rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0] disabled:opacity-50" />
                )}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 text-center text-xl font-bold text-[#f8fafc]">Credit packs</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack: {id: string; credits: number; priceUsd: number}) => (
            <div key={pack.id} className="rounded-2xl border border-[#2a4568] bg-[#0f1c30] p-6 text-center">
              <div className="text-2xl font-extrabold text-[#f8fafc]">{pack.credits.toLocaleString()}</div>
              <div className="text-sm text-[#9fb2c8]">credits · ${pack.priceUsd}</div>
              <div className="mt-4">
                <CheckoutButton kind="credits" id={pack.id} label="Buy credits" className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-4 py-2 text-sm font-semibold text-[#59d5e0] hover:bg-[#1a3050] disabled:opacity-50" />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[#64748b]">
          Without Stripe keys configured, checkouts are fulfilled immediately in development mode.
        </p>
      </div>
    </div>
  );
}
