'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UsuarioData } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import Card from '@/components/ui/Card';

interface Props {
  data: UsuarioData[];
}

export default function TopUsuariosChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.topUsuarios}</p>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[#94A3B8]">
          Sem dados de usuário disponíveis
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="usuario"
              type="category"
              tick={{ fontSize: 11, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              width={90}
              tickFormatter={(v) => (v.length > 12 ? `${v.substring(0, 12)}…` : v)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(v) => [v, 'Registros']}
            />
            <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
