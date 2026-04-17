'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TempoFase } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import Card from '@/components/ui/Card';

interface Props {
  data: TempoFase[];
}

export default function TempoMedioFaseChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.tempoMedioPorFase}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} />
          <YAxis dataKey="fase" type="category" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v) => [`${v} dias`, 'Tempo médio']} />
          <Bar dataKey="tempoMedioDias" fill="#FFD93D" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
