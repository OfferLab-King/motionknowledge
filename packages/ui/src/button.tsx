import type {ButtonHTMLAttributes, ReactNode} from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
}

const variants = {
  primary: 'bg-[#59d5e0] text-[#08111f] hover:bg-[#4bc4d0]',
  secondary: 'bg-[#10213a] text-[#f8fafc] hover:bg-[#1a3050] border border-[#2a4568]',
  ghost: 'text-[#9fb2c8] hover:text-[#f8fafc]',
  danger: 'bg-[#fb7185] text-[#08111f] hover:bg-[#f9586e]',
};

export function Button({variant = 'primary', className = '', children, ...props}: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
