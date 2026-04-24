'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { BankTokens } from '@/theme/tokens';
import type { TempoFaseComparado } from '@/utils/mappers/comparisonMapper';
import { C6_COLOR, INTER_COLOR } from '@/utils/mappers/comparisonMapper';

interface Props {
  data: TempoFaseComparado[];
  tokens: BankTokens;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg text-sm min-w-[200px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2">{label}</p>
      {payload.map((p: any) => (
        p.value != null && (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-[#475569]">{p.name}</span>
            <span className="ml-auto font-bold text-[#0F172A]">{p.value} dias</span>
          </div>
        )
      ))}
    </div>
  );
}

export default function TempoMedioFaseChart({ data, tokens: t }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl p-5 flex h-[320px] items-center justify-center text-sm"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, color: t.text.muted }}>
        Sem dados de tempo entre fases
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <p className="mb-1 text-sm font-semibold" style={{ color: t.text.primary }}>Tempo Médio por Fase</p>
      <p className="mb-4 text-xs" style={{ color: t.text.muted }}>Dias médios em cada fase — comparativo entre bancos</p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} vertical={false} />
          <XAxis dataKey="nome" tick={{ fontSize: 11, fill: t.text.secondary, fontWeight: 600 }}
            tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={130} />
          <YAxis tick={{ fontSize: 11, fill: t.text.muted }} tickLine={false} axisLine={false} unit=" d" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F9FC', radius: 4 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="c6" name="C6 Bank" fill={C6_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="inter" name="Inter" fill={INTER_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
