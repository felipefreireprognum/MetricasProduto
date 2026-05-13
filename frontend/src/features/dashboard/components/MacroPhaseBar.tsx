'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import type { FaseCount, TempoFase, MacrofaseTotal, FaseTransicao } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Constants ─────────────────────────────────────────────────────────────────

const PIPELINE = [
  { id: 'Simulação',             color: '#94A3B8', short: 'Simulação'     },
  { id: 'Cadastro',              color: '#3B82F6', short: 'Cadastro'      },
  { id: 'Crédito',               color: '#8B5CF6', short: 'Crédito'       },
  { id: 'Negociação',            color: '#F59E0B', short: 'Negociação'    },
  { id: 'Análise de Documentos', color: '#EC4899', short: 'Anál. Docs'    },
  { id: 'Análise Técnica',       color: '#F97316', short: 'Anál. Técnica' },
  { id: 'Emissão de Contrato',   color: '#059669', short: 'Emissão Contr.' },
  { id: 'Registro de Contrato',  color: '#34D399', short: 'Reg. Contrato' },
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
  fases:            FaseCount[];
  tempos:           TempoFase[];
  macrofaseTotais:  MacrofaseTotal[];
  transicoes?:      FaseTransicao[];
  tokens:           BankTokens;
  dimensao?:        'operacoes' | 'cpf';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MacroPhaseBar({ fases, tempos, macrofaseTotais, transicoes = [], tokens: t, dimensao = 'operacoes' }: MacroPhaseBarProps) {
  const [selected,     setSelected]     = useState<string | null>('Simulação');
  const [showExample,  setShowExample]  = useState(false);

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

  const concluido    = macrofaseTotais.find(m => m.macrofase === 'Concluído');
  const cancelada    = macrofaseTotais.find(m => m.macrofase === 'Cancelada');
  const reprovadosN  = macrofaseTotais.find(m => m.macrofase === 'Crédito')?.reprovados ?? 0;

  // Fase 600 (Registro do Contrato) — pulled from Formalização bucket
  const fase600 = fases.find(f => f.fase === 600) ?? null;

  // Per-macrofase abandono sum, avg tempo, and direct emAndamento sum
  // fase 101 (Crédito Reprovado) excluída — reprovados não contam como abandono nem emAndamento do macrofase
  const abandonoByMacro    = new Map<string, number>();
  const avgTempoByMacro    = new Map<string, number | null>();
  const emAndamentoPorMacro = new Map<string, number>();
  for (const [macro, phases] of phasesByMacro.entries()) {
    const mainPhases = phases.filter(p => p.fase !== 101);
    abandonoByMacro.set(macro, mainPhases.reduce((s, p) => s + (p.abandono ?? 0), 0));
    emAndamentoPorMacro.set(macro, mainPhases.reduce((s, p) => s + (p.emAndamento ?? 0), 0));
    const withTempo = phases.filter(p => tempoMap.has(p.fase));
    avgTempoByMacro.set(
      macro,
      withTempo.length > 0
        ? withTempo.reduce((s, p) => s + tempoMap.get(p.fase)!, 0) / withTempo.length
        : null,
    );
  }

  // saidasMap for pós-emissão fluxo
  const saidasMap = new Map<number, { para: number; nome: string; qtd: number }[]>();
  for (const tr of transicoes) {
    const sa = saidasMap.get(tr.de) ?? [];
    sa.push({ para: tr.para, nome: tr.paraNome, qtd: tr.qtd });
    saidasMap.set(tr.de, sa);
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

  const availableSteps = PIPELINE.filter(p =>
    p.id === 'Registro de Contrato'
      ? fase600 != null
      : totalMap.has(p.id) || (phasesByMacro.get(p.id)?.length ?? 0) > 0,
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
  const isRegistro     = selected === 'Registro de Contrato';
  const selectedTotal  = isRegistro ? (fase600?.total ?? 0) : (selected ? (totalMap.get(selected) ?? 0) : 0);
  const selectedPhases = isRegistro
    ? (fase600 ? [fase600] : [])
    : (selected ? phasesByMacro.get(selected) ?? [] : []).slice().sort((a, b) => a.fase - b.fase);
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
              Por CPF
            </span>
          )}
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          {dimensao === 'cpf'
            ? 'CPFs únicos por etapa · clique para detalhar'
            : 'Propostas únicas por etapa · clique para detalhar'}
        </p>
      </div>

      {/* ── Step bar ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <div className="flex items-center">
          {availableSteps.map((step, i) => {
            const isActive    = selected === step.id;
            const isRegStep   = step.id === 'Registro de Contrato';
            // Crédito: show total entries (approved + reprovados) — matches MacroMilestones behavior
            const rawTotal = isRegStep ? (fase600?.total ?? 0) : (totalMap.get(step.id) ?? 0);
            const total    = step.id === 'Crédito' ? rawTotal + reprovadosN : rawTotal;
            const pct      = ((total / baseline) * 100).toFixed(0);
            const isLast   = i === availableSteps.length - 1;
            const stepAban = isRegStep ? (fase600?.abandono ?? 0) : (abandonoByMacro.get(step.id) ?? 0);
            const stepEm   = isRegStep ? (fase600?.emAndamento ?? 0) : (emAndamentoPorMacro.get(step.id) ?? 0);
            const stepTempo = isRegStep ? (tempoMap.get(600) ?? null) : (avgTempoByMacro.get(step.id) ?? null);

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
                  {stepAban > 0 && (
                    <p className="mt-1 tabular-nums font-bold" style={{ fontSize: '9px', color: '#EF4444' }}>
                      ↩ {formatCount(stepAban)}
                    </p>
                  )}

                  {/* Em andamento — direto do backend (evita fórmula que quebra pra Crédito) */}
                  {stepEm > 0 && (
                    <p className="tabular-nums font-bold" style={{ fontSize: '9px', color: '#F59E0B' }}>
                      ⏸ {formatCount(stepEm)}
                    </p>
                  )}

                  {/* Tempo médio */}
                  {(() => {
                    const badge = tempoBadge(stepTempo);
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

                {/* Connector — step-to-step conversion rate */}
                {!isLast && (() => {
                  const nextStep  = availableSteps[i + 1];
                  const nextTotal = nextStep ? (totalMap.get(nextStep.id) ?? 0) : 0;
                  const pct       = total > 0 ? Math.round(nextTotal / total * 100) : 0;
                  const pctColor  = pct >= 70 ? '#16A34A' : pct >= 40 ? '#CA8A04' : '#DC2626';
                  return (
                    <div
                      className="flex shrink-0 flex-col items-center justify-center gap-0.5"
                      style={{ width: '36px', marginTop: '-16px' }}
                    >
                      <span
                        className="tabular-nums font-bold leading-none"
                        style={{ fontSize: '8px', color: pctColor }}
                      >
                        {pct}%
                      </span>
                      <div className="flex items-center w-full">
                        <div style={{ flex: 1, height: '1px', backgroundColor: pctColor, opacity: 0.4 }} />
                        <div style={{
                          width: 0, height: 0,
                          borderTop:    '3px solid transparent',
                          borderBottom: '3px solid transparent',
                          borderLeft:   `4px solid ${pctColor}`,
                          opacity: 0.6,
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* ── Legenda — equação do funil ───────────────────────────────── */}
        <div
          className="mt-3 rounded-lg px-3 py-2"
          style={{ backgroundColor: t.bg.base }}
        >
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span style={{ fontSize: '9px', color: t.text.muted }}>Por etapa:</span>
            <span className="font-black" style={{ fontSize: '9px', color: t.text.secondary }}>N chegaram</span>
            <span style={{ fontSize: '9px', color: t.text.muted }}>=</span>
            <span className="font-bold" style={{ fontSize: '9px', color: t.text.secondary }}>N etapa anterior</span>
            <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
            <span className="font-bold" style={{ fontSize: '9px', color: '#EF4444' }}>↩ cancelaram lá</span>
            <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
            <span className="font-bold" style={{ fontSize: '9px', color: '#F59E0B' }}>⏸ ficaram parados lá</span>
            <button
              onClick={() => setShowExample(v => !v)}
              className="ml-1 rounded px-1.5 py-0.5 font-semibold"
              style={{ fontSize: '8px', color: t.text.muted, border: `1px solid ${t.border.default}` }}
            >
              {showExample ? 'ocultar' : 'ver exemplo'}
            </button>
          </div>

          {showExample && availableSteps.length > 1 && (() => {
            const exStep     = availableSteps[0];
            const exTot      = totalMap.get(exStep.id) ?? 0;
            const exNextStep = availableSteps[1];
            const exAban     = abandonoByMacro.get(exStep.id) ?? 0;
            const exPaus     = emAndamentoPorMacro.get(exStep.id) ?? 0;
            const exCalc     = exTot - exAban - exPaus;
            return (
              <div
                className="flex items-center justify-center gap-1 flex-wrap mt-2 pt-2"
                style={{ borderTop: `1px solid ${t.border.subtle}` }}
              >
                <span className="font-bold" style={{ fontSize: '9px', color: exStep.color }}>
                  Ex. ({exStep.short}):
                </span>
                <span className="font-black tabular-nums" style={{ fontSize: '9px', color: t.text.secondary }}>
                  {exTot.toLocaleString('pt-BR')}
                </span>
                <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
                <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#EF4444' }}>
                  ↩ {exAban.toLocaleString('pt-BR')}
                </span>
                <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
                <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#F59E0B' }}>
                  ⏸ {exPaus.toLocaleString('pt-BR')}
                </span>
                <span style={{ fontSize: '9px', color: t.text.muted }}>=</span>
                <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: exNextStep?.color ?? '#16A34A' }}>
                  {exCalc.toLocaleString('pt-BR')} chegaram ao {exNextStep?.short}
                </span>
              </div>
            );
          })()}
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
                — {selectedTotal.toLocaleString('pt-BR')} {dimensao === 'cpf' ? 'CPFs chegaram aqui' : 'propostas aqui'}
              </span>
            </div>

            {/* Math breakdown: total = progressed + abandoned + pending */}
            {(() => {
              const selIdx   = availableSteps.findIndex(s => s.id === selected);
              const nextId   = availableSteps[selIdx + 1]?.id;
              const nextTot  = nextId && nextId !== 'Registro de Contrato'
                ? (totalMap.get(nextId) ?? 0)
                : nextId === 'Registro de Contrato'
                  ? (fase600?.total ?? 0)
                  : (concluido?.total ?? 0);
              const abandono = isRegistro ? (fase600?.abandono ?? 0) : (abandonoByMacro.get(selected!) ?? 0);
              // Use direct backend count (last-phase ops) — avoids negative derived formula
              const pausados = isRegistro ? (fase600?.emAndamento ?? 0) : (emAndamentoPorMacro.get(selected!) ?? 0);
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
              const barPct      = (p.total / maxPhaseCount) * 100;
              const badge       = tempoBadge(tempoMap.get(p.fase) ?? null);
              const isReprovado = p.fase === 101;
              return (
                <div
                  key={p.fase}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: isReprovado ? '#FFF5F5' : t.bg.surface,
                    border:     `1px solid ${isReprovado ? '#FECDD3' : t.border.default}`,
                    borderLeft: `3px solid ${isReprovado ? '#EF4444' : selectedColor}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 p-3" style={{ paddingBottom: (p.abandono ?? 0) > 0 ? '8px' : '12px' }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="text-xs font-semibold leading-tight truncate"
                          style={{ color: isReprovado ? '#DC2626' : t.text.primary }}
                        >
                          {p.nome}
                        </p>
                        {p.fase === 600 && (
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap"
                                style={{ backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                            Fim do Funil
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] tabular-nums mt-0.5" style={{ color: t.text.muted }}>
                        Fase {p.fase}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <p
                        className="text-sm font-black tabular-nums leading-tight"
                        style={{ color: isReprovado ? '#DC2626' : t.text.primary }}
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

                  <div className="mx-3 h-1 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: selectedColor, opacity: 0.5 }}
                    />
                  </div>

                  {(p.abandono ?? 0) > 0 && (
                    <p className="px-3 pt-1.5 text-[9px] font-semibold" style={{ color: '#DC2626' }}>
                      ↩ {p.abandono!.toLocaleString('pt-BR')} cancelaram nesta fase
                    </p>
                  )}

                </div>
              );
            })}
          </div>

          {/* Pós-emissão — shown inside drill-down when Emissão de Contrato or Registro de Contrato is selected */}
          {(selected === 'Emissão de Contrato' || selected === 'Registro de Contrato') && (() => {
            const posGroups: { label: string; color: string; phases: FaseCount[] }[] = [
              { label: 'Formalização', color: '#10B981', phases: (phasesByMacro.get('Formalização') ?? []).slice().sort((a, b) => a.fase - b.fase) },
              { label: 'Liberação',    color: '#06B6D4', phases: (phasesByMacro.get('Liberação') ?? []).slice().sort((a, b) => a.fase - b.fase) },
            ].filter(g => g.phases.length > 0);
            if (posGroups.length === 0) return null;
            const maxPosCount = Math.max(...posGroups.flatMap(g => g.phases.map(p => p.total)), 1);
            return (
              <div className="px-4 pb-4 pt-2" style={{ borderTop: `1px solid ${t.border.subtle}` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.muted }}>
                    Pós-emissão
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
                </div>
                <div className="flex flex-col gap-1">
                  {posGroups.map(g => (
                    <div key={g.label}>
                      {posGroups.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-1 px-1 pt-1">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>{g.label}</span>
                        </div>
                      )}
                      {g.phases.map(p => {
                        const barPct   = (p.total / maxPosCount) * 100;
                        const badge    = tempoBadge(tempoMap.get(p.fase) ?? null);
                        const posSaidas = saidasMap.get(p.fase) ?? [];
                        return (
                          <div key={p.fase} className="mb-1">
                            <div
                              className="flex items-center gap-2 rounded-t px-3 py-1.5"
                              style={{ backgroundColor: `${g.color}08`, borderLeft: `2px solid ${g.color}50` }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-[10px] font-medium leading-tight" style={{ color: t.text.primary }}>{p.nome}</p>
                                <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                              </div>
                              <div className="w-14 h-1 overflow-hidden rounded-full shrink-0" style={{ backgroundColor: t.border.default }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: g.color, opacity: 0.5 }} />
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
                              {(p.abandono ?? 0) > 0 && (
                                <p className="shrink-0 text-[9px] font-bold tabular-nums" style={{ color: '#EF4444' }}>
                                  ↩ {formatCount(p.abandono!)}
                                </p>
                              )}
                            </div>
                            {posSaidas.length > 0 && (
                              <div
                                className="flex flex-wrap items-center gap-1 px-3 py-1 rounded-b"
                                style={{ backgroundColor: `${g.color}05`, borderLeft: `2px solid ${g.color}20` }}
                              >
                                <span className="text-[8px] font-bold uppercase tracking-wider shrink-0" style={{ color: t.text.muted }}>
                                  fluxo
                                </span>
                                {[...posSaidas].sort((a, b) => b.qtd - a.qtd).map(s => {
                                  const isReprov    = s.para === 101;
                                  const isCanceled  = s.para >= 900;
                                  const isConcluido = s.para === 800;
                                  const isNeg       = isReprov || isCanceled;
                                  return (
                                    <span key={s.para}
                                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-medium tabular-nums"
                                          style={{
                                            backgroundColor: isConcluido ? '#F0FDF4' : isNeg ? '#FFF1F2' : t.bg.surface,
                                            color:           isConcluido ? '#16A34A'  : isNeg ? '#DC2626'  : t.text.muted,
                                            border:          isConcluido ? '1px solid #BBF7D0' : isNeg ? '1px solid #FECDD3' : `1px solid ${t.border.subtle}`,
                                          }}>
                                      <span style={{ fontWeight: 700 }}>{isReprov ? '✗' : isConcluido ? '✓' : '→'}</span>
                                      {s.nome}
                                      <span className="opacity-60 ml-0.5">{formatCount(s.qtd)}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {concluido && (
                    <div
                      className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
                    >
                      <div className="h-6 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#15803D' }}>
                          Concluído · fase 800
                        </p>
                        <p className="text-sm font-black tabular-nums leading-tight" style={{ color: '#14532D' }}>
                          {concluido.total.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[9px]" style={{ color: '#16A34A' }}>
                          {((concluido.total / baseline) * 100).toFixed(1)}% conversão total
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Saídas — só aparece quando nenhuma etapa está selecionada ────────── */}
      {!selected && (concluido || cancelada || totalEmAndamento > 0) && (
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
