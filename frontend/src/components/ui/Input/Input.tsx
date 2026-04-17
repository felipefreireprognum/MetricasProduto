'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export default function Input({ label, error, leftIcon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#0F172A]">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{leftIcon}</div>
        )}
        <input
          className={`w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] transition-colors focus:border-[#1A5FFF] focus:outline-none focus:ring-2 focus:ring-[#1A5FFF]/20 disabled:bg-[#F8F9FC] ${leftIcon ? 'pl-9' : ''} ${error ? 'border-[#EF4444]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}
