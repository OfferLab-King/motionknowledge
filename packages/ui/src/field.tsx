import type {InputHTMLAttributes, SelectHTMLAttributes, ReactNode} from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({label, hint, error, children}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#9fb2c8]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#9fb2c8]">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-[#fb7185]">{error}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-[#f8fafc] outline-none focus:border-[#59d5e0]';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}
