import type { BankTokens } from '@/theme/tokens';
import { STRINGS } from '@/constants/strings';

interface LoadingStateProps {
  message?: string;
  tokens?: BankTokens;
}

export default function LoadingState({
  message = STRINGS.states.loading,
  tokens,
}: LoadingStateProps) {
  const color = tokens?.accent.primary ?? '#1A5FFF';

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: color,
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium" style={{ color: tokens?.text.muted ?? '#94A3B8' }}>
        {message}
      </p>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
