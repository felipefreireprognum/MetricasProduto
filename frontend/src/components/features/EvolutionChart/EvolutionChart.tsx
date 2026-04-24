'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { EvolucaoMensal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Colors ────────────────────────────────────────────────────────────────────

const CLR = {
  iniciadas: '#3B82F6',
  conversao:  '#10B981',
  tempo:      '#8B5CF6',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type MetricaId = 'iniciadas' | 'conversao' | 'tempo';

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-xl"
      style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', minWidth: 180 }}
    >
      <p className="mb-2 font-bold text-[#0F172A]">{label}</p>
      {(payload as any[]).map((e: any) => {
        let val = '';
        if (e.name === 'taxaConversao') val = `${Number(e.value).toFixed(1)}%`;
        else if (e.name === 'tempoMedio') val = e.value != null ? `${Number(e.value).toFixed(1)}d` : '—';
        else val = Number(e.value).toLocaleString('pt-BR');

        const label2 =
          e.name === 'taxaConversao' ? 'Conversão' :
          e.name === 'tempoMedio'   ? 'Tempo médio' :
          'Iniciadas';

        return (
          <div key={e.name} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color ?? e.fill }} />
            <span className="flex-1 text-[#475569]">{label2}</span>
            <span className="font-semibold text-[#0F172A]">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: EvolucaoMensal[];
  tokens: BankTokens;
}

export function EvolutionChart({ data, tokens: t }: Props) {
  const [metrica, setMetrica]       = useState<MetricaId>('iniciadas');
  const [metricaOpen, setMetricaOpen] = useState(false);

  if (!data.length) return null;

  const METRICAS: { id: MetricaId; label: string }[] = [
    { id: 'iniciadas', label: 'Operações iniciadas' },
    { id: 'conversao', label: 'Conversão (%)' },
    { id: 'tempo',     label: 'Tempo médio (dias)' },
  ];
  const metricaLabel = METRICAS.find((m) => m.id === metrica)!.label;

  // Left-axis domain: based on selected primary metric
  const leftMax = (() => {
    const vals = data.map((d) =>
      metrica === 'iniciadas' ? d.iniciadas :
      metrica === 'conversao' ? d.taxaConversao :
      (d.tempoMedio ?? 0)
    );
    return Math.ceil(Math.max(...vals) * 1.3) || 10;
  })();

  // Right-axis domain: cover both conversão (0-100) and tempo
  const rightMax = Math.ceil(
    Math.max(100, ...data.map((d) => d.tempoMedio ?? 0)) * 1.2
  );

  // For bar key when primary metric changes
  const barDataKey =
    metrica === 'iniciadas' ? 'iniciadas' :
    metrica === 'conversao' ? 'taxaConversao' : 'tempoMedio';

  const barColor =
    metrica === 'iniciadas' ? CLR.iniciadas :
    metrica === 'conversao' ? CLR.conversao : CLR.tempo;

  return (
    <div
      className="flex h-full flex-col rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          Evolução mensal{' '}
          <span className="font-normal" style={{ color: t.text.muted }}>(consolidado)</span>
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: t.text.muted }}>Métrica principal</span>
          <div className="relative">
            <button
              onClick={() => setMetricaOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[#CBD5E1]"
              style={{ borderColor: t.border.default, backgroundColor: t.bg.surface, color: t.text.primary }}
            >
              {metricaLabel}
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ color: t.text.muted, transform: metricaOpen ? 'rotate(180deg)' : '' }}
              />
            </button>

            {metricaOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMetricaOpen(false)} />
                <div
                  className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg py-1 shadow-lg"
                  style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
                >
                  {METRICAS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setMetrica(id); setMetricaOpen(false); }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#F8F9FC]"
                      style={{ color: t.text.primary }}
                    >
                      {label}
                      {metrica === id && (
                        <Check className="h-3 w-3" style={{ color: t.accent.primary }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px]" style={{ color: t.text.muted }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CLR.iniciadas }} />
          Operações iniciadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-3 rounded-full" style={{ backgroundColor: CLR.conversao }} />
          Conversão (%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-3 rounded-full" style={{ backgroundColor: CLR.tempo }} />
          Tempo médio (dias)
        </span>
      </div>

      {/* Chart — flex-1 so it fills whatever height remains in the card */}
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke={t.border.default} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: t.text.muted as string }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: t.text.muted as string }}
              axisLine={false}
              tickLine={false}
              domain={[0, leftMax]}
              width={42}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: t.text.muted as string }}
              axisLine={false}
              tickLine={false}
              domain={[0, rightMax]}
              width={42}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              yAxisId="left"
              dataKey={barDataKey}
              fill={barColor}
              stroke="none"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            {metrica !== 'conversao' && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="taxaConversao"
                name="taxaConversao"
                stroke={CLR.conversao}
                strokeWidth={2}
                dot={{ r: 3, fill: CLR.conversao, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CLR.conversao, stroke: '#fff', strokeWidth: 2 }}
              />
            )}
            {metrica !== 'tempo' && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tempoMedio"
                name="tempoMedio"
                stroke={CLR.tempo}
                strokeWidth={2}
                dot={{ r: 3, fill: CLR.tempo, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CLR.tempo, stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Data table */}
      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${t.border.default}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="pb-1 text-left font-normal" style={{ color: t.text.muted, minWidth: 140 }} />
                {data.map((d) => (
                  <th key={d.mes} className="pb-1 text-right font-medium tabular-nums" style={{ color: t.text.secondary, minWidth: 60 }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                { clr: CLR.iniciadas, label: 'Operações iniciadas', fmt: (d: EvolucaoMensal) => d.iniciadas.toLocaleString('pt-BR') },
                { clr: CLR.conversao, label: 'Conversão (%)',       fmt: (d: EvolucaoMensal) => `${d.taxaConversao.toFixed(1)}%` },
                { clr: CLR.tempo,     label: 'Tempo médio (dias)',  fmt: (d: EvolucaoMensal) => d.tempoMedio != null ? d.tempoMedio.toFixed(1) : '—' },
              ] as const).map(({ clr, label, fmt }, idx, arr) => (
                <tr
                  key={label}
                  style={{ borderBottom: idx < arr.length - 1 ? `1px dashed ${t.border.default}` : 'none' }}
                >
                  <td className="py-1">
                    <span className="flex items-center gap-1.5" style={{ color: t.text.muted }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: clr }} />
                      {label}
                    </span>
                  </td>
                  {data.map((d) => (
                    <td key={d.mes} className="py-1 text-right tabular-nums" style={{ color: t.text.primary }}>
                      {fmt(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
