'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { FaseCount } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import { STRINGS } from '@/constants/strings';

interface Props { data: FaseCount[]; tokens: BankTokens; }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: FaseCount = payload[0].payload;
  const cor = payload[0].fill;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">Fase {d.fase}</p>
      <p className="font-semibold text-[#0F172A] mb-2 leading-snug">{d.nome}</p>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
        <span className="text-[#475569]">Registros</span>
        <span className="ml-auto font-bold text-[#0F172A]">{d.total.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}

export default function OperacoesPorFaseChart({ data, tokens: t }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <p className="mb-4 text-sm font-semibold" style={{ color: t.text.primary }}>{STRINGS.dashboard.charts.operacoesPorFase}</p>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm" style={{ color: t.text.muted }}>Sem dados de fase</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: t.text.secondary, fontWeight: 600 }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={130} />
            <YAxis tick={{ fontSize: 12, fill: t.text.muted }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F9FC', radius: 4 }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => <Cell key={i} fill={t.chart[i % t.chart.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
