'use client';

import { useState } from 'react';
import { ArrowUpDown, Clock, Layers, AlertTriangle } from 'lucide-react';
import type { FaseCount, TempoFase } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'fase' | 'volume' | 'tempo';

interface PhaseRow {
  fase:   number;
  nome:   string;
  total:  number;
  tempo:  number | null;
}

interface Props {
  fases:       FaseCount[];
  temposFase:  TempoFase[];
  tokens:      BankTokens;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempoColor(dias: number | null): { bg: string; text: string; label: string } {
  if (dias == null) return { bg: '#F1F5F9', text: '#94A3B8', label: '—' };
  if (dias < 7)     return { bg: '#DCFCE7', text: '#16A34A', label: `${dias.toFixed(1)}d` };
  if (dias < 20)    return { bg: '#FEF9C3', text: '#CA8A04', label: `${dias.toFixed(1)}d` };
  if (dias < 40)    return { bg: '#FFEDD5', text: '#EA580C', label: `${dias.toFixed(1)}d` };
  return              { bg: '#FEE2E2', text: '#DC2626', label: `${dias.toFixed(1)}d` };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, sub, accent, tokens: t,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent: string; tokens: BankTokens;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-4"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: t.text.muted }}>
          {label}
        </p>
        <p className="text-base font-black leading-tight truncate" style={{ color: t.text.primary }}>
          {value}
        </p>
        {sub && <p className="text-[10px] truncate" style={{ color: t.text.muted }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhaseBreakdown({ fases, temposFase, tokens: t }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('volume');

  // Join fases + tempos
  const tempoMap = new Map(temposFase.map((tf) => [tf.fase, tf.tempoMedioDias]));
  const rows: PhaseRow[] = fases.map((f) => ({
    fase:  f.fase,
    nome:  f.nome,
    total: f.total,
    tempo: tempoMap.get(f.fase) ?? null,
  }));

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'fase')   return a.fase - b.fase;
    if (sortBy === 'volume') return b.total - a.total;
    return (b.tempo ?? -1) - (a.tempo ?? -1);
  });

  const maxTotal    = Math.max(...rows.map((r) => r.total), 1);
  const maxTempo    = rows.reduce((m, r) => r.tempo != null && r.tempo > (m?.tempo ?? 0) ? r : m, rows[0]);
  const maxVolume   = rows.reduce((m, r) => r.total > m.total ? r : m, rows[0]);
  const withTempo   = rows.filter((r) => r.tempo != null);
  const avgTempo    = withTempo.length
    ? withTempo.reduce((s, r) => s + r.tempo!, 0) / withTempo.length
    : null;

  const DASH = `1px dashed ${t.border.default}`;

  const SORTS: { id: SortKey; label: string }[] = [
    { id: 'volume', label: 'Mais cheias' },
    { id: 'tempo',  label: 'Mais lentas' },
    { id: 'fase',   label: 'Por fase'    },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          icon={Layers}
          label="Total de fases"
          value={String(rows.length)}
          sub={`${rows.filter(r => r.total > 0).length} com operações`}
          accent="#3B82F6"
          tokens={t}
        />
        <SummaryCard
          icon={Clock}
          label="Fase mais lenta"
          value={maxTempo?.tempo != null ? `${maxTempo.tempo.toFixed(1)}d` : '—'}
          sub={maxTempo?.nome}
          accent="#EF4444"
          tokens={t}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Fase mais cheia"
          value={maxVolume ? maxVolume.total.toLocaleString('pt-BR') : '—'}
          sub={maxVolume?.nome}
          accent="#F59E0B"
          tokens={t}
        />
      </div>

      {/* Main table card */}
      <div
        className="rounded-xl"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: DASH }}
        >
          <div>
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
              Volume e tempo por fase
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
              {rows.length} fases · tempo médio geral{' '}
              <span className="font-semibold" style={{ color: t.text.secondary }}>
                {avgTempo != null ? `${avgTempo.toFixed(1)}d` : '—'}
              </span>
            </p>
          </div>

          {/* Sort controls */}
          <div
            className="flex items-center overflow-hidden rounded-lg"
            style={{ border: `1px solid ${t.border.default}` }}
          >
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: sortBy === s.id ? t.accent.primary : t.bg.surface,
                  color:           sortBy === s.id ? '#FFFFFF' : t.text.secondary,
                  borderRight:     `1px solid ${t.border.default}`,
                }}
              >
                {s.id === 'volume' || s.id === 'tempo'
                  ? <ArrowUpDown className="h-3 w-3" />
                  : null}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div
          className="grid px-5 py-2 text-[10px] font-bold uppercase tracking-wide"
          style={{
            gridTemplateColumns: '2fr 3fr 80px 80px',
            borderBottom: DASH,
            color: t.text.muted,
          }}
        >
          <span>Fase</span>
          <span>Volume de operações</span>
          <span className="text-right">Qtd.</span>
          <span className="text-right">Tempo médio</span>
        </div>

        {/* Rows */}
        <div>
          {sorted.map((row, i) => {
            const barPct   = (row.total / maxTotal) * 100;
            const tc       = tempoColor(row.tempo);
            const isLast   = i === sorted.length - 1;

            return (
              <div
                key={row.fase}
                className="grid items-center gap-3 px-5 py-3"
                style={{
                  gridTemplateColumns: '2fr 3fr 80px 80px',
                  borderBottom: isLast ? 'none' : DASH,
                }}
              >
                {/* Phase name */}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium" style={{ color: t.text.primary }}>
                    {row.nome}
                  </p>
                  <p className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>
                    Fase {row.fase}
                  </p>
                </div>

                {/* Bar */}
                <div
                  className="h-5 overflow-hidden rounded-md"
                  style={{ backgroundColor: t.bg.elevated }}
                >
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width:           `${Math.max(barPct, 1)}%`,
                      backgroundColor: t.accent.primary,
                      opacity:         0.25 + (barPct / 100) * 0.65,
                    }}
                  />
                </div>

                {/* Count */}
                <p className="text-right text-xs font-semibold tabular-nums" style={{ color: t.text.primary }}>
                  {row.total.toLocaleString('pt-BR')}
                </p>

                {/* Avg days badge */}
                <div className="flex justify-end">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ backgroundColor: tc.bg, color: tc.text }}
                  >
                    {tc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-4 px-5 py-3 text-[10px]"
          style={{ borderTop: DASH, color: t.text.muted }}
        >
          <span className="font-medium">Tempo médio:</span>
          {[
            { bg: '#DCFCE7', text: '#16A34A', label: '< 7 dias'   },
            { bg: '#FEF9C3', text: '#CA8A04', label: '7 – 20 dias' },
            { bg: '#FFEDD5', text: '#EA580C', label: '20 – 40 dias'},
            { bg: '#FEE2E2', text: '#DC2626', label: '> 40 dias'  },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: item.bg, color: item.text }}
              >
                {item.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
