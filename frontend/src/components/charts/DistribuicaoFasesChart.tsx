'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FaseCount } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme/colors';
import Card from '@/components/ui/Card';

interface Props {
  data: FaseCount[];
}

export default function DistribuicaoFasesChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.distribuicaoFases}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="fase" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={colors.chart[i % colors.chart.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v, _, p) => [v, `Fase ${p.payload.fase}`]} />
          <Legend formatter={(value) => `Fase ${value}`} iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
