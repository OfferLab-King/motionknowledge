import type {ReactNode} from 'react';
import {brand} from '@motionknowledge/config';

export function AppShell({children, actions}: {children: ReactNode; actions?: ReactNode}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#2a4568] bg-[#0a1526]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2 font-bold text-[#f8fafc]">
            <span className="text-[#59d5e0]">▶</span> {brand.productName}
          </a>
          <nav className="flex items-center gap-4">{actions}</nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
