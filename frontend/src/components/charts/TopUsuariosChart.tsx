'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UsuarioData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import { C6_COLOR, INTER_COLOR } from '@/utils/mappers/comparisonMapper';

interface Props {
  topC6: UsuarioData[];
  topInter: UsuarioData[];
  tokens: BankTokens;
}

function RankingBar({ data, color, label, tokens: t }: { data: UsuarioData[]; color: string; label: string; tokens: BankTokens }) {
  return (
    <div className="rounded-xl p-5 flex-1 min-w-0" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Top Usuários — {label}</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm" style={{ color: t.text.muted }}>
          Banco indisponível
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: t.text.muted }} tickLine={false} axisLine={false} />
            <YAxis dataKey="usuario" type="category" tick={{ fontSize: 11, fill: t.text.secondary }}
              tickLine={false} axisLine={false} width={90}
              tickFormatter={(v) => (v.length > 12 ? `${v.substring(0, 12)}…` : v)} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${t.border.default}`, fontSize: 12 }}
              formatter={(v) => [v, 'Registros']} />
            <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function TopUsuariosChart({ topC6, topInter, tokens: t }: Props) {
  return (
    <div className="flex gap-4">
      <RankingBar data={topC6} color={C6_COLOR} label="C6 Bank" tokens={t} />
      <RankingBar data={topInter} color={INTER_COLOR} label="Inter" tokens={t} />
    </div>
  );
}
