'use client';

import {useState} from 'react';

export function CheckoutButton(props: {kind: 'plan' | 'credits'; id: string; label: string; className?: string}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({kind: props.kind, id: props.id}),
      });
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = (await response.json()) as {url?: string; redirect?: string; error?: string};
      if (!response.ok) {
        setError(data.error ?? 'Checkout failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        window.location.href = data.redirect;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void checkout()}
        className={props.className ?? 'rounded-lg bg-[#59d5e0] px-4 py-2 text-sm font-semibold text-[#08111f] hover:bg-[#4bc4d0] disabled:opacity-50'}
      >
        {busy ? '…' : props.label}
      </button>
      {error ? <p className="mt-1 text-xs text-[#fb7185]">{error}</p> : null}
    </div>
  );
}
