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
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} />
          <YAxis dataKey="usuario" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={80} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Bar dataKey="total" fill="#22C55E" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
