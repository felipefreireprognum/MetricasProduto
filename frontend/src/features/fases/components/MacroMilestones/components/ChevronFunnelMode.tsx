import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MACROFASE_COLOR, MACROFASE_ORDER } from '@/theme/phaseColors';
import type { BankTokens } from '@/theme/tokens';
import type { MacrofaseRow } from '@/types/fases/macroMilestones';

import { FALLBACK_MACROFASE_ICON, MACROFASE_ICONS } from '../constants';
import { formatCount, tempoBadge } from '../helpers';
import { PosEmissaoSection } from './PosEmissaoSection';

const NOTCH = 14;
const PHASE_COLS = '1fr 200px 72px 52px 72px 96px';

function chevronClip(first: boolean, last: boolean): string {
  if (first) return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
  if (last)  return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;
  return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
}

export function ChevronFunnelMode({ funnelRows, posEmissaoRows, canceladaRow, concluidoRow, tokens: t, dimensao = 'operacoes' }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  canceladaRow:  MacrofaseRow | null;
  concluidoRow:  MacrofaseRow | null;
  tokens:        BankTokens;
  dimensao?:     'operacoes' | 'cpf';
}) {
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());
  const [showExample,  setShowExample]  = useState(false);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (!funnelRows.length) return null;

  const n        = funnelRows.length;
  const baseline = funnelRows[0].count || 1;
  const DASH     = `1px solid ${t.border.subtle}`;

  const faseColorMap     = new Map<number, string>();
  const faseMacrofaseMap = new Map<number, string>();
  for (const row of [...funnelRows, ...posEmissaoRows, ...(concluidoRow ? [concluidoRow] : []), ...(canceladaRow ? [canceladaRow] : [])]) {
    for (const phase of row.phases) {
      faseColorMap.set(phase.fase, row.color);
      faseMacrofaseMap.set(phase.fase, row.id);
    }
  }

  const openRows = funnelRows.filter(m => expanded.has(m.id) && (m.phases.length > 0 || (m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0)));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: DASH }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
            Funil de ConversÃ£o
            {dimensao === 'cpf' && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle"
                style={{ backgroundColor: '#3B82F615', color: '#3B82F6', border: '1px solid #3B82F625' }}
              >
                Por CPF
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
            {dimensao === 'cpf'
              ? 'CPFs Ãºnicos por etapa Â· clique para detalhar'
              : 'Propostas Ãºnicas por etapa Â· clique para detalhar'}
          </p>
        </div>
        <span className="text-[11px] font-medium shrink-0" style={{ color: t.text.muted }}>
          {n} etapas Â· {funnelRows.reduce((s, r) => s + r.phases.length, 0)} fases
        </span>
      </div>

      {/* Chevron row */}
      <div className="flex items-stretch px-4 pt-4">
        {funnelRows.map((m, i) => {
          const isFirst      = i === 0;
          const isLast       = i === n - 1;
          const isRegistro   = false;
          const toggleId     = isRegistro ? 'EmissÃ£o de Contrato' : m.id;
          const isOpen       = isRegistro ? expanded.has('EmissÃ£o de Contrato') : expanded.has(m.id);
          const isExpandable = isRegistro ? true : m.phases.length > 0 || (m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0);
          const pct          = (m.count / baseline) * 100;
          const Icon         = MACROFASE_ICONS[m.id] ?? FALLBACK_MACROFASE_ICON;
          const pl           = i > 0 ? NOTCH + 8 : 10;
          const pr           = !isLast ? NOTCH + 8 : 10;

          return (
            <button
              key={m.id}
              onClick={() => isExpandable && toggle(toggleId)}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6 transition-opacity min-w-0"
              style={{
                clipPath:        chevronClip(isFirst, isLast),
                backgroundColor: isOpen ? `${m.color}40` : isLast ? `${m.color}28` : `${m.color}18`,
                marginLeft:      i > 0 ? `-${NOTCH}px` : 0,
                zIndex:          n - i,
                paddingLeft:     `${pl}px`,
                paddingRight:    `${pr}px`,
                cursor:          isExpandable ? 'pointer' : 'default',
              }}
            >
              {/* Icon bubble */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: isOpen ? m.color : `${m.color}30` }}
              >
                <Icon size={15} style={{ color: isOpen ? '#FFFFFF' : m.color }} />
              </div>

              {/* Name */}
              <p
                className="text-center leading-tight font-semibold line-clamp-2"
                style={{ color: isOpen ? m.color : t.text.secondary, fontSize: '10px', maxWidth: '100%' }}
              >
                {m.label}
              </p>

              {/* Volume */}
              <p
                className="font-black tabular-nums leading-none"
                style={{ color: isOpen ? m.color : t.text.primary, fontSize: '17px' }}
              >
                {formatCount(m.count)}
              </p>

              {/* Open indicator */}
              {isOpen && (
                <ChevronDown
                  size={10}
                  style={{ color: m.color, marginTop: '2px' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Metrics row â€” step-to-step conversion, abandono, avg time */}
      <div
        className="grid pb-3 pt-2 px-4"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {funnelRows.map((m, i) => {
          const prevCount = i > 0 ? funnelRows[i - 1].count : m.count;
          const convPct   = i > 0 ? `${(m.count / prevCount * 100).toFixed(0)}%` : null;
          const badge     = tempoBadge(m.avgTempo);

          return (
            <div
              key={m.id}
              className="flex flex-col items-center gap-1 py-1"
              style={{ borderRight: i < n - 1 ? `1px dashed ${t.border.default}` : 'none' }}
            >
              {convPct ? (
                <span className="text-[10px] font-bold tabular-nums" style={{ color: m.color }}>
                  {convPct}
                </span>
              ) : (
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: t.text.muted }}>
                  {dimensao === 'cpf' ? 'base CPF' : 'base funil'}
                </span>
              )}
              {(m.reprovados ?? 0) > 0 && (
                <span className="text-[9px] tabular-nums font-bold" style={{ color: '#DC2626' }}>
                  âœ— {formatCount(m.reprovados!)} reprov.
                </span>
              )}
              {m.abandono > 0 && (
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#EF4444' }}>
                  â†© {formatCount(m.abandono)}
                </span>
              )}
              {m.emAndamento > 0 && (
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#F59E0B' }}>
                  â¸ {formatCount(m.emAndamento)}
                </span>
              )}
              <span
                className="rounded px-1.5 text-[10px] font-semibold tabular-nums"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend â€” funnel math equation */}
      <div
        className="px-4 pb-3"
        style={{ borderBottom: openRows.length > 0 ? DASH : 'none' }}
      >
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span style={{ fontSize: '9px', color: t.text.muted }}>Por etapa (aprox.):</span>
          <span className="font-black" style={{ fontSize: '9px', color: t.text.secondary }}>N chegaram</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>â‰ˆ</span>
          <span className="font-bold" style={{ fontSize: '9px', color: t.text.secondary }}>N etapa anterior</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>âˆ’</span>
          <span className="font-bold" style={{ fontSize: '9px', color: '#EF4444' }}>â†© cancelaram lÃ¡</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>âˆ’</span>
          <span className="font-bold" style={{ fontSize: '9px', color: '#F59E0B' }}>â¸ ficaram parados lÃ¡</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>Â· cada macrofase conta propostas Ãºnicas (nÃ£o soma de sub-fases)</span>
          <button
            onClick={() => setShowExample(v => !v)}
            className="ml-1 rounded px-1.5 py-0.5 font-semibold"
            style={{ fontSize: '8px', color: t.text.muted, border: `1px solid ${t.border.default}` }}
          >
            {showExample ? 'ocultar' : 'ver exemplo'}
          </button>
        </div>

        {showExample && funnelRows.length > 1 && (() => {
          const exRow     = funnelRows[0];
          const exNextRow = funnelRows[1];
          const exCalc    = exRow.count - exRow.abandono - exRow.emAndamento;
          return (
            <div
              className="flex items-center justify-center gap-1 flex-wrap mt-2 pt-2"
              style={{ borderTop: `1px solid ${t.border.subtle}` }}
            >
              <span className="font-bold" style={{ fontSize: '9px', color: exRow.color }}>
                Ex. ({exRow.label}):
              </span>
              <span className="font-black tabular-nums" style={{ fontSize: '9px', color: t.text.secondary }}>
                {exRow.count.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '9px', color: t.text.muted }}>âˆ’</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#EF4444' }}>
                â†© {exRow.abandono.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '9px', color: t.text.muted }}>âˆ’</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#F59E0B' }}>
                â¸ {exRow.emAndamento.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '9px', color: t.text.muted }}>â‰ˆ</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: exNextRow.color }}>
                {exCalc.toLocaleString('pt-BR')} chegaram ao {exNextRow.label}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Expanded phase sections â€” one per open macrofase, stacked */}
      {openRows.map((m) => (
        <div key={m.id} style={{ borderTop: `2px solid ${m.color}30` }}>

          {/* Section header */}
          <div
            className="flex flex-col gap-1 px-5 py-2.5"
            style={{ backgroundColor: `${m.color}08`, borderBottom: `1px solid ${m.color}20` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-bold" style={{ color: m.color }}>{m.label}</span>
                <span className="text-[10px]" style={{ color: t.text.muted }}>
                  {m.phases.length} fase{m.phases.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => toggle(m.id)}
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: t.text.muted }}
              >
                <ChevronUp size={13} />
                Fechar
              </button>
            </div>
            <p className="text-[10px]" style={{ color: t.text.muted }}>
              <span className="font-semibold tabular-nums" style={{ color: m.color }}>
                {m.count.toLocaleString('pt-BR')}
              </span>
              {' '}{dimensao === 'cpf' ? 'CPFs Ãºnicos' : 'propostas Ãºnicas'} neste macrofase
              {m.phases.length > 1 && m.id !== 'EmissÃ£o de Contrato' && (
                <> Â· total = operaÃ§Ãµes Ãºnicas em qualquer sub-fase <span className="font-semibold">(nÃ£o soma)</span></>
              )}
            </p>
          </div>

          {/* Phase column headers */}
          <div
            className="grid items-center gap-2 text-[9px] font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: PHASE_COLS,
              paddingLeft: '20px', paddingRight: '20px',
              paddingTop: '8px', paddingBottom: '6px',
              color: t.text.muted,
              borderBottom: DASH,
              backgroundColor: t.bg.base,
            }}
          >
            <span>Fase</span>
            <span className="pl-2">Volume relativo</span>
            <span className="text-right">Registros</span>
            <span className="text-right">% etapa</span>
            <span className="text-right">Tempo</span>
            <span className="text-right">Cancelaram aqui</span>
          </div>

          {/* Phase cards */}
          <div className="flex flex-col gap-2 p-3" style={{ backgroundColor: t.bg.base }}>
            {m.phases.map((p) => {
              const maxPhase    = Math.max(...m.phases.map((x) => x.total), 1);
              const barPct      = (p.total / maxPhase) * 100;
              const pBadge      = tempoBadge(p.tempo);
              const hasSaidas    = p.saidas.length > 0;
              const hasEntradas  = p.entradas.length > 0;
              const isReprovado  = p.fase === 101;
              const currentOrder = MACROFASE_ORDER.indexOf(m.id);

              return (
                <div
                  key={p.fase}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: isReprovado ? '#FFF5F5' : t.bg.surface,
                    border:     `1px solid ${isReprovado ? '#FECDD3' : t.border.default}`,
                    borderLeft: `3px solid ${isReprovado ? '#EF4444' : m.color}`,
                  }}
                >
                  {/* Metrics row */}
                  <div
                    className="grid items-center gap-2 px-3 py-2.5"
                    style={{
                      gridTemplateColumns: PHASE_COLS,
                      borderBottom: (hasSaidas || hasEntradas || isReprovado) ? `1px solid ${isReprovado ? '#FECDD3' : t.border.subtle}` : 'none',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-xs font-semibold" style={{ color: isReprovado ? '#DC2626' : t.text.primary }}>{p.nome}</p>
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
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: m.color, opacity: 0.55 }}
                      />
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold tabular-nums" style={{ color: t.text.primary }}>
                        {p.total.toLocaleString('pt-BR')}
                      </p>
                      {p.emAndamento > 0 && (
                        <p className="text-[9px] font-bold tabular-nums" style={{ color: '#D97706' }}>
                          â¸ {p.emAndamento.toLocaleString('pt-BR')} aguard.
                        </p>
                      )}
                    </div>

                    <p className="text-right text-[10px] tabular-nums font-medium" style={{ color: t.text.muted }}>
                      {m.count > 0 ? `${(p.total / m.count * 100).toFixed(0)}%` : 'â€”'}
                    </p>

                    <div className="flex justify-end">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                        style={{ backgroundColor: pBadge.bg, color: pBadge.text }}
                      >
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

                  {/* Nota explicativa â€” apenas fase 101 */}
                  {isReprovado && (
                    <p className="px-3 py-2 text-[10px] leading-snug" style={{ color: '#B91C1C', backgroundColor: '#FFF5F5' }}>
                      Propostas reprovadas nÃ£o avanÃ§am no funil. O encerramento de cada uma Ã© mostrado no fluxo abaixo.
                    </p>
                  )}

                  {/* Fluxo rows */}
                  {(hasSaidas || hasEntradas) && (
                    <div className="flex flex-col" style={{ backgroundColor: isReprovado ? '#FFF5F5' : t.bg.base }}>
                      {hasSaidas && (
                        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider mr-1"
                            style={{ color: isReprovado ? '#EF4444' : t.text.muted }}
                          >
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
                              const isNegative   = isCancelled || isReprovDest;
                              const isSameMacro  = !isNegative && !isConcluido && faseMacrofaseMap.get(s.para) === m.id;
                              const dc           = faseColorMap.get(s.para) ?? m.color;
                              return (
                                <span
                                  key={s.para}
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: isNegative ? '#FFF1F2' : isConcluido ? '#F0FDF4' : `${dc}12`,
                                    color:           isNegative ? '#DC2626'  : isConcluido ? '#15803D' : t.text.secondary,
                                    border:          isNegative ? '1px solid #FECDD3' : isConcluido ? '1px solid #BBF7D0' : `1px solid ${dc}30`,
                                    borderStyle:     isSameMacro ? 'dashed' : 'solid',
                                    opacity:         isSameMacro ? 0.65 : 1,
                                  }}
                                >
                                  <span style={{ color: isNegative ? '#EF4444' : isConcluido ? '#16A34A' : dc, fontWeight: 700 }}>
                                    {isReprovDest ? 'âœ—' : isConcluido ? 'âœ“' : 'â†’'}
                                  </span>
                                  {s.nome}
                                  <span className="font-bold tabular-nums ml-0.5" style={{ color: isNegative ? '#DC2626' : isConcluido ? '#15803D' : t.text.primary }}>
                                    {s.qtd.toLocaleString('pt-BR')}
                                  </span>
                                </span>
                              );
                            })}
                        </div>
                      )}
                      {hasEntradas && (
                        <div
                          className="flex flex-wrap items-center gap-1.5 px-3 py-2"
                          style={{ borderTop: hasSaidas ? `1px solid ${isReprovado ? '#FECDD3' : t.border.subtle}` : 'none' }}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: t.text.muted }}>
                            Recebeu de â†
                          </span>
                          {[...p.entradas]
                            .sort((a, b) => b.qtd - a.qtd)
                            .map((e) => {
                              const sourceMacro = faseMacrofaseMap.get(e.de) ?? '';
                              const sourceOrder = MACROFASE_ORDER.indexOf(sourceMacro);
                              const isBackward  = sourceOrder > currentOrder && sourceOrder !== -1 && currentOrder !== -1;
                              const isSameMacro = !isBackward && sourceMacro === m.id;
                              const dc          = faseColorMap.get(e.de) ?? t.text.muted;
                              return (
                                <span
                                  key={e.de}
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: isBackward ? '#FFF7ED' : `${dc}10`,
                                    color:           isBackward ? '#B45309'  : t.text.secondary,
                                    border:          isBackward ? '1px solid #FED7AA' : `1px solid ${dc}25`,
                                    borderStyle:     isSameMacro ? 'dashed' : 'solid',
                                    opacity:         isSameMacro ? 0.65 : 1,
                                  }}
                                >
                                  <span style={{ color: isBackward ? '#F59E0B' : dc, fontWeight: 700 }}>
                                    {isBackward ? 'â†©' : 'â†'}
                                  </span>
                                  {e.nome}
                                  <span className="font-bold tabular-nums ml-0.5" style={{ color: isBackward ? '#B45309' : t.text.primary }}>
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
          {false && m.id === 'EmissÃ£o de Contrato' && posEmissaoRows.length > 0 && (
            <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluidoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
          )}
        </div>
      ))}
      {(expanded.has('EmissÃ£o de Contrato') || expanded.has('Registro de Contrato')) && posEmissaoRows.length > 0 && (
        <div style={{ borderTop: `2px solid ${MACROFASE_COLOR['Registro de Contratos'] ?? '#06B6D4'}30` }}>
          <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluidoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
        </div>
      )}
    </div>
  );
}
