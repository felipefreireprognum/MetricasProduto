'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { VolumeData } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import Card from '@/components/ui/Card';

interface Props {
  data: VolumeData[];
}

export default function VolumePorDataChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.volumePorData}</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A5FFF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1A5FFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Area type="monotone" dataKey="total" stroke="#1A5FFF" strokeWidth={2} fill="url(#colorVolume)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
