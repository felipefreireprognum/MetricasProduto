import type { ReactNode } from 'react';
import type { BankTokens } from '@/theme/tokens';

type Variant = 'default' | 'elevated' | 'flush';

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: string;
  tokens?: BankTokens;
  variant?: Variant;
  padding?: string;
}

const shadows: Record<Variant, string> = {
  default:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  elevated: '0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  flush:    'none',
};

export default function Card({
  children,
  className = '',
  accent,
  tokens,
  variant = 'default',
  padding = 'p-5',
}: CardProps) {
  const bg     = tokens?.bg.surface     ?? '#FFFFFF';
  const border = tokens?.border.default ?? '#E2E8F0';

  return (
    <div
      className={`rounded-xl ${padding} ${className}`}
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        boxShadow: shadows[variant],
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${border}`,
      }}
    >
      {children}
    </div>
  );
}
