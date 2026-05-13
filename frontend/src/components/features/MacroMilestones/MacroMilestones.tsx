'use client';

import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Layers,
  Scan, UserPlus, Landmark, MessageSquare,
  FileSearch, Wrench, FilePen, Stamp, PenLine, Unlock,
  type LucideIcon,
} from 'lucide-react';
import { MACROFASE_COLOR, MACROFASE_ORDER } from '@/theme/phaseColors';
import type { FaseCount, TempoFase, FaseTransicao, MacrofaseTotal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Macrofase definitions ─────────────────────────────────────────────────────

const MACROFASES = [
  { id: 'Simulação',              color: '#94A3B8' },
  { id: 'Cadastro',               color: '#3B82F6' },
  { id: 'Crédito',                color: '#8B5CF6' },
  { id: 'Negociação',             color: '#F59E0B' },
  { id: 'Análise de Documentos',  color: '#EC4899' },
  { id: 'Análise Técnica',        color: '#F97316' },
  { id: 'Emissão de Contrato',    color: '#059669' },  // fim do funil (fases 500-501)
  { id: 'Formalização',           color: '#10B981' },  // pós-emissão (fases 502-601)
  { id: 'Liberação',              color: '#06B6D4' },  // pós-emissão (fases 700-701)
  { id: 'Concluído',              color: '#16A34A' },
  { id: 'Cancelada',              color: '#EF4444' },
  { id: 'Registro de Contrato',   color: '#34D399' },  // phantom chevron — shares expanded state with Emissão de Contrato
  { id: 'Registro de Contratos',  color: '#06B6D4' },  // backward compat
] as const;

type MacrofaseId = typeof MACROFASES[number]['id'];

const MACROFASE_ICONS: Record<string, LucideIcon> = {
  'Simulação':             Scan,
  'Cadastro':              UserPlus,
  'Crédito':               Landmark,
  'Negociação':            MessageSquare,
  'Análise de Documentos': FileSearch,
  'Análise Técnica':       Wrench,
  'Emissão de Contrato':   FilePen,
  'Registro de Contrato':  Stamp,
  'Formalização':          PenLine,
  'Liberação':             Unlock,
  'Registro de Contratos': Unlock,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Saida {
  para: number;
  nome: string;
  qtd:  number;
}

interface Entrada {
  de:   number;
  nome: string;
  qtd:  number;
}

interface PhaseDetail {
  fase:        number;
  nome:        string;
  total:       number;
  tempo:       number | null;
  abandono:    number;
  emAndamento: number;
  saidas:      Saida[];
  entradas:    Entrada[];
}

interface MacrofaseRow {
  id:          MacrofaseId;
  label:       string;
  color:       string;
  count:       number;
  avgTempo:    number | null;
  abandono:    number;
  emAndamento: number;
  phases:      PhaseDetail[];
  reprovados?: number;
}

interface HoverState {
  row: MacrofaseRow;
  x:   number;
  y:   number;
}

export interface Props {
  fases:            FaseCount[];
  tempos:           TempoFase[];
  tokens:           BankTokens;
  mode?:            'funnel' | 'detail' | 'expand' | 'chevron';
  transicoes?:      FaseTransicao[];
  macrofaseTotais?: MacrofaseTotal[];
  dimensao?:        'operacoes' | 'cpf';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POS_EMISSAO_IDS = new Set(['Formalização', 'Liberação', 'Registro de Contratos']);

function tempoBadge(dias: number | null) {
  if (dias == null) return { bg: '#F1F5F9', text: '#94A3B8', label: '—' };
  if (dias < 7)     return { bg: '#DCFCE7', text: '#16A34A', label: `${dias.toFixed(1)}d` };
  if (dias < 20)    return { bg: '#FEF9C3', text: '#CA8A04', label: `${dias.toFixed(1)}d` };
  if (dias < 40)    return { bg: '#FFEDD5', text: '#EA580C', label: `${dias.toFixed(1)}d` };
  return              { bg: '#FEE2E2', text: '#DC2626', label: `${dias.toFixed(1)}d` };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

function PosEmissaoSection({ rows, baseline, tokens: t, concluido, faseColorMap, faseMacrofaseMap }: {
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
          Pós
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
                          ↩ {formatCount(p.abandono)}
                        </p>
                      )}
                    </div>
                    {(p.saidas.length > 0 || p.entradas.length > 0) && (
                      <div className="flex flex-col" style={{ backgroundColor: `${m.color}05`, borderLeft: `2px solid ${m.color}20` }}>
                        {p.saidas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-wider shrink-0 mr-1" style={{ color: t.text.muted }}>
                              Saiu para →
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
                                    {isReprov ? '✗' : isConcluido ? '✓' : '→'}
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
                              Recebeu de ←
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
                                    {isBackward ? '↩' : '←'}
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
                Concluído · fase 800
              </p>
              <p className="text-sm font-black tabular-nums leading-tight" style={{ color: '#14532D' }}>
                {concluido.count.toLocaleString('pt-BR')}
              </p>
              <p className="text-[9px]" style={{ color: '#16A34A' }}>
                {((concluido.count / baseline) * 100).toFixed(1)}% conversão total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildRows(
  fases:           FaseCount[],
  tempos:          TempoFase[],
  transicoes:      FaseTransicao[] = [],
  macrofaseTotais: MacrofaseTotal[] = [],
) {
  const tempoMap        = new Map(tempos.map((tf) => [tf.fase, tf.tempoMedioDias]));
  const macroTotalMap   = new Map(macrofaseTotais.map((m) => [m.macrofase, m.total]));
  const macroReprovMap  = new Map(macrofaseTotais.map((m) => [m.macrofase, m.reprovados ?? 0]));
  const faseNomeMap     = new Map(fases.map((f) => [f.fase, f.nome]));
  const saidasMap       = new Map<number, Saida[]>();
  const entradasMap     = new Map<number, Entrada[]>();
  for (const tr of transicoes) {
    const saList = saidasMap.get(tr.de) ?? [];
    saList.push({ para: tr.para, nome: tr.paraNome, qtd: tr.qtd });
    saidasMap.set(tr.de, saList);

    const enList = entradasMap.get(tr.para) ?? [];
    enList.push({ de: tr.de, nome: faseNomeMap.get(tr.de) ?? `Fase ${tr.de}`, qtd: tr.qtd });
    entradasMap.set(tr.para, enList);
  }

  const buckets = new Map<string, PhaseDetail[]>(MACROFASES.map((m) => [m.id, []]));

  for (const fase of fases) {
    const key = fase.macrofase ?? 'Desconhecida';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({
      fase:        fase.fase,
      nome:        fase.nome,
      total:       fase.total,
      tempo:       tempoMap.get(fase.fase) ?? null,
      abandono:    fase.abandono ?? 0,
      emAndamento: fase.emAndamento ?? 0,
      saidas:      saidasMap.get(fase.fase) ?? [],
      entradas:    entradasMap.get(fase.fase) ?? [],
    });
  }

  const funnelRows:     MacrofaseRow[] = [];
  const posEmissaoRows: MacrofaseRow[] = [];
  let concluídoRow:     MacrofaseRow | null = null;
  let canceladaRow:     MacrofaseRow | null = null;

  for (const mf of MACROFASES) {
    const phases = (buckets.get(mf.id) ?? []).sort((a, b) => a.fase - b.fase);
    // 'Emissão de Contrato' is always the defined funnel endpoint — show even when no ops reached it yet
    if (phases.length === 0 && mf.id !== 'Emissão de Contrato') continue;

    const reprovados  = macroReprovMap.get(mf.id) ?? 0;
    const emissaoPrincipal = mf.id === 'Emissão de Contrato' ? phases.find(p => p.fase === 501) : null;
    const count       = (emissaoPrincipal?.total ?? macroTotalMap.get(mf.id) ?? phases.reduce((s, p) => s + p.total, 0)) + reprovados;
    // fase 101 não entra no abandono nem no emAndamento do macrofase — são reprovados, já contabilizados em ✗ reprov.
    const abandono    = emissaoPrincipal?.abandono ?? phases.filter(p => p.fase !== 101).reduce((s, p) => s + p.abandono, 0);
    const emAndamento = emissaoPrincipal?.emAndamento ?? phases.filter(p => p.fase !== 101).reduce((s, p) => s + p.emAndamento, 0);
    const withTempo   = phases.filter((p) => p.tempo != null);
    const avgTempo    = emissaoPrincipal?.tempo ?? (withTempo.length
      ? withTempo.reduce((s, p) => s + p.tempo!, 0) / withTempo.length
      : null);

    const row: MacrofaseRow = { id: mf.id as MacrofaseId, label: mf.id, color: mf.color, count, avgTempo, abandono, emAndamento, phases, reprovados };

    if      (mf.id === 'Concluído')        concluídoRow = row;
    else if (mf.id === 'Cancelada')        canceladaRow = row;
    else if (POS_EMISSAO_IDS.has(mf.id))  posEmissaoRows.push(row);
    else                                   funnelRows.push(row);
  }

  // Sobe fase 600 (Registro do Contrato) para a seção de Emissão de Contrato
  // e cria um chevron visual separado no funil com cor mais clara
  const emissaoRow = funnelRows.find(r => r.id === 'Emissão de Contrato');
  const formRow    = posEmissaoRows.find(r => r.id === 'Formalização');
  if (emissaoRow) {
    const registroSourceRow = posEmissaoRows.find(r => r.phases.some(p => p.fase === 600)) ?? formRow;
    const idx = registroSourceRow?.phases.findIndex(p => p.fase === 600) ?? -1;
    const fase600 = idx !== -1 && registroSourceRow ? registroSourceRow.phases.splice(idx, 1)[0] : null;
    if (fase600) {
      funnelRows.push({
        id: 'Registro de Contrato' as MacrofaseId,
        label: 'Registro de Contrato',
        color: '#34D399',
        count: fase600.total,
        avgTempo: fase600.tempo,
        abandono: fase600.abandono,
        emAndamento: fase600.emAndamento,
        phases: [fase600],
        reprovados: 0,
      });
    }
  }

  return { funnelRows, posEmissaoRows, concluídoRow, canceladaRow };
}

// ── Hover tooltip (funnel mode) ───────────────────────────────────────────────

function HoverCard({ hover, tokens: t }: { hover: HoverState; tokens: BankTokens }) {
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

// ── Funnel mode (dashboard) ───────────────────────────────────────────────────

function FunnelMode({ funnelRows, posEmissaoRows, concluídoRow, canceladaRow, tokens: t }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  concluídoRow:  MacrofaseRow | null;
  canceladaRow:  MacrofaseRow | null;
  tokens:        BankTokens;
}) {
  if (!funnelRows.length && !concluídoRow && !canceladaRow) return null;

  const baseline = funnelRows[0]?.count || 1;

  return (
    <div
      className="flex h-full flex-col rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Funil por macrofase</h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          Volume e tempo médio por etapa do processo
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
                        ✗ {(m.reprovados ?? 0).toLocaleString('pt-BR')} reprov.
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
                            ✗ Fim de linha
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
                        ↩ {p.abandono.toLocaleString('pt-BR')}
                      </p>
                    ) : (
                      <p className="shrink-0 text-[10px]" style={{ color: t.border.default }}>—</p>
                    )}
                  </div>
                );
              })}
              {m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0 && (
                <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluídoRow} />
              )}
            </div>
          );
        })}
      </div>

      {/* Saídas — always at the very bottom */}
      {(concluídoRow || canceladaRow) && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border.subtle}` }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
            Saídas
          </p>
          <div className="flex gap-3">
            {concluídoRow && (
              <div
                className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <div className="h-8 w-1 rounded-full bg-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">Concluído</p>
                  <p className="text-xl font-black tabular-nums text-green-900">{concluídoRow.count.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-green-600">{((concluídoRow.count / baseline) * 100).toFixed(1)}% conv.</p>
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

// ── Detail mode (/fases) ──────────────────────────────────────────────────────

function DetailMode({ funnelRows, concluídoRow, canceladaRow, tokens: t }: {
  funnelRows:   MacrofaseRow[];
  concluídoRow: MacrofaseRow | null;
  canceladaRow: MacrofaseRow | null;
  tokens:       BankTokens;
}) {
  const allRows = [
    ...funnelRows,
    ...(concluídoRow  ? [concluídoRow]  : []),
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
          {allRows.length} macrofases · {allRows.reduce((s, r) => s + r.phases.length, 0)} fases individuais · clique para expandir
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

// ── Expand mode (/fases — full-width funnel with inline phase drill-down) ─────

const PHASE_COLS = '1fr 200px 72px 52px 72px 96px';

function ExpandFunnelMode({ funnelRows, posEmissaoRows, concluídoRow, canceladaRow, tokens: t }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  concluídoRow:  MacrofaseRow | null;
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

  if (!funnelRows.length && !concluídoRow && !canceladaRow) return null;

  const baseline = funnelRows[0]?.count || 1;
  const DASH     = `1px solid ${t.border.subtle}`;

  const faseColorMap     = new Map<number, string>();
  const faseMacrofaseMap = new Map<number, string>();
  for (const row of [...funnelRows, ...(concluídoRow ? [concluídoRow] : []), ...(canceladaRow ? [canceladaRow] : [])]) {
    for (const phase of row.phases) {
      faseColorMap.set(phase.fase, row.color);
      faseMacrofaseMap.set(phase.fase, row.id);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: DASH }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Funil de Conversão</h3>
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
        const isExpandable = m.phases.length > 0 || (m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0);
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
                      ↩ {m.abandono.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#EF4444', opacity: 0.8 }}>
                      {baseline > 0 ? `${(m.abandono / baseline * 100).toFixed(1)}% do total` : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px]" style={{ color: t.text.muted }}>—</span>
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
                            {m.count > 0 ? `${(p.total / m.count * 100).toFixed(0)}%` : '—'}
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
                              <span className="text-[10px]" style={{ color: t.text.muted }}>—</span>
                            )}
                          </div>
                        </div>

                        {(hasSaidas || hasEntradas) && (
                          <div className="flex flex-col gap-0" style={{ backgroundColor: t.bg.base }}>
                            {hasSaidas && (
                              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: t.text.muted }}>
                                  Saiu para →
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
                                    const isConcluido  = faseMacrofaseMap.get(s.para) === 'Concluído' || s.para === 800;
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
                                          {isReprovDest ? '✗' : isConcluido ? '✓' : '→'}
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
                                  Recebeu de ←
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
                                          {isBackward ? '↩' : '←'}
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
                {m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0 && (
                  <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluídoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
                )}
              </div>
            )}
          </div>
        );
      })}

      {(concluídoRow || canceladaRow) && (
        <div className="px-5 py-4" style={{ borderTop: DASH }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
            Saídas do funil
          </p>
          <div className="flex gap-3">
            {concluídoRow && (
              <div className="flex flex-1 items-center gap-4 rounded-xl px-5 py-4"
                   style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div className="h-10 w-1 rounded-full bg-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Concluído</p>
                  <p className="text-2xl font-black tabular-nums text-green-900 leading-tight">
                    {concluídoRow.count.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-green-600 mt-0.5">
                    {((concluídoRow.count / baseline) * 100).toFixed(1)}% de conversão do funil
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

// ── Chevron funnel mode (/fases — modern connected-arrow style) ───────────────

const NOTCH = 14;

function chevronClip(first: boolean, last: boolean): string {
  if (first) return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
  if (last)  return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;
  return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
}

function ChevronFunnelMode({ funnelRows, posEmissaoRows, canceladaRow, concluídoRow, tokens: t, dimensao = 'operacoes' }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  canceladaRow:  MacrofaseRow | null;
  concluídoRow:  MacrofaseRow | null;
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
  for (const row of [...funnelRows, ...posEmissaoRows, ...(concluídoRow ? [concluídoRow] : []), ...(canceladaRow ? [canceladaRow] : [])]) {
    for (const phase of row.phases) {
      faseColorMap.set(phase.fase, row.color);
      faseMacrofaseMap.set(phase.fase, row.id);
    }
  }

  const openRows = funnelRows.filter(m => expanded.has(m.id) && (m.phases.length > 0 || (m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0)));

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
            Funil de Conversão
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
        <span className="text-[11px] font-medium shrink-0" style={{ color: t.text.muted }}>
          {n} etapas · {funnelRows.reduce((s, r) => s + r.phases.length, 0)} fases
        </span>
      </div>

      {/* Chevron row */}
      <div className="flex items-stretch px-4 pt-4">
        {funnelRows.map((m, i) => {
          const isFirst      = i === 0;
          const isLast       = i === n - 1;
          const isRegistro   = false;
          const toggleId     = isRegistro ? 'Emissão de Contrato' : m.id;
          const isOpen       = isRegistro ? expanded.has('Emissão de Contrato') : expanded.has(m.id);
          const isExpandable = isRegistro ? true : m.phases.length > 0 || (m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0);
          const pct          = (m.count / baseline) * 100;
          const Icon         = MACROFASE_ICONS[m.id] ?? Layers;
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

      {/* Metrics row — step-to-step conversion, abandono, avg time */}
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
                  ✗ {formatCount(m.reprovados!)} reprov.
                </span>
              )}
              {m.abandono > 0 && (
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#EF4444' }}>
                  ↩ {formatCount(m.abandono)}
                </span>
              )}
              {m.emAndamento > 0 && (
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: '#F59E0B' }}>
                  ⏸ {formatCount(m.emAndamento)}
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

      {/* Legend — funnel math equation */}
      <div
        className="px-4 pb-3"
        style={{ borderBottom: openRows.length > 0 ? DASH : 'none' }}
      >
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span style={{ fontSize: '9px', color: t.text.muted }}>Por etapa (aprox.):</span>
          <span className="font-black" style={{ fontSize: '9px', color: t.text.secondary }}>N chegaram</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>≈</span>
          <span className="font-bold" style={{ fontSize: '9px', color: t.text.secondary }}>N etapa anterior</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
          <span className="font-bold" style={{ fontSize: '9px', color: '#EF4444' }}>↩ cancelaram lá</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
          <span className="font-bold" style={{ fontSize: '9px', color: '#F59E0B' }}>⏸ ficaram parados lá</span>
          <span style={{ fontSize: '9px', color: t.text.muted }}>· cada macrofase conta propostas únicas (não soma de sub-fases)</span>
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
              <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#EF4444' }}>
                ↩ {exRow.abandono.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '9px', color: t.text.muted }}>−</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: '#F59E0B' }}>
                ⏸ {exRow.emAndamento.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: '9px', color: t.text.muted }}>≈</span>
              <span className="font-bold tabular-nums" style={{ fontSize: '9px', color: exNextRow.color }}>
                {exCalc.toLocaleString('pt-BR')} chegaram ao {exNextRow.label}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Expanded phase sections — one per open macrofase, stacked */}
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
              {' '}{dimensao === 'cpf' ? 'CPFs únicos' : 'propostas únicas'} neste macrofase
              {m.phases.length > 1 && m.id !== 'Emissão de Contrato' && (
                <> · total = operações únicas em qualquer sub-fase <span className="font-semibold">(não soma)</span></>
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
                          ⏸ {p.emAndamento.toLocaleString('pt-BR')} aguard.
                        </p>
                      )}
                    </div>

                    <p className="text-right text-[10px] tabular-nums font-medium" style={{ color: t.text.muted }}>
                      {m.count > 0 ? `${(p.total / m.count * 100).toFixed(0)}%` : '—'}
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
                        <span className="text-[10px]" style={{ color: t.text.muted }}>—</span>
                      )}
                    </div>
                  </div>

                  {/* Nota explicativa — apenas fase 101 */}
                  {isReprovado && (
                    <p className="px-3 py-2 text-[10px] leading-snug" style={{ color: '#B91C1C', backgroundColor: '#FFF5F5' }}>
                      Propostas reprovadas não avançam no funil. O encerramento de cada uma é mostrado no fluxo abaixo.
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
                            Saiu para →
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
                              const isConcluido  = faseMacrofaseMap.get(s.para) === 'Concluído' || s.para === 800;
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
                                    {isReprovDest ? '✗' : isConcluido ? '✓' : '→'}
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
                            Recebeu de ←
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
                                    {isBackward ? '↩' : '←'}
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
          {false && m.id === 'Emissão de Contrato' && posEmissaoRows.length > 0 && (
            <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluídoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
          )}
        </div>
      ))}
      {(expanded.has('Emissão de Contrato') || expanded.has('Registro de Contrato')) && posEmissaoRows.length > 0 && (
        <div style={{ borderTop: `2px solid ${MACROFASE_COLOR['Registro de Contratos'] ?? '#06B6D4'}30` }}>
          <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} concluido={concluídoRow} faseColorMap={faseColorMap} faseMacrofaseMap={faseMacrofaseMap} />
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MacroMilestones({ fases, tempos, tokens: t, mode = 'funnel', transicoes = [], macrofaseTotais = [], dimensao = 'operacoes' }: Props) {
  const { funnelRows, posEmissaoRows, concluídoRow, canceladaRow } = buildRows(fases, tempos, transicoes, macrofaseTotais);

  if (mode === 'detail') {
    return (
      <DetailMode funnelRows={funnelRows} concluídoRow={concluídoRow} canceladaRow={canceladaRow} tokens={t} />
    );
  }

  if (mode === 'expand') {
    return (
      <ExpandFunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} concluídoRow={concluídoRow} canceladaRow={canceladaRow} tokens={t} />
    );
  }

  if (mode === 'chevron') {
    return <ChevronFunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} canceladaRow={canceladaRow} concluídoRow={concluídoRow} tokens={t} dimensao={dimensao} />;
  }

  return (
    <FunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} concluídoRow={concluídoRow} canceladaRow={canceladaRow} tokens={t} />
  );
}
