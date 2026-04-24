'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, Check } from 'lucide-react';
import { BANKS } from '@/constants/banks';
import type { DashboardData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'ops' | 'conv' | 'tempo' | 'abandono';

interface EmpresaRow {
  id:       string;
  nome:     string;
  initials: string;
  color:    string;
  ops:      number;
  conv:     number;
  tempo:    number | null;
  abandono: number;
}

interface Props {
  dataC6:    DashboardData | null;
  dataInter: DashboardData | null;
  tokens:    BankTokens;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRow(
  id: string, nome: string, initials: string, color: string,
  data: DashboardData,
): EmpresaRow {
  const k = data.kpis;
  return {
    id, nome, initials, color,
    ops:      k.operacoesIniciadas,
    conv:     k.taxaConversao,
    tempo:    k.tempoMedioTotal,
    abandono: k.operacoesIniciadas > 0
      ? (k.operacoesCanceladas / k.operacoesIniciadas) * 100
      : 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'conv',     label: 'Conversão (%)' },
  { id: 'ops',      label: 'Operações iniciadas' },
  { id: 'tempo',    label: 'Tempo médio' },
  { id: 'abandono', label: 'Taxa de abandono' },
];

export function CompanyPerformance({ dataC6, dataInter, tokens: t }: Props) {
  const [sortBy, setSortBy]     = useState<SortKey>('conv');
  const [sortOpen, setSortOpen] = useState(false);

  const bankColor = (id: string) => BANKS.find((b) => b.id === id)?.colors.bg ?? '#64748B';

  const rows: EmpresaRow[] = [
    dataC6    && toRow('c6',    'C6 Bank', 'C6', bankColor('c6'),    dataC6),
    dataInter && toRow('inter', 'Inter',   'IN', bankColor('inter'), dataInter),
  ].filter(Boolean) as EmpresaRow[];

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'ops')      return b.ops - a.ops;
    if (sortBy === 'conv')     return b.conv - a.conv;
    if (sortBy === 'tempo')    return (b.tempo ?? 0) - (a.tempo ?? 0);
    return b.abandono - a.abandono;
  });

  const DASH       = `1px dashed ${t.border.default}`;
  const sortLabel  = SORT_OPTIONS.find((o) => o.id === sortBy)!.label;

  if (!sorted.length) return null;

  return (
    <div
      className="flex h-full flex-col rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          Desempenho por empresa{' '}
          <span className="font-normal" style={{ color: t.text.muted }}>(resumo)</span>
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: t.text.muted }}>Ordenar por</span>
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ borderColor: t.border.default, backgroundColor: t.bg.surface, color: t.text.primary }}
            >
              {sortLabel}
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ color: t.text.muted, transform: sortOpen ? 'rotate(180deg)' : '' }}
              />
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg py-1 shadow-lg"
                  style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
                >
                  {SORT_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setSortBy(id); setSortOpen(false); }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#F8F9FC]"
                      style={{ color: t.text.primary }}
                    >
                      {label}
                      {sortBy === id && <Check className="h-3 w-3" style={{ color: t.accent.primary }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: DASH }}>
            {(['Empresa', 'Operações iniciadas', 'Conversão (%)', 'Tempo médio (dias)', 'Taxa de abandono'] as const).map((col, i) => (
              <th
                key={col}
                className="pb-2 text-[11px] font-medium"
                style={{ color: t.text.muted, textAlign: i === 0 ? 'left' : 'right' }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((e, i) => (
            <tr
              key={e.id}
              style={{ borderBottom: i < sorted.length - 1 ? DASH : 'none' }}
            >
              {/* Empresa */}
              <td className="py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ backgroundColor: e.color }}
                  >
                    {e.initials}
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium" style={{ color: t.text.primary }}>
                    {e.nome}
                  </span>
                </div>
              </td>

              {/* Ops */}
              <td className="py-3 text-right text-sm tabular-nums" style={{ color: t.text.primary }}>
                {e.ops.toLocaleString('pt-BR')}
              </td>

              {/* Conv */}
              <td className="py-3 text-right text-sm tabular-nums" style={{ color: t.text.primary }}>
                {e.conv.toFixed(1)}%
              </td>

              {/* Tempo */}
              <td className="py-3 text-right text-sm tabular-nums" style={{ color: t.text.primary }}>
                {e.tempo != null ? e.tempo.toFixed(1) : '—'}
              </td>

              {/* Abandono */}
              <td className="py-3 text-right text-sm tabular-nums" style={{ color: t.text.primary }}>
                {e.abandono.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <button
        className="mt-3 flex w-full items-center justify-center gap-1.5 pt-3 text-xs font-medium transition-colors hover:underline"
        style={{ borderTop: `1px solid ${t.border.default}`, color: t.accent.primary }}
      >
        Ver análise por empresa
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
