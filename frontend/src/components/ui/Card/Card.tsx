import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: string;
}

export default function Card({ children, className = '', accent }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm ${className}`}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
    >
      {children}
    </div>
  );
}
