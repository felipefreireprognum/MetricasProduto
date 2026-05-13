import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MACROFASE_ORDER } from '@/theme/phaseColors';
import type { BankTokens } from '@/theme/tokens';
import type { MacrofaseRow } from '@/types/fases/macroMilestones';

import { tempoBadge } from '../helpers';
import { PosEmissaoSection } from './PosEmissaoSection';

const PHASE_COLS = '1fr 200px 72px 52px 72px 96px';

export function ExpandFunnelMode({ funnelRows, posEmissaoRows, concluidoRow, canceladaRow, tokens: t }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  concluidoRow:  MacrofaseRow | null;
  canceladaRow:  MacrofaseRow | null;
  tokens:        BankTokens;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (!funnelRows.length && !concluidoRow && !canceladaRow) return null;

  const baseline = funnelRows[0]?.count || 1;
  const DASH     = `1px solid ${t.border.subtle}`;

  const faseColorMap     = new Map<number, string>();
  const faseMacrofaseMap = new Map<number, string>();
  for (const row of [...funnelRows, ...(concluidoRow ? [concluidoRow] : []), ...(canceladaRow ? [canceladaRow] : [])]) {
    for (const phase of row.phases) {
      faseColorMap.set(phase.fase, row.color);
      faseMacrofaseMap.set(phase.fase, row.id);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: DASH }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Funil de ConversÃ£o</h3>
          <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
            Clique em uma etapa para ver as fases individuais com fluxo e abandono
          </p>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider shrink-0" style={{ color: t.text.muted }}>
          <span>Volume</span>
          <span>Tempo</span>
          <span>Abandono</span>
          <span className="w-5" />
        </div>
      </div>

      {funnelRows.map((m, i) => {
        const pct          = (m.count / baseline) * 100;
        const badge        = tempoBadge(m.avgTempo);
        const isExpandable = m.phases.length > 0 || (m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0);
        const isOpen       = expanded.has(m.id) && isExpandable;

        return (
          <div key={m.id} style={{ borderBottom: DASH }}>
            <button
              onClick={() => isExpandable && toggle(m.id)}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
              style={{
                backgroundColor: isOpen ? `${m.color}0C` : t.bg.surface,
                borderLeft: `3px solid ${m.color}`,
                cursor: isExpandable ? 'pointer' : 'default',
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: m.color }}
              >
                {i + 1}
              </span>
              <p className="flex-1 truncate text-[13px] font-bold min-w-0" style={{ color: t.text.primary }}>
                {m.label}
              </p>
              <div className="shrink-0 text-right" style={{ minWidth: '80px' }}>
                <p className="text-sm font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>
                  {m.count.toLocaleString('pt-BR')}
                </p>
                <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>
                  {i === 0 ? '100% do funil' : `${pct.toFixed(1)}% do funil`}
                </p>
              </div>
              <div className="shrink-0 flex justify-end" style={{ minWidth: '56px' }}>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                      style={{ backgroundColor: badge.bg, color: badge.text }}>
                  {badge.label}
                </span>
              </div>
              <div className="shrink-0 flex flex-col items-end" style={{ minWidth: '84px' }}>
                {m.abandono > 0 ? (
                  <>
                    <span className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: '#DC2626' }}>
                      â†© {m.abandono.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#EF4444', opacity: 0.8 }}>
                      {baseline > 0 ? `${(m.abandono / baseline * 100).toFixed(1)}% do total` : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px]" style={{ color: t.text.muted }}>â€”</span>
                )}
              </div>
              {isExpandable && (
                <ChevronDown
                  size={14}
                  className="shrink-0 transition-transform"
                  style={{ color: t.text.muted, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              )}
            </button>

            {isOpen && (
              <div style={{ backgroundColor: t.bg.base }}>
                <div
                  className="grid items-center gap-2 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    gridTemplateColumns: PHASE_COLS,
                    paddingLeft: '52px', paddingRight: '20px',
                    paddingTop: '8px', paddingBottom: '6px',
                    color: t.text.muted,
                    borderBottom: DASH,
                  }}
                >
                  <span>Fase</span>
                  <span className="pl-2">Volume relativo</span>
                  <span className="text-right">Registros</span>
                  <span className="text-right">% etapa</span>
                  <span className="text-right">Tempo</span>
                  <span className="text-right">Cancelaram aqui</span>
                </div>

                <div className="flex flex-col gap-2 p-3">
                  {m.phases.map((p) => {
                    const maxPhase  = Math.max(...m.phases.map((x) => x.total), 1);
                    const barPct    = (p.total / maxPhase) * 100;
                    const pBadge    = tempoBadge(p.tempo);
                    const hasSaidas   = p.saidas.length > 0;
                    const hasEntradas = p.entradas.length > 0;
                    const currentOrder = MACROFASE_ORDER.indexOf(m.id);

                    return (
                      <div
                        key={p.fase}
                        className="rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: t.bg.surface,
                          border:     `1px solid ${t.border.default}`,
                          borderLeft: `3px solid ${m.color}`,
                        }}
                      >
                        <div
                          className="grid items-center gap-2 px-3 py-2.5"
                          style={{
                            gridTemplateColumns: PHASE_COLS,
                            borderBottom: (hasSaidas || hasEntradas) ? `1px solid ${t.border.subtle}` : 'none',
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{p.nome}</p>
                              {p.fase === 600 && (
                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap"
                                      style={{ backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                                  Fim do Funil
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full pl-2" style={{ backgroundColor: t.border.default }}>
                            <div className="h-full rounded-full"
                                 style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: m.color, opacity: 0.55 }} />
                          </div>
                          <p className="text-right text-xs font-bold tabular-nums" style={{ color: t.text.primary }}>
                            {p.total.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-right text-[10px] tabular-nums font-medium" style={{ color: t.text.muted }}>
                            {m.count > 0 ? `${(p.total / m.count * 100).toFixed(0)}%` : 'â€”'}
                          </p>
                          <div className="flex justify-end">
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                                  style={{ backgroundColor: pBadge.bg, color: pBadge.text }}>
                              {pBadge.label}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            {p.abandono > 0 ? (
                              <div className="text-right">
                                <p className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: '#DC2626' }}>
                                  {p.abandono.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-[9px] font-semibold tabular-nums" style={{ color: '#EF4444', opacity: 0.8 }}>
                                  {baseline > 0 ? `${(p.abandono / baseline * 100).toFixed(1)}% do total` : ''}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px]" style={{ color: t.text.muted }}>â€”</span>
                            )}
                          </div>
                        </div>

                        {(hasSaidas || hasEntradas) && (
                          <div className="flex flex-col gap-0" style={{ backgroundColor: t.bg.base }}>
                            {hasSaidas && (
                              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: t.text.muted }}>
                                  Saiu para â†’
                                </span>
                                {[...p.saidas]
                                  .sort((a, b) => {
                                    const ai = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(a.para) ?? '');
                                    const bi = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(b.para) ?? '');
                                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                                  })
                                  .map((s) => {
                                    const isCancelled  = faseMacrofaseMap.get(s.para) === 'Cancelada';
                                    const isReprovDest = s.para === 101;
                                    const isConcluido  = faseMacrofaseMap.get(s.para) === 'ConcluÃ­do' || s.para === 800;
                                    const isNeg        = isCancelled || isReprovDest;
                                    const dc           = faseColorMap.get(s.para) ?? m.color;
                                    return (
                                      <span key={s.para}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                            style={{
                                              backgroundColor: isConcluido ? '#F0FDF4' : isNeg ? '#FFF1F2' : `${dc}12`,
                                              color:           isConcluido ? '#16A34A'  : isNeg ? '#DC2626'  : t.text.secondary,
                                              border:          isConcluido ? '1px solid #BBF7D0' : isNeg ? '1px solid #FECDD3' : `1px solid ${dc}30`,
                                            }}>
                                        <span style={{ color: isConcluido ? '#16A34A' : isNeg ? '#EF4444' : dc, fontWeight: 700 }}>
                                          {isReprovDest ? 'âœ—' : isConcluido ? 'âœ“' : 'â†’'}
                                        </span>
                                        {s.nome}
                                        <span className="font-bold tabular-nums ml-0.5" style={{ color: isNeg ? '#DC2626' : t.text.primary }}>
                                          {s.qtd.toLocaleString('pt-BR')}
                                        </span>
                                      </span>
                                    );
                                  })}
                              </div>
                            )}
                            {hasEntradas && (
                              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2"
                                   style={{ borderTop: hasSaidas ? `1px solid ${t.border.subtle}` : 'none' }}>
                                <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: t.text.muted }}>
                                  Recebeu de â†
                                </span>
                                {[...p.entradas]
                                  .sort((a, b) => b.qtd - a.qtd)
                                  .map((e) => {
                                    const sourceMacro  = faseMacrofaseMap.get(e.de) ?? '';
                                    const sourceOrder  = MACROFASE_ORDER.indexOf(sourceMacro);
                                    const isBackward   = sourceOrder > currentOrder && sourceOrder !== -1 && currentOrder !== -1;
                                    const dc           = faseColorMap.get(e.de) ?? t.text.muted;
                                    return (
                                      <span key={e.de}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                            style={{
                                              backgroundColor: isBackward ? '#FFF7ED' : `${dc}10`,
                                              color:           isBackward ? '#B45309'  : t.text.secondary,
                                              border:          isBackward ? '1px solid #FED7AA' : `1px solid ${dc}25`,
                                            }}>
                                        <span style={{ color: isBackward ? '#F59E0B' : dc, fontWeight: 700 }}>
                                          {isBackward ? 'â†©' : 'â†'}
                                        </span>
                                        {e.nome}
                                        <span className="font-bold tabular-nums ml-0.5"
                                              style={{ color: isBackward ? '#B45309' : t.text.primary }}>
                                          {e.qtd.toLocaleString('pt-BR')}
                                        </span>
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
                {m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0 && (
                  <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluidoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
                )}
              </div>
            )}
          </div>
        );
      })}

      {(concluidoRow || canceladaRow) && (
        <div className="px-5 py-4" style={{ borderTop: DASH }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
            SaÃ­das do funil
          </p>
          <div className="flex gap-3">
            {concluidoRow && (
              <div className="flex flex-1 items-center gap-4 rounded-xl px-5 py-4"
                   style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div className="h-10 w-1 rounded-full bg-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">ConcluÃ­do</p>
                  <p className="text-2xl font-black tabular-nums text-green-900 leading-tight">
                    {concluidoRow.count.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-green-600 mt-0.5">
                    {((concluidoRow.count / baseline) * 100).toFixed(1)}% de conversÃ£o do funil
                  </p>
                </div>
              </div>
            )}
            {canceladaRow && (
              <div className="flex flex-1 items-center gap-4 rounded-xl px-5 py-4"
                   style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}>
                <div className="h-10 w-1 rounded-full bg-red-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Cancelada</p>
                  <p className="text-2xl font-black tabular-nums text-red-900 leading-tight">
                    {canceladaRow.count.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-red-600 mt-0.5">
                    {((canceladaRow.count / baseline) * 100).toFixed(1)}% de perda do funil
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
