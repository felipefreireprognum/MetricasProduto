import type { BankTokens } from '@/theme/tokens';
import type { HoverState } from '@/types/fases/macroMilestones';

import { tempoBadge } from '../helpers';

export function HoverCard({ hover, tokens: t }: { hover: HoverState; tokens: BankTokens }) {
  const { row: m, x, y } = hover;
  const maxTotal = Math.max(...m.phases.map((p) => p.total), 1);
  const cardW    = 280;
  const cardH    = 48 + m.phases.length * 36 + 16;
  const left     = Math.min(x + 16, window.innerWidth  - cardW - 12);
  const top      = Math.min(y + 12, window.innerHeight - cardH - 12);

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-xl shadow-xl"
      style={{ left, top, width: cardW, backgroundColor: '#FFFFFF', border: `1px solid ${t.border.default}` }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${t.border.default}` }}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
        <p className="text-xs font-semibold" style={{ color: t.text.primary }}>{m.label}</p>
        <span className="ml-auto text-[10px] font-medium tabular-nums" style={{ color: t.text.muted }}>
          {m.count.toLocaleString('pt-BR')} registros
        </span>
      </div>
      <div className="flex flex-col px-4 py-2">
        {m.phases.map((p) => {
          const barPct = (p.total / maxTotal) * 100;
          const badge  = tempoBadge(p.tempo);
          return (
            <div key={p.fase} className="flex flex-col gap-1 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-medium" style={{ color: t.text.primary }}>{p.nome}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] tabular-nums font-semibold" style={{ color: t.text.secondary }}>
                    {p.total.toLocaleString('pt-BR')}
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                        style={{ backgroundColor: badge.bg, color: badge.text }}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: t.bg.elevated }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: m.color, opacity: 0.5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
