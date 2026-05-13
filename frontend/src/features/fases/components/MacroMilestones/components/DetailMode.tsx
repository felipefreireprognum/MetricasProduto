import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BankTokens } from '@/theme/tokens';
import type { MacrofaseRow } from '@/types/fases/macroMilestones';

import { tempoBadge } from '../helpers';

export function DetailMode({ funnelRows, concluidoRow, canceladaRow, tokens: t }: {
  funnelRows:   MacrofaseRow[];
  concluidoRow: MacrofaseRow | null;
  canceladaRow: MacrofaseRow | null;
  tokens:       BankTokens;
}) {
  const allRows = [
    ...funnelRows,
    ...(concluidoRow  ? [concluidoRow]  : []),
    ...(canceladaRow  ? [canceladaRow]  : []),
  ];

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(allRows.map((r) => r.id))
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const baseline  = funnelRows[0]?.count || 1;
  const maxPhase  = Math.max(...allRows.flatMap((r) => r.phases.map((p) => p.total)), 1);
  const DASH      = `1px dashed ${t.border.default}`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="px-5 py-4" style={{ borderBottom: DASH }}>
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Fases por macrofase</h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          {allRows.length} macrofases Â· {allRows.reduce((s, r) => s + r.phases.length, 0)} fases individuais Â· clique para expandir
        </p>
      </div>

      {allRows.map((m) => {
        const isOpen = open.has(m.id);
        const badge  = tempoBadge(m.avgTempo);
        const pct    = ((m.count / baseline) * 100).toFixed(1);

        return (
          <div key={m.id} style={{ borderBottom: DASH }}>
            <button
              onClick={() => toggle(m.id)}
              className="flex w-full items-center gap-3 px-5 py-3 transition-colors text-left"
              style={{ backgroundColor: isOpen ? `${m.color}08` : 'transparent' }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="flex-1 text-sm font-semibold" style={{ color: t.text.primary }}>{m.label}</span>
              <span className="text-xs tabular-nums font-semibold" style={{ color: t.text.secondary }}>
                {m.count.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] tabular-nums w-10 text-right" style={{ color: t.text.muted }}>
                {pct}%
              </span>
              <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums w-14 text-center"
                    style={{ backgroundColor: badge.bg, color: badge.text }}>
                {badge.label}
              </span>
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform"
                style={{ color: t.text.muted, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {isOpen && (
              <div className="pb-2" style={{ backgroundColor: t.bg.base }}>
                <div className="grid items-center gap-3 px-6 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                     style={{ gridTemplateColumns: '1fr 160px 60px 64px', color: t.text.muted, borderBottom: DASH }}>
                  <span>Fase</span>
                  <span>Volume</span>
                  <span className="text-right">Qtd.</span>
                  <span className="text-right">Tempo</span>
                </div>

                {m.phases.map((p, pi) => {
                  const barPct  = (p.total / maxPhase) * 100;
                  const pBadge  = tempoBadge(p.tempo);
                  const isLast  = pi === m.phases.length - 1;
                  return (
                    <div
                      key={p.fase}
                      className="grid items-center gap-3 px-6 py-2"
                      style={{
                        gridTemplateColumns: '1fr 160px 60px 64px',
                        borderBottom: isLast ? 'none' : `1px solid ${t.border.subtle}`,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium" style={{ color: t.text.primary }}>{p.nome}</p>
                        <p className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
                        <div className="h-full rounded-full"
                             style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: m.color, opacity: 0.55 }} />
                      </div>
                      <p className="text-right text-xs font-semibold tabular-nums" style={{ color: t.text.primary }}>
                        {p.total.toLocaleString('pt-BR')}
                      </p>
                      <div className="flex justify-end">
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                              style={{ backgroundColor: pBadge.bg, color: pBadge.text }}>
                          {pBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {m.phases.length === 0 && (
                  <p className="px-6 py-3 text-xs" style={{ color: t.text.muted }}>Sem fases</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
