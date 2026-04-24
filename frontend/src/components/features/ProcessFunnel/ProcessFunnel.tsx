'use client';

import { ArrowRight } from 'lucide-react';
import type { DashboardData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

interface Props {
  data: DashboardData;
  tokens: BankTokens;
}

export function ProcessFunnel({ data, tokens: t }: Props) {
  const sorted = [...data.operacoesPorFase]
    .sort((a, b) => a.fase - b.fase)
    .filter((p) => p.fase !== 1200); // exclude cancelled — terminal state, not a funnel step

  if (!sorted.length) return null;

  const baseline = sorted[0].total || 1;

  const stages = sorted.map((p, i) => {
    const prev      = sorted[i - 1];
    const pct       = (p.total / baseline) * 100;
    const drop      = prev ? p.total - prev.total : 0;
    const dropPct   = prev && prev.total > 0
      ? Math.abs((drop / prev.total) * 100)
      : 0;
    return { num: i + 1, label: p.nome, value: p.total, pct, drop, dropPct };
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <h3 className="mb-4 text-sm font-semibold" style={{ color: t.text.primary }}>
        Funil do processo{' '}
        <span className="font-normal" style={{ color: t.text.muted }}>(média do período)</span>
      </h3>

      {/* Dynamic grid — one column per phase */}
      <div
        className="gap-2"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((s, idx) => (
          <div key={s.label} className="flex flex-col">
            {/* Label */}
            <div className="truncate text-[10px] font-medium leading-tight" style={{ color: t.text.muted }}>
              {s.num}. {s.label}
            </div>

            {/* Count */}
            <div className="mt-1 text-base font-bold tabular-nums leading-none" style={{ color: t.text.primary }}>
              {s.value.toLocaleString('pt-BR')}
            </div>

            {/* Vertical bar */}
            <div className="mt-2 flex h-24 items-end">
              <div
                className="relative flex w-full items-start justify-center rounded-t-md pt-1 text-[9px] font-semibold text-white"
                style={{
                  height: `${Math.max(s.pct, 10)}%`,
                  backgroundColor: t.accent.primary,
                  opacity: 0.35 + (s.pct / 100) * 0.65,
                }}
              >
                {idx > 0 && s.pct >= 16 && `${s.pct.toFixed(0)}%`}
              </div>
            </div>

            {/* Dropoff */}
            {s.drop < 0 && (
              <div className="mt-1.5 text-center text-[9px] tabular-nums leading-tight">
                <div className="font-semibold" style={{ color: '#EF4444' }}>
                  {s.drop.toLocaleString('pt-BR')}
                </div>
                <div style={{ color: t.text.muted }}>{s.dropPct.toFixed(1)}%</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="mt-4 flex w-full items-center justify-center gap-1.5 pt-3 text-xs font-medium transition-colors hover:underline"
        style={{ borderTop: `1px solid ${t.border.default}`, color: t.accent.primary }}
      >
        Ver funil completo
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
