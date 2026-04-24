'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { BankTokens } from '@/theme/tokens';
import type { FaseComparada } from '@/utils/mappers/comparisonMapper';
import { C6_COLOR, INTER_COLOR } from '@/utils/mappers/comparisonMapper';

interface Props { data: FaseComparada[]; tokens: BankTokens; }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <p className="font-semibold text-[#0F172A] mb-2 leading-snug">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-[#475569]">{p.name}</span>
          <span className="ml-auto font-bold text-[#0F172A]">{(p.value as number).toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}

export default function OperacoesPorFaseChart({ data, tokens: t }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <p className="mb-1 text-sm font-semibold" style={{ color: t.text.primary }}>Operações por Fase</p>
      <p className="mb-4 text-xs" style={{ color: t.text.muted }}>Total de registros em cada fase</p>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm" style={{ color: t.text.muted }}>Sem dados de fase</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: t.text.secondary, fontWeight: 600 }}
              tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={130} />
            <YAxis tick={{ fontSize: 12, fill: t.text.muted }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F9FC', radius: 4 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="c6" name="C6 Bank" fill={C6_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="inter" name="Inter" fill={INTER_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
