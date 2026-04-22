'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { FaseCount } from '@/types/dashboard';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme/colors';
import Card from '@/components/ui/Card';

interface Props {
  data: FaseCount[];
}

const RADIAN = Math.PI / 180;
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function DistribuicaoFasesChart({ data }: Props) {
  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-[#0F172A]">{STRINGS.dashboard.charts.distribuicaoFases}</p>
      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-[#94A3B8]">
          Sem dados de fase disponíveis
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                cx="50%"
                cy="50%"
                outerRadius={90}
                labelLine={false}
                label={renderLabel}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors.chart[i % colors.chart.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                formatter={(v, _, p) => [v, p.payload.nome]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda abaixo em grid */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {data.map((d, i) => (
              <div key={d.fase} className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors.chart[i % colors.chart.length] }} />
                <span className="text-[#475569]">{d.nome}</span>
                <span className="font-medium text-[#0F172A]">{d.total}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
