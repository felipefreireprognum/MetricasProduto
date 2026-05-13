import { MACROFASE_ORDER } from '@/theme/phaseColors';
import type { BankTokens } from '@/theme/tokens';
import type { MacrofaseRow } from '@/types/fases/macroMilestones';

import { formatCount, tempoBadge } from '../helpers';

export function PosEmissaoSection({ rows, baseline, tokens: t, concluido, faseColorMap, faseMacrofaseMap }: {
  rows:             MacrofaseRow[];
  baseline:         number;
  tokens:           BankTokens;
  concluido?:       MacrofaseRow | null;
  faseColorMap?:    Map<number, string>;
  faseMacrofaseMap?: Map<number, string>;
}) {
  const hasPhases = rows.some((m) => m.phases.length > 0);
  if (!rows.length || !hasPhases) return null;

  const maxCount = Math.max(...rows.flatMap((m) => m.phases.map((p) => p.total)), 1);
  const multiGroup = rows.filter((m) => m.phases.length > 0).length > 1;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.muted }}>
          PÃ³s
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((m) => {
          if (m.phases.length === 0) return null;
          return (
            <div key={m.id}>
              {multiGroup && (
                <div className="flex items-center gap-1.5 mb-1 px-1 pt-1">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
                    {m.label}
                  </span>
                </div>
              )}
              {m.phases.map((p) => {
                const barPct = (p.total / maxCount) * 100;
                const badge  = tempoBadge(p.tempo);
                return (
                  <div key={p.fase} className="mb-1">
                    <div
                      className="flex items-center gap-2 rounded px-3 py-1.5"
                      style={{ backgroundColor: `${m.color}08`, borderLeft: `2px solid ${m.color}50` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[10px] font-medium leading-tight" style={{ color: t.text.primary }}>{p.nome}</p>
                        <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                      </div>
                      <div className="w-16 h-1 overflow-hidden rounded-full shrink-0" style={{ backgroundColor: t.border.default }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: m.color, opacity: 0.5 }} />
                      </div>
                      <p className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: t.text.secondary }}>
                        {p.total.toLocaleString('pt-BR')}
                      </p>
                      {baseline > 0 && (
                        <p className="text-[9px] tabular-nums shrink-0" style={{ color: t.text.muted }}>
                          {((p.total / baseline) * 100).toFixed(1)}%
                        </p>
                      )}
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                            style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                      {p.abandono > 0 && (
                        <p className="shrink-0 text-[9px] font-bold tabular-nums" style={{ color: '#EF4444' }}>
                          â†© {formatCount(p.abandono)}
                        </p>
                      )}
                    </div>
                    {(p.saidas.length > 0 || p.entradas.length > 0) && (
                      <div className="flex flex-col" style={{ backgroundColor: `${m.color}05`, borderLeft: `2px solid ${m.color}20` }}>
                        {p.saidas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-wider shrink-0 mr-1" style={{ color: t.text.muted }}>
                              Saiu para â†’
                            </span>
                            {[...p.saidas].sort((a, b) => b.qtd - a.qtd).map((s) => {
                              const isReprov    = s.para === 101;
                              const isCanceled  = s.para >= 900;
                              const isConcluido = s.para === 800;
                              const isNeg       = isReprov || isCanceled;
                              const dc          = faseColorMap?.get(s.para) ?? m.color;
                              const isSameMacro = !isNeg && !isConcluido && faseMacrofaseMap?.get(s.para) === m.id;
                              return (
                                <span
                                  key={s.para}
                                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums"
                                  style={{
                                    backgroundColor: isConcluido ? '#F0FDF4' : isNeg ? '#FFF1F2' : `${dc}12`,
                                    color:           isConcluido ? '#16A34A'  : isNeg ? '#DC2626'  : t.text.secondary,
                                    border:          isConcluido ? '1px solid #BBF7D0' : isNeg ? '1px solid #FECDD3' : `1px solid ${dc}30`,
                                    borderStyle:     isSameMacro ? 'dashed' : 'solid',
                                    opacity:         isSameMacro ? 0.65 : 1,
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: isConcluido ? '#16A34A' : isNeg ? '#EF4444' : dc }}>
                                    {isReprov ? 'âœ—' : isConcluido ? 'âœ“' : 'â†’'}
                                  </span>
                                  {s.nome ?? `Fase ${s.para}`}
                                  <span className="font-bold ml-0.5">{formatCount(s.qtd)}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {p.entradas.length > 0 && (
                          <div
                            className="flex flex-wrap items-center gap-1 px-3 py-1.5"
                            style={{ borderTop: p.saidas.length > 0 ? `1px solid ${m.color}15` : 'none' }}
                          >
                            <span className="text-[8px] font-bold uppercase tracking-wider shrink-0 mr-1" style={{ color: t.text.muted }}>
                              Recebeu de â†
                            </span>
                            {[...p.entradas].sort((a, b) => b.qtd - a.qtd).map((e) => {
                              const sourceMacro = faseMacrofaseMap?.get(e.de) ?? '';
                              const currentMacroOrder = MACROFASE_ORDER.indexOf(m.id);
                              const sourceOrder = MACROFASE_ORDER.indexOf(sourceMacro);
                              const isBackward  = sourceOrder > currentMacroOrder && sourceOrder !== -1 && currentMacroOrder !== -1;
                              const isSameMacro = !isBackward && sourceMacro === m.id;
                              const dc          = faseColorMap?.get(e.de) ?? t.text.muted;
                              return (
                                <span
                                  key={e.de}
                                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums"
                                  style={{
                                    backgroundColor: isBackward ? '#FFF7ED' : `${dc}10`,
                                    color:           isBackward ? '#B45309'  : t.text.secondary,
                                    border:          isBackward ? '1px solid #FED7AA' : `1px solid ${dc}25`,
                                    borderStyle:     isSameMacro ? 'dashed' : 'solid',
                                    opacity:         isSameMacro ? 0.65 : 1,
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: isBackward ? '#F59E0B' : dc }}>
                                    {isBackward ? 'â†©' : 'â†'}
                                  </span>
                                  {e.nome}
                                  <span className="font-bold ml-0.5">{formatCount(e.qtd)}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {concluido && (
          <div
            className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2"
            style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <div className="h-6 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: '#16A34A' }} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#15803D' }}>
                ConcluÃ­do Â· fase 800
              </p>
              <p className="text-sm font-black tabular-nums leading-tight" style={{ color: '#14532D' }}>
                {concluido.count.toLocaleString('pt-BR')}
              </p>
              <p className="text-[9px]" style={{ color: '#16A34A' }}>
                {((concluido.count / baseline) * 100).toFixed(1)}% conversÃ£o total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}