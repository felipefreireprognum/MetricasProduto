'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { FaseCount, TempoFase, MacrofaseTotal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Constants ─────────────────────────────────────────────────────────────────

const PIPELINE = [
  { id: 'Simulação',             color: '#94A3B8', short: 'Simulação'     },
  { id: 'Cadastro',              color: '#3B82F6', short: 'Cadastro'      },
  { id: 'Crédito',               color: '#8B5CF6', short: 'Crédito'       },
  { id: 'Negociação',            color: '#F59E0B', short: 'Negociação'    },
  { id: 'Análise de Documentos', color: '#EC4899', short: 'Anál. Docs'    },
  { id: 'Análise Técnica',       color: '#F97316', short: 'Anál. Técnica' },
  { id: 'Formalização',          color: '#10B981', short: 'Formalização'  },
  { id: 'Liberação',             color: '#06B6D4', short: 'Liberação'     },
] as const;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

function tempoBadge(dias: number | null) {
  if (dias == null) return { bg: '#F1F5F9', text: '#94A3B8', label: '—' };
  if (dias < 7)    return { bg: '#DCFCE7', text: '#16A34A', label: `${dias.toFixed(1)}d` };
  if (dias < 20)   return { bg: '#FEF9C3', text: '#CA8A04', label: `${dias.toFixed(1)}d` };
  if (dias < 40)   return { bg: '#FFEDD5', text: '#EA580C', label: `${dias.toFixed(1)}d` };
  return             { bg: '#FEE2E2', text: '#DC2626', label: `${dias.toFixed(1)}d` };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MacroPhaseBarProps {
  fases:           FaseCount[];
  tempos:          TempoFase[];
  macrofaseTotais: MacrofaseTotal[];
  tokens:          BankTokens;
  dimensao?:       'operacoes' | 'cpf';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MacroPhaseBar({ fases, tempos, macrofaseTotais, tokens: t, dimensao = 'operacoes' }: MacroPhaseBarProps) {
  const [selected, setSelected] = useState<string | null>('Simulação');

  const totalMap = (() => {
    if (macrofaseTotais.length > 0) {
      return new Map(macrofaseTotais.map(m => [m.macrofase, m.total]));
    }
    // CPF mode: macrofaseTotais is empty, sum phase totals by macrofase
    const m = new Map<string, number>();
    for (const f of fases) {
      m.set(f.macrofase, (m.get(f.macrofase) ?? 0) + f.total);
    }
    return m;
  })();
  const tempoMap   = new Map(tempos.map(tf => [tf.fase, tf.tempoMedioDias]));

  const phasesByMacro = new Map<string, FaseCount[]>();
  for (const f of fases) {
    const list = phasesByMacro.get(f.macrofase) ?? [];
    list.push(f);
    phasesByMacro.set(f.macrofase, list);
  }

  const concluido = macrofaseTotais.find(m => m.macrofase === 'Concluído');
  const cancelada = macrofaseTotais.find(m => m.macrofase === 'Cancelada');

  // Per-macrofase abandono sum, avg tempo, and direct emAndamento sum
  const abandonoByMacro    = new Map<string, number>();
  const avgTempoByMacro    = new Map<string, number | null>();
  const emAndamentoPorMacro = new Map<string, number>();
  for (const [macro, phases] of phasesByMacro.entries()) {
    abandonoByMacro.set(macro, phases.reduce((s, p) => s + (p.abandono ?? 0), 0));
    emAndamentoPorMacro.set(macro, phases.reduce((s, p) => s + (p.emAndamento ?? 0), 0));
    const withTempo = phases.filter(p => tempoMap.has(p.fase));
    avgTempoByMacro.set(
      macro,
      withTempo.length > 0
        ? withTempo.reduce((s, p) => s + tempoMap.get(p.fase)!, 0) / withTempo.length
        : null,
    );
  }

  const totalEmAndamento = [...emAndamentoPorMacro.values()].reduce((s, v) => s + v, 0);

  // Use Simulação count as baseline; fall back to first available pipeline stage
  const baseline = (() => {
    for (const p of PIPELINE) {
      const v = totalMap.get(p.id);
      if (v) return v;
    }
    return 1;
  })();

  const availableSteps = PIPELINE.filter(
    p => totalMap.has(p.id) || (phasesByMacro.get(p.id)?.length ?? 0) > 0,
  );

  // "Em fila" per macrofase = total_here - progressed_to_next - abandoned_here
  // Makes the funnel math transparent: total = progressed + abandoned + em fila
  const emFilaByMacro = new Map<string, number>();
  for (let i = 0; i < availableSteps.length; i++) {
    const step     = availableSteps[i];
    const total    = totalMap.get(step.id) ?? 0;
    const nextId   = availableSteps[i + 1]?.id;
    const nextTot  = nextId ? (totalMap.get(nextId) ?? 0) : (concluido?.total ?? 0);
    const abandono = abandonoByMacro.get(step.id) ?? 0;
    emFilaByMacro.set(step.id, Math.max(total - nextTot - abandono, 0));
  }

  const selectedColor  = PIPELINE.find(p => p.id === selected)?.color ?? '#3B82F6';
  const selectedTotal  = selected ? (totalMap.get(selected) ?? 0) : 0;
  const selectedPhases = (selected ? phasesByMacro.get(selected) ?? [] : []).slice().sort((a, b) => a.fase - b.fase);
  const maxPhaseCount  = selectedPhases.length > 0 ? Math.max(...selectedPhases.map(p => p.total)) : 1;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          Fases do processo da proposta
          {dimensao === 'cpf' && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle"
              style={{ backgroundColor: '#3B82F615', color: '#3B82F6', border: '1px solid #3B82F625' }}
            >
              Por Pessoa
            </span>
          )}
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          {dimensao === 'cpf'
            ? 'Pessoas únicas por etapa · clique para detalhar'
            : 'Operações únicas por etapa · clique para detalhar'}
        </p>
      </div>

      {/* ── Step bar ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <div className="flex items-center">
          {availableSteps.map((step, i) => {
            const isActive = selected === step.id;
            const total    = totalMap.get(step.id) ?? 0;
            const pct      = ((total / baseline) * 100).toFixed(0);
            const isLast   = i === availableSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center min-w-0" style={{ flex: isLast ? '0 0 auto' : '1 1 0' }}>
                {/* Step button */}
                <button
                  onClick={() => setSelected(isActive ? null : step.id)}
                  className="flex flex-col items-center text-center rounded-xl px-1.5 py-2.5 transition-all w-full"
                  style={{
                    backgroundColor: isActive ? `${step.color}12` : 'transparent',
                    border: `1.5px solid ${isActive ? `${step.color}45` : 'transparent'}`,
                    minWidth: '72px',
                  }}
                >
                  {/* Circle icon */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mb-1.5"
                    style={{ backgroundColor: isActive ? step.color : `${step.color}22` }}
                  >
                    {isActive ? (
                      <Play size={10} fill="white" strokeWidth={0} color="white" />
                    ) : (
                      <span className="text-[10px] font-black" style={{ color: step.color }}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <p
                    className="leading-tight font-semibold"
                    style={{
                      fontSize: '9px',
                      color: isActive ? step.color : t.text.secondary,
                      maxWidth: '72px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {step.short}
                  </p>

                  {/* Count */}
                  <p
                    className="mt-1 text-sm font-black tabular-nums leading-none"
                    style={{ color: isActive ? step.color : t.text.primary }}
                  >
                    {total > 0 ? total.toLocaleString('pt-BR') : '—'}
                  </p>

                  {/* Percentage */}
                  <p className="mt-0.5 tabular-nums" style={{ fontSize: '9px', color: t.text.muted }}>
                    {total > 0 ? (i === 0 ? '100%' : `${pct}%`) : ''}
                  </p>

                  {/* Abandono */}
                  {(abandonoByMacro.get(step.id) ?? 0) > 0 && (
                    <p className="mt-1 tabular-nums font-bold" style={{ fontSize: '9px', color: '#EF4444' }}>
                      ↩ {formatCount(abandonoByMacro.get(step.id)!)}
                    </p>
                  )}

                  {/* Em fila aqui — ops mode: derived formula; CPF mode: direct emAndamento sum */}
                  {(() => {
                    const n = dimensao === 'cpf'
                      ? (emAndamentoPorMacro.get(step.id) ?? 0)
                      : (emFilaByMacro.get(step.id) ?? 0);
                    return n > 0 ? (
                      <p className="tabular-nums font-bold" style={{ fontSize: '9px', color: '#F59E0B' }}>
                        ⏸ {formatCount(n)}
                      </p>
                    ) : null;
                  })()}

                  {/* Tempo médio */}
                  {(() => {
                    const badge = tempoBadge(avgTempoByMacro.get(step.id) ?? null);
                    return badge.label !== '—' ? (
                      <span
                        className="mt-0.5 rounded px-1 py-0.5 font-semibold tabular-nums"
                        style={{ fontSize: '8px', backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    ) : null;
                  })()}
                </button>

                {/* Connector arrow */}
                {!isLast && (
                  <div className="flex shrink-0 items-center" style={{ width: '18px', marginTop: '-12px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: t.border.default }} />
                    <div style={{
                      width: 0, height: 0,
                      borderTop:    '3px solid transparent',
                      borderBottom: '3px solid transparent',
                      borderLeft:   `4px solid ${t.border.default}`,
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Drill-down panel ───────────────────────────────────────────────── */}
      {selected && selectedPhases.length > 0 && (
        <div style={{ borderTop: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.base }}>
          {/* Panel header */}
          <div
            className="px-5 py-3"
            style={{ borderBottom: `1px solid ${t.border.subtle}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
              <p className="text-xs font-semibold" style={{ color: t.text.primary }}>
                {selected}
              </p>
              <span className="text-[10px]" style={{ color: t.text.muted }}>
                — {selectedTotal.toLocaleString('pt-BR')} {dimensao === 'cpf' ? 'pessoas chegaram aqui' : 'operações chegaram aqui'}
              </span>
            </div>

            {/* Math breakdown: total = progressed + abandoned + pending */}
            {(() => {
              const selIdx   = availableSteps.findIndex(s => s.id === selected);
              const nextId   = availableSteps[selIdx + 1]?.id;
              const nextTot  = nextId ? (totalMap.get(nextId) ?? 0) : (concluido?.total ?? 0);
              const abandono = abandonoByMacro.get(selected!) ?? 0;
              // Use direct backend count (last-phase ops) — avoids negative derived formula
              const pausados = emAndamentoPorMacro.get(selected!) ?? 0;
              if (selectedTotal === 0) return null;
              return (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: t.text.primary }}>
                    {selectedTotal.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px]" style={{ color: t.text.muted }}>=</span>

                  {nextTot > 0 && (
                    <>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
                      >
                        ↑ {nextTot.toLocaleString('pt-BR')} avançaram
                      </span>
                      {(abandono > 0 || pausados > 0) && (
                        <span className="text-[10px]" style={{ color: t.text.muted }}>+</span>
                      )}
                    </>
                  )}

                  {abandono > 0 && (
                    <>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                      >
                        ↩ {abandono.toLocaleString('pt-BR')} cancelaram
                      </span>
                      {pausados > 0 && (
                        <span className="text-[10px]" style={{ color: t.text.muted }}>+</span>
                      )}
                    </>
                  )}

                  {pausados > 0 && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                      style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
                    >
                      ⏸ {pausados.toLocaleString('pt-BR')} em andamento
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Phase cards */}
          <div
            className="grid gap-2 p-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {selectedPhases.map(p => {
              const barPct = (p.total / maxPhaseCount) * 100;
              const badge  = tempoBadge(tempoMap.get(p.fase) ?? null);
              return (
                <div
                  key={p.fase}
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: t.bg.surface,
                    border:     `1px solid ${t.border.default}`,
                    borderLeft: `3px solid ${selectedColor}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p
                        className="text-xs font-semibold leading-tight truncate"
                        style={{ color: t.text.primary }}
                      >
                        {p.nome}
                      </p>
                      <p className="text-[10px] tabular-nums mt-0.5" style={{ color: t.text.muted }}>
                        Fase {p.fase}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <p
                        className="text-sm font-black tabular-nums leading-tight"
                        style={{ color: t.text.primary }}
                      >
                        {p.total.toLocaleString('pt-BR')}
                      </p>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: t.border.default }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width:           `${Math.max(barPct, 2)}%`,
                        backgroundColor: selectedColor,
                        opacity:         0.5,
                      }}
                    />
                  </div>

                  {(p.abandono ?? 0) > 0 && (
                    <p className="mt-1.5 text-[9px] font-semibold" style={{ color: '#DC2626' }}>
                      ↩ {p.abandono!.toLocaleString('pt-BR')} cancelaram nesta fase
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Saídas — always at the very bottom ─────────────────────────────── */}
      {(concluido || cancelada || totalEmAndamento > 0) && (
        <div
          className="flex items-center gap-3 px-5 pb-4"
          style={{ borderTop: `1px solid ${t.border.subtle}`, paddingTop: '12px' }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{ color: t.text.muted }}
          >
            Saídas
          </p>
          {concluido && (
            <div
              className="flex items-center gap-2.5 rounded-lg px-4 py-2"
              style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', flex: 1 }}
            >
              <div className="h-5 w-1 rounded-full bg-green-500 shrink-0" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-green-700">Concluído</p>
                <p className="text-base font-black tabular-nums text-green-900 leading-tight">
                  {concluido.total.toLocaleString('pt-BR')}
                </p>
                <p className="text-[9px] text-green-600">
                  {((concluido.total / baseline) * 100).toFixed(1)}% conv.
                </p>
              </div>
            </div>
          )}
          {cancelada && (
            <div
              className="flex items-center gap-2.5 rounded-lg px-4 py-2"
              style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', flex: 1 }}
            >
              <div className="h-5 w-1 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-700">Cancelada</p>
                <p className="text-base font-black tabular-nums text-red-900 leading-tight">
                  {cancelada.total.toLocaleString('pt-BR')}
                </p>
                <p className="text-[9px] text-red-600">
                  {((cancelada.total / baseline) * 100).toFixed(1)}% perda
                </p>
              </div>
            </div>
          )}
          {totalEmAndamento > 0 && (
            <div
              className="flex items-center gap-2.5 rounded-lg px-4 py-2"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', flex: 1 }}
            >
              <div className="h-5 w-1 rounded-full shrink-0" style={{ backgroundColor: '#F59E0B' }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#92400E' }}>Em Andamento</p>
                <p className="text-base font-black tabular-nums leading-tight" style={{ color: '#78350F' }}>
                  {totalEmAndamento.toLocaleString('pt-BR')}
                </p>
                <p className="text-[9px]" style={{ color: '#B45309' }}>
                  {((totalEmAndamento / baseline) * 100).toFixed(1)}% do funil
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
