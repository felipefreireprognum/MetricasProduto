'use client';

import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Layers,
  Scan, UserPlus, Landmark, MessageSquare,
  FileSearch, Wrench, PenLine, Unlock,
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
  { id: 'Emissão de Contrato',    color: '#10B981' },
  { id: 'Registro de Contratos',  color: '#06B6D4' },
  { id: 'Concluído',              color: '#16A34A' },
  { id: 'Cancelada',              color: '#EF4444' },
  // backward compat com Parquet antigo
  { id: 'Formalização',           color: '#10B981' },
  { id: 'Liberação',              color: '#06B6D4' },
] as const;

type MacrofaseId = typeof MACROFASES[number]['id'];

const MACROFASE_ICONS: Record<string, LucideIcon> = {
  'Simulação':             Scan,
  'Cadastro':              UserPlus,
  'Crédito':               Landmark,
  'Negociação':            MessageSquare,
  'Análise de Documentos': FileSearch,
  'Análise Técnica':       Wrench,
  'Emissão de Contrato':   PenLine,
  'Registro de Contratos': Unlock,
  // backward compat
  'Formalização':          PenLine,
  'Liberação':             Unlock,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Saida {
  para: number;
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

const POS_EMISSAO_IDS = new Set(['Registro de Contratos', 'Liberação']);

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

function PosEmissaoSection({ rows, baseline, tokens: t }: {
  rows:     MacrofaseRow[];
  baseline: number;
  tokens:   BankTokens;
}) {
  if (!rows.length) return null;
  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.text.muted }}>
          Pós-emissão
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: t.border.subtle }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2.5 rounded-lg px-3.5 py-2"
            style={{ backgroundColor: `${m.color}0D`, border: `1px solid ${m.color}30` }}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
            <div>
              <p className="text-[10px] font-medium" style={{ color: t.text.secondary }}>{m.label}</p>
              <p className="text-sm font-black tabular-nums" style={{ color: m.color }}>{formatCount(m.count)}</p>
              {baseline > 0 && (
                <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>
                  {((m.count / baseline) * 100).toFixed(1)}% do início
                </p>
              )}
            </div>
          </div>
        ))}
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
  const saidasMap    = new Map<number, Saida[]>();
  for (const tr of transicoes) {
    const list = saidasMap.get(tr.de) ?? [];
    list.push({ para: tr.para, nome: tr.paraNome, qtd: tr.qtd });
    saidasMap.set(tr.de, list);
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
    });
  }

  const funnelRows:     MacrofaseRow[] = [];
  const posEmissaoRows: MacrofaseRow[] = [];
  let concluídoRow:     MacrofaseRow | null = null;
  let canceladaRow:     MacrofaseRow | null = null;

  for (const mf of MACROFASES) {
    const phases = (buckets.get(mf.id) ?? []).sort((a, b) => a.fase - b.fase);
    if (phases.length === 0) continue;

    const count       = macroTotalMap.get(mf.id) ?? phases.reduce((s, p) => s + p.total, 0);
    const abandono    = phases.reduce((s, p) => s + p.abandono, 0);
    const emAndamento = phases.reduce((s, p) => s + p.emAndamento, 0);
    const withTempo   = phases.filter((p) => p.tempo != null);
    const avgTempo    = withTempo.length
      ? withTempo.reduce((s, p) => s + p.tempo!, 0) / withTempo.length
      : null;

    const reprovados = macroReprovMap.get(mf.id) ?? 0;
    const row: MacrofaseRow = { id: mf.id as MacrofaseId, label: mf.id, color: mf.color, count, avgTempo, abandono, emAndamento, phases, reprovados };

    if      (mf.id === 'Concluído')        concluídoRow = row;
    else if (mf.id === 'Cancelada')        canceladaRow = row;
    else if (POS_EMISSAO_IDS.has(mf.id))  posEmissaoRows.push(row);
    else                                   funnelRows.push(row);
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
                  <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{m.label}</p>
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
                const pBadge = tempoBadge(p.tempo);
                return (
                  <div
                    key={p.fase}
                    className="flex items-center gap-3 px-3 py-1.5"
                    style={{ borderTop: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.surface }}
                  >
                    {/* indent spacer */}
                    <div className="w-5 shrink-0" />
                    {/* name + fase code */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[10px] font-medium leading-tight" style={{ color: t.text.secondary }}>
                        {p.nome}
                      </p>
                      <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>Fase {p.fase}</p>
                    </div>
                    {/* count */}
                    <p className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: t.text.secondary }}>
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

      <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} />
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
        const pct    = (m.count / baseline) * 100;
        const badge  = tempoBadge(m.avgTempo);
        const isOpen = expanded.has(m.id);

        return (
          <div key={m.id} style={{ borderBottom: DASH }}>
            <button
              onClick={() => toggle(m.id)}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
              style={{
                backgroundColor: isOpen ? `${m.color}0C` : t.bg.surface,
                borderLeft: `3px solid ${m.color}`,
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
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform"
                style={{ color: t.text.muted, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
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
                    const hasSaidas = p.saidas.length > 0;

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
                            borderBottom: hasSaidas ? `1px solid ${t.border.subtle}` : 'none',
                          }}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{p.nome}</p>
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

                        {hasSaidas && (
                          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2" style={{ backgroundColor: t.bg.base }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: t.text.muted }}>
                              Fluxo
                            </span>
                            {[...p.saidas]
                              .sort((a, b) => {
                                const ai = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(a.para) ?? '');
                                const bi = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(b.para) ?? '');
                                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                              })
                              .map((s) => {
                                const isCancelled = faseMacrofaseMap.get(s.para) === 'Cancelada';
                                const dc          = faseColorMap.get(s.para) ?? m.color;
                                return (
                                  <span key={s.para}
                                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                                        style={{
                                          backgroundColor: isCancelled ? '#FFF1F2' : `${dc}12`,
                                          color:           isCancelled ? '#DC2626'  : t.text.secondary,
                                          border:          isCancelled ? '1px solid #FECDD3' : `1px solid ${dc}30`,
                                        }}>
                                    <span style={{ color: isCancelled ? '#EF4444' : dc, fontWeight: 700 }}>→</span>
                                    {s.nome}
                                    <span className="font-bold tabular-nums ml-0.5" style={{ color: isCancelled ? '#DC2626' : t.text.primary }}>
                                      {s.qtd.toLocaleString('pt-BR')}
                                    </span>
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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

      <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} />
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

function ChevronFunnelMode({ funnelRows, posEmissaoRows, canceladaRow, tokens: t, dimensao = 'operacoes' }: {
  funnelRows:    MacrofaseRow[];
  posEmissaoRows: MacrofaseRow[];
  canceladaRow:  MacrofaseRow | null;
  tokens:        BankTokens;
  dimensao?:     'operacoes' | 'cpf';
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
  for (const row of [...funnelRows, ...(canceladaRow ? [canceladaRow] : [])]) {
    for (const phase of row.phases) {
      faseColorMap.set(phase.fase, row.color);
      faseMacrofaseMap.set(phase.fase, row.id);
    }
  }

  const openRows = funnelRows.filter(m => expanded.has(m.id));

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
          const isFirst = i === 0;
          const isLast  = i === n - 1;
          const isOpen  = expanded.has(m.id);
          const pct     = (m.count / baseline) * 100;
          const Icon    = MACROFASE_ICONS[m.id] ?? Layers;
          const pl      = i > 0 ? NOTCH + 8 : 10;
          const pr      = !isLast ? NOTCH + 8 : 10;

          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6 transition-opacity min-w-0"
              style={{
                clipPath:        chevronClip(isFirst, isLast),
                backgroundColor: isOpen ? `${m.color}40` : isLast ? `${m.color}28` : `${m.color}18`,
                marginLeft:      i > 0 ? `-${NOTCH}px` : 0,
                zIndex:          n - i,
                paddingLeft:     `${pl}px`,
                paddingRight:    `${pr}px`,
                cursor:          'pointer',
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
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, borderBottom: openRows.length > 0 ? DASH : 'none' }}
      >
        {funnelRows.map((m, i) => {
          const prevCount = i > 0 ? funnelRows[i - 1].count : m.count;
          const convPct   = i > 0 ? `${(m.count / prevCount * 100).toFixed(0)}%` : null;
          const badge     = tempoBadge(m.avgTempo);

          return (
            <div
              key={m.id}
              className="flex flex-col items-center gap-0.5 py-1"
              style={{ borderRight: i < n - 1 ? `1px dashed ${t.border.default}` : 'none' }}
            >
              {convPct ? (
                <span className="text-[9px] font-bold tabular-nums" style={{ color: m.color }}>
                  {convPct}
                </span>
              ) : (
                <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: t.text.muted }}>
                  {dimensao === 'cpf' ? 'base CPF' : 'base funil'}
                </span>
              )}
              {(m.reprovados ?? 0) > 0 && (
                <span className="text-[8px] tabular-nums font-bold" style={{ color: '#DC2626' }}>
                  ✗ {formatCount(m.reprovados!)} reprov.
                </span>
              )}
              {m.abandono > 0 && (
                <span className="text-[8px] tabular-nums" style={{ color: '#EF4444' }}>
                  ↩ {formatCount(m.abandono)}
                </span>
              )}
              {m.emAndamento > 0 && (
                <span className="text-[8px] tabular-nums font-bold" style={{ color: '#F59E0B' }}>
                  ⏸ {formatCount(m.emAndamento)}
                </span>
              )}
              <span
                className="rounded px-1 text-[8px] font-semibold tabular-nums"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      <PosEmissaoSection rows={posEmissaoRows} baseline={baseline} tokens={t} />

      {/* Expanded phase sections — one per open macrofase, stacked */}
      {openRows.map((m) => (
        <div key={m.id} style={{ borderTop: `2px solid ${m.color}30` }}>

          {/* Section header */}
          <div
            className="flex items-center justify-between px-5 py-2.5"
            style={{ backgroundColor: `${m.color}08`, borderBottom: `1px solid ${m.color}20` }}
          >
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
              const maxPhase  = Math.max(...m.phases.map((x) => x.total), 1);
              const barPct    = (p.total / maxPhase) * 100;
              const pBadge    = tempoBadge(p.tempo);
              const hasSaidas = p.saidas.length > 0;

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
                  {/* Metrics row */}
                  <div
                    className="grid items-center gap-2 px-3 py-2.5"
                    style={{
                      gridTemplateColumns: PHASE_COLS,
                      borderBottom: hasSaidas ? `1px solid ${t.border.subtle}` : 'none',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{p.nome}</p>
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

                  {/* Fluxo row */}
                  {hasSaidas && (
                    <div
                      className="flex flex-wrap items-center gap-1.5 px-3 py-2"
                      style={{ backgroundColor: t.bg.base }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider mr-1"
                        style={{ color: t.text.muted }}
                      >
                        Fluxo
                      </span>
                      {[...p.saidas]
                        .sort((a, b) => {
                          const ai = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(a.para) ?? '');
                          const bi = MACROFASE_ORDER.indexOf(faseMacrofaseMap.get(b.para) ?? '');
                          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                        })
                        .map((s) => {
                          const isCancelled = faseMacrofaseMap.get(s.para) === 'Cancelada';
                          const dc          = faseColorMap.get(s.para) ?? m.color;
                          return (
                            <span
                              key={s.para}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: isCancelled ? '#FFF1F2' : `${dc}12`,
                                color:           isCancelled ? '#DC2626'  : t.text.secondary,
                                border:          isCancelled ? '1px solid #FECDD3' : `1px solid ${dc}30`,
                              }}
                            >
                              <span style={{ color: isCancelled ? '#EF4444' : dc, fontWeight: 700 }}>→</span>
                              {s.nome}
                              <span className="font-bold tabular-nums ml-0.5" style={{ color: isCancelled ? '#DC2626' : t.text.primary }}>
                                {s.qtd.toLocaleString('pt-BR')}
                              </span>
                            </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
    return <ChevronFunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} canceladaRow={canceladaRow} tokens={t} dimensao={dimensao} />;
  }

  return (
    <FunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} concluídoRow={concluídoRow} canceladaRow={canceladaRow} tokens={t} />
  );
}
