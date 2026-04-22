'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { TempoFase } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import { STRINGS } from '@/constants/strings';

interface Props {
  data: TempoFase[];
  tokens: BankTokens;
}

function barColor(dias: number, media: number, t: BankTokens) {
  if (dias > media * 1.5) return t.kpi.danger;
  if (dias > media) return t.kpi.warning;
  return t.chart[0];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: TempoFase = payload[0].payload;
  const cor = payload[0].fill;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">Fase {d.fase}</p>
      <p className="font-semibold text-[#0F172A] mb-2 leading-snug">{d.nome}</p>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: cor }} />
        <span className="text-[#475569]">Tempo médio</span>
        <span className="ml-auto font-bold text-[#0F172A]">{d.tempoMedioDias} dias</span>
      </div>
    </div>
  );
}

export default function TempoMedioFaseChart({ data, tokens: t }: Props) {
  const media = data.length ? data.reduce((s, d) => s + d.tempoMedioDias, 0) / data.length : 0;

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: t.text.primary }}>{STRINGS.dashboard.charts.tempoMedioPorFase}</p>
          <p className="text-xs mt-0.5" style={{ color: t.text.muted }}>
            Vermelho = crítico (1,5× média) · Amarelo = acima da média
          </p>
        </div>
        {media > 0 && (
          <span className="text-xs font-medium rounded px-2 py-1" style={{ backgroundColor: t.bg.elevated, color: t.text.secondary, border: `1px solid ${t.border.default}` }}>
            Média: {media.toFixed(1)} dias
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm" style={{ color: t.text.muted }}>
          Sem dados de tempo entre fases
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border.subtle} vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: t.text.secondary, fontWeight: 600 }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={130} />
            <YAxis tick={{ fontSize: 11, fill: t.text.muted }} tickLine={false} axisLine={false} unit=" d" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F9FC', radius: 4 }} />
            <ReferenceLine y={media} stroke={t.text.muted} strokeDasharray="4 4" label={{ value: `Média ${media.toFixed(0)}d`, position: 'insideTopRight', fontSize: 10, fill: t.text.muted }} />
            <Bar dataKey="tempoMedioDias" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((d, i) => (
                <Cell key={i} fill={barColor(d.tempoMedioDias, media, t)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 flex gap-4 text-xs" style={{ color: t.text.muted }}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: t.chart[0] }} />Abaixo da média</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: t.kpi.warning }} />Acima da média</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: t.kpi.danger }} />Crítico (1,5×)</span>
      </div>
    </div>
  );
}
