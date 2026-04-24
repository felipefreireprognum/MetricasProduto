'use client';

import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

const variants = {
  primary:
    'bg-[#1A5FFF] text-white hover:bg-[#0040CC] focus-visible:ring-[#1A5FFF] ' +
    'shadow-[0_1px_2px_rgba(26,95,255,0.3)]',
  secondary:
    'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] focus-visible:ring-[#1A5FFF] ' +
    'border border-[#E2E8F0]',
  ghost:
    'text-[#475569] hover:bg-[#F8F9FC] hover:text-[#0F172A] focus-visible:ring-[#1A5FFF]',
  danger:
    'bg-[#EF4444] text-white hover:bg-[#DC2626] focus-visible:ring-[#EF4444] ' +
    'shadow-[0_1px_2px_rgba(239,68,68,0.3)]',
};

const sizes = {
  xs: 'text-xs px-2.5 py-1.5',
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-6 py-3',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
