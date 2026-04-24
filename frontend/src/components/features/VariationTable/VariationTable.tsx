'use client';

import { ArrowUp, ArrowDown, Minus, ArrowRight } from 'lucide-react';
import type { EvolucaoMensal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MesComVar extends EvolucaoMensal {
  varIniciadas: number | null;
  varConversao: number | null;
  varTempo:     number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function withVariacoes(data: EvolucaoMensal[]): MesComVar[] {
  return data.map((d, i) => {
    const prev = data[i - 1];
    if (!prev) return { ...d, varIniciadas: null, varConversao: null, varTempo: null };
    return {
      ...d,
      varIniciadas:
        prev.iniciadas > 0
          ? Number((((d.iniciadas - prev.iniciadas) / prev.iniciadas) * 100).toFixed(1))
          : null,
      varConversao: Number((d.taxaConversao - prev.taxaConversao).toFixed(1)),
      varTempo:
        d.tempoMedio != null && prev.tempoMedio != null
          ? Number((d.tempoMedio - prev.tempoMedio).toFixed(1))
          : null,
    };
  });
}

// ── Value cells ───────────────────────────────────────────────────────────────

function CellIniciadas({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#CBD5E1' }}>—</span>;
  const good = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${good ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {good ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function CellConversao({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#CBD5E1' }}>—</span>;
  const good = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${good ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {good ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />}
      {Math.abs(value).toFixed(1)} p.p.
    </span>
  );
}

function CellTempo({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#CBD5E1' }}>—</span>;
  const improved = value < 0;
  const neutral  = Math.abs(value) < 0.5;
  const color    = neutral ? '#94A3B8' : improved ? '#10B981' : '#EF4444';
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums" style={{ color }}>
      {neutral
        ? <Minus className="h-3 w-3 shrink-0" />
        : improved
          ? <ArrowDown className="h-3 w-3 shrink-0" />
          : <ArrowUp className="h-3 w-3 shrink-0" />}
      {Math.abs(value).toFixed(1)}d
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: EvolucaoMensal[];
  tokens: BankTokens;
}

export function VariationTable({ data, tokens: t }: Props) {
  const rows = withVariacoes(data);

  const DASH = `1px dashed ${t.border.default}`;

  return (
    <div
      className="flex h-full flex-col rounded-xl p-4"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
        Variação vs período anterior
      </h3>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: t.text.muted }}>
        <span className="flex items-center gap-0.5">
          <ArrowUp className="h-2.5 w-2.5 text-[#10B981]" /> Melhorou
        </span>
        <span className="flex items-center gap-0.5">
          <ArrowDown className="h-2.5 w-2.5 text-[#EF4444]" /> Piorou
        </span>
        <span className="flex items-center gap-0.5">
          <Minus className="h-2.5 w-2.5" /> Estável
        </span>
      </div>

      {/* Table — guarantees column alignment */}
      <div className="mt-2 flex-1 overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: DASH }}>
              <th
                className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: t.text.muted }}
              />
              <th
                className="pb-1.5 text-right text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: '#10B981' }}
              >
                Iniciadas
              </th>
              <th
                className="pb-1.5 text-right text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: '#EF4444' }}
              >
                Conversão
              </th>
              <th
                className="pb-1.5 text-right text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: t.text.muted }}
              >
                Tempo
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.mes}
                style={{ borderBottom: i < rows.length - 1 ? DASH : 'none' }}
              >
                <td className="py-2 pr-2 font-medium" style={{ color: t.text.primary }}>
                  {r.label}
                </td>
                <td className="py-2 text-right">
                  <CellIniciadas value={r.varIniciadas} />
                </td>
                <td className="py-2 text-right">
                  <CellConversao value={r.varConversao} />
                </td>
                <td className="py-2 text-right">
                  <CellTempo value={r.varTempo} />
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center" style={{ color: t.text.muted }}>
                  Sem dados suficientes para variação
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <button
        className="mt-2 flex items-center justify-center gap-1.5 pt-2 text-xs font-medium transition-colors hover:underline"
        style={{ borderTop: `1px solid ${t.border.default}`, color: t.accent.primary }}
      >
        Ver detalhes da comparação
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
