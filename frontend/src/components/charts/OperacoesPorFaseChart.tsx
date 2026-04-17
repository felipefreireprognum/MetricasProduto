'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { FaseCount } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import Card from '@/components/ui/Card';

interface Props {
  data: FaseCount[];
}

export default function OperacoesPorFaseChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.operacoesPorFase}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="fase" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Bar dataKey="total" fill="#1A5FFF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
