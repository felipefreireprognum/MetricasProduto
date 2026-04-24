'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { BankTokens } from '@/theme/tokens';
import type { VolumeComparado } from '@/utils/mappers/comparisonMapper';
import { C6_COLOR, INTER_COLOR } from '@/utils/mappers/comparisonMapper';

interface Props { data: VolumeComparado[]; tokens: BankTokens; }

export default function VolumePorDataChart({ data, tokens: t }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <p className="mb-1 text-sm font-semibold" style={{ color: t.text.primary }}>Volume de Entradas por Data</p>
      <p className="mb-4 text-xs" style={{ color: t.text.muted }}>Registros de fase ao longo do tempo</p>
      {data.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm" style={{ color: t.text.muted }}>Sem dados de data disponíveis</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradC6" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C6_COLOR} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C6_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradInter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INTER_COLOR} stopOpacity={0.2} />
                <stop offset="95%" stopColor={INTER_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} />
            <XAxis dataKey="data" tick={{ fontSize: 11, fill: t.text.muted }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: t.text.muted }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${t.border.default}`, backgroundColor: t.bg.elevated, color: t.text.primary, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="c6" name="C6 Bank" stroke={C6_COLOR} strokeWidth={2} fill="url(#gradC6)" />
            <Area type="monotone" dataKey="inter" name="Inter" stroke={INTER_COLOR} strokeWidth={2} fill="url(#gradInter)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
