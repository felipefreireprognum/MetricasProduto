import type { ReactNode } from 'react';
import type { BankTokens } from '@/theme/tokens';
import { STRINGS } from '@/constants/strings';

interface EmptyStateProps {
  message?: string;
  description?: string;
  tokens?: BankTokens;
  action?: ReactNode;
}

export default function EmptyState({
  message = STRINGS.states.empty,
  description,
  tokens,
  action,
}: EmptyStateProps) {
  const border    = tokens?.border.default ?? '#E2E8F0';
  const bg        = tokens?.bg.base        ?? '#F8F9FC';
  const textPri   = tokens?.text.primary   ?? '#0F172A';
  const textMuted = tokens?.text.muted     ?? '#94A3B8';
  const accent    = tokens?.accent.primary ?? '#1A5FFF';

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: bg, border: `1px solid ${border}` }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={accent} strokeWidth="1.5" strokeOpacity="0.35" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={accent} strokeWidth="1.5" strokeOpacity="0.35" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={accent} strokeWidth="1.5" strokeOpacity="0.35" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={accent} strokeWidth="1.5" />
        </svg>
      </div>

      <p className="text-sm font-semibold" style={{ color: textPri }}>{message}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color: textMuted }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
