import type {ReactNode} from 'react';

export function Card({children, className = ''}: {children: ReactNode; className?: string}) {
  return (
    <div className={`rounded-xl border border-[#2a4568] bg-[#10213a] p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({title, subtitle}: {title: string; subtitle?: string}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[#f8fafc]">{title}</h2>
      {subtitle ? <p className="text-sm text-[#9fb2c8]">{subtitle}</p> : null}
    </div>
  );
}
