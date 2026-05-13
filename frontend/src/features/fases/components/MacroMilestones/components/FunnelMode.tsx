import type { BankTokens } from '@/theme/tokens';
import type { MacrofaseRow } from '@/types/fases/macroMilestones';

import { tempoBadge } from '../helpers';
import { PosEmissaoSection } from './PosEmissaoSection';

export function FunnelMode({ funnelRows, posEmissaoRows, concluidoRow, canceladaRow, tokens: t }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  concluidoRow:  MacrofaseRow | null;
  canceladaRow:  MacrofaseRow | null;
  tokens:        BankTokens;
}) {
  if (!funnelRows.length && !concluidoRow && !canceladaRow) return null;

  const baseline = funnelRows[0]?.count || 1;

  return (
    <div
      className="flex h-full flex-col rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Funil por macrofase</h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          Volume e tempo mÃ©dio por etapa do processo
        </p>
      </div>

      {/* Macrofase groups */}
      <div className="flex flex-col gap-2">
        {funnelRows.map((m, i) => {
          const pct   = (m.count / baseline) * 100;
          const badge = tempoBadge(m.avgTempo);
          return (
            <div
              key={m.id}
              className="rounded-lg overflow-hidden"
              style={{ border: `1px solid ${t.border.subtle}`, borderLeft: `3px solid ${m.color}` }}
            >
              {/* Macrofase header */}
              <div
                className="grid items-center gap-2 px-3 py-2"
                style={{ gridTemplateColumns: '152px 1fr 80px 52px 60px', backgroundColor: t.bg.base }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{m.label}</p>
                    {(m.reprovados ?? 0) > 0 && (
                      <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold whitespace-nowrap"
                            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                        âœ— {(m.reprovados ?? 0).toLocaleString('pt-BR')} reprov.
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full pl-2" style={{ backgroundColor: t.border.default }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: m.color, opacity: 0.65 }} />
                </div>
                <p className="text-right text-sm font-black tabular-nums" style={{ color: t.text.primary }}>
                  {m.count.toLocaleString('pt-BR')}
                </p>
                <p className="text-right text-xs font-semibold tabular-nums" style={{ color: t.text.muted }}>
                  {i === 0 ? '100%' : `${pct.toFixed(1)}%`}
                </p>
                <div className="flex justify-end">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                        style={{ backgroundColor: badge.bg, color: badge.text }}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Phase sub-rows */}
              {m.phases.map((p) => {
                const pBadge      = tempoBadge(p.tempo);
                const isReprovado = p.fase === 101;
                return (
                  <div
                    key={p.fase}
                    className="flex items-center gap-3 px-3 py-1.5"
                    style={{
                      borderTop: `1px solid ${isReprovado ? '#FECDD3' : t.border.subtle}`,
                      backgroundColor: isReprovado ? '#FFF5F5' : t.bg.surface,
                      borderLeft: isReprovado ? '3px solid #EF4444' : undefined,
                    }}
                  >
                    {/* indent spacer */}
                    <div className="w-5 shrink-0" />
                    {/* name + fase code */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-[10px] font-medium leading-tight"
                           style={{ color: isReprovado ? '#DC2626' : t.text.secondary }}>
                          {p.nome}
                        </p>
                        {isReprovado && (
                          <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold whitespace-nowrap"
                                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            âœ— Fim de linha
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                    </div>
                    {/* count */}
                    <p className="text-[11px] font-semibold tabular-nums shrink-0"
                       style={{ color: isReprovado ? '#DC2626' : t.text.secondary }}>
                      {p.total.toLocaleString('pt-BR')}
                    </p>
                    {/* tempo */}
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                      style={{ backgroundColor: pBadge.bg, color: pBadge.text }}
                    >
                      {pBadge.label}
                    </span>
                    {/* abandono */}
                    {p.abandono > 0 ? (
                      <p className="shrink-0 text-[10px] font-bold tabular-nums" style={{ color: '#EF4444' }}>
                        â†© {p.abandono.toLocaleString('pt-BR')}
                      </p>
                    ) : (
                      <p className="shrink-0 text-[10px]" style={{ color: t.border.default }}>â€”</p>
                    )}
                  </div>
                );
              })}
              {m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0 && (
                <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluidoRow} />
              )}
            </div>
          );
        })}
      </div>

      {/* SaÃ­das â€” always at the very bottom */}
      {(concluidoRow || canceladaRow) && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border.subtle}` }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
            SaÃ­das
          </p>
          <div className="flex gap-3">
            {concluidoRow && (
              <div
                className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <div className="h-8 w-1 rounded-full bg-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">ConcluÃ­do</p>
                  <p className="text-xl font-black tabular-nums text-green-900">{concluidoRow.count.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-green-600">{((concluidoRow.count / baseline) * 100).toFixed(1)}% conv.</p>
                </div>
              </div>
            )}
            {canceladaRow && (
              <div
                className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}
              >
                <div className="h-8 w-1 rounded-full bg-red-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Cancelada</p>
                  <p className="text-xl font-black tabular-nums text-red-900">{canceladaRow.count.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-red-600">{((canceladaRow.count / baseline) * 100).toFixed(1)}% perda</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
