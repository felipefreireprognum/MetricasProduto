'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Calendar, Award, LineChart as LineChartIcon, Timer,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, AreaChart, Area, Bar, Line,
  LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
import type { EvolucaoMensal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  iniciadas:  '#3B82F6',
  concluidas: '#10B981',
  canceladas: '#EF4444',
  conversao:  '#F59E0B',
  tempo:      '#8B5CF6',
} as const;

// ── Trend calculation ─────────────────────────────────────────────────────────

function trend3(vals: number[]): { dir: 'up' | 'down' | 'flat'; pct: number } {
  if (vals.length < 4) return { dir: 'flat', pct: 0 };
  const recent = vals.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const before = vals.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.max(vals.slice(-6, -3).length, 1);
  if (before === 0) return { dir: 'flat', pct: 0 };
  const pct = ((recent - before) / before) * 100;
  return { dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat', pct };
}

function bestMonth(data: EvolucaoMensal[], key: keyof EvolucaoMensal): EvolucaoMensal | null {
  if (!data.length) return null;
  return data.reduce((best, d) => {
    const a = (d[key] as number) ?? 0;
    const b = (best[key] as number) ?? 0;
    return a > b ? d : best;
  });
}

// ── Insight Card ──────────────────────────────────────────────────────────────

function InsightCard({ icon, color, title, value, sub, tokens: t }: {
  icon:   React.ReactNode;
  color:  string;
  title:  string;
  value:  string;
  sub?:   string;
  tokens: BankTokens;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, borderLeft: `3px solid ${color}` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>{title}</p>
        <p className="text-lg font-black leading-tight" style={{ color: t.text.primary }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const MAP: Record<string, { label: string; color: string }> = {
    iniciadas:      { label: 'Iniciadas',  color: C.iniciadas  },
    concluidas:     { label: 'Concluídas', color: C.concluidas },
    canceladas:     { label: 'Canceladas', color: C.canceladas },
    taxaConversao:  { label: 'Conversão',  color: C.conversao  },
  };
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', minWidth: 190 }}>
      <p className="mb-2 font-bold text-[#0F172A]">{label}</p>
      {(payload as any[]).map((e: any) => {
        const m = MAP[e.dataKey];
        if (!m) return null;
        const val = e.dataKey === 'taxaConversao'
          ? `${Number(e.value).toFixed(1)}%`
          : Number(e.value).toLocaleString('pt-BR');
        return (
          <div key={e.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="flex-1 text-[#475569]">{m.label}</span>
            <span className="font-semibold text-[#0F172A]">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', minWidth: 160 }}>
      <p className="mb-1.5 font-bold text-[#0F172A]">{label}</p>
      {(payload as any[]).map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color ?? e.fill }} />
          <span className="font-semibold text-[#0F172A]">{formatter ? formatter(e.value) : e.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart: Volume ─────────────────────────────────────────────────────────────

function VolumeChart({ data, tokens: t, dimensao = 'operacoes' }: { data: EvolucaoMensal[]; tokens: BankTokens; dimensao?: 'operacoes' | 'cpf' }) {
  const isCpf = dimensao === 'cpf';
  const barKey   = isCpf ? 'iniciadasCpf' : 'iniciadas';
  const lineKey  = isCpf ? 'concluidasCpf' : 'concluidas';
  const convKey  = isCpf ? 'taxaConversaoCpf' : 'taxaConversao';
  const rightMax = Math.ceil(Math.max(...data.map(d => (isCpf ? (d.taxaConversaoCpf ?? 0) : d.taxaConversao)), 0) * 1.5) || 10;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="mb-1">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          Volume mensal {isCpf ? 'por Pessoa (CPF)' : 'do funil'}
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>
          {isCpf
            ? 'Pessoas únicas (barras) · Concluídas (linha) · Conversão por pessoa % (eixo direito)'
            : 'Iniciadas (barras) · Concluídas e Canceladas (linhas) · Conversão % (eixo direito)'}
        </p>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px]" style={{ color: t.text.muted }}>
        {(isCpf ? [
          { color: C.iniciadas,  label: 'Pessoas únicas', shape: 'bar'  },
          { color: C.concluidas, label: 'Concluídas',     shape: 'line' },
          { color: C.conversao,  label: 'Conversão %',    shape: 'dash' },
        ] : [
          { color: C.iniciadas,  label: 'Iniciadas',   shape: 'bar'  },
          { color: C.concluidas, label: 'Concluídas',  shape: 'line' },
          { color: C.canceladas, label: 'Canceladas',  shape: 'line' },
          { color: C.conversao,  label: 'Conversão %', shape: 'dash' },
        ] as const).map(({ color, label, shape }) => (
          <span key={label} className="flex items-center gap-1.5">
            {shape === 'bar'
              ? <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              : shape === 'dash'
              ? <span className="inline-block h-[2px] w-4 rounded-full" style={{ borderTop: `2px dashed ${color}` }} />
              : <span className="inline-block h-[2px] w-4 rounded-full" style={{ backgroundColor: color }} />
            }
            {label}
          </span>
        ))}
      </div>

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke={t.border.default} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false} width={50}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false}
              tickLine={false} domain={[0, rightMax]} width={38} tickFormatter={v => `${v}%`} />
            <Tooltip content={<VolumeTooltip />} />
            <Bar yAxisId="left" dataKey={barKey} fill={C.iniciadas} fillOpacity={0.8} radius={[3,3,0,0]} maxBarSize={36} />
            <Line yAxisId="left" type="monotone" dataKey={lineKey} stroke={C.concluidas} strokeWidth={2}
              dot={{ r: 3, fill: C.concluidas, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            {!isCpf && (
              <Line yAxisId="left" type="monotone" dataKey="canceladas" stroke={C.canceladas} strokeWidth={2}
                dot={{ r: 3, fill: C.canceladas, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
            )}
            <Line yAxisId="right" type="monotone" dataKey={convKey} stroke={C.conversao} strokeWidth={1.5}
              strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Chart: Conversão ──────────────────────────────────────────────────────────

function ConversaoChart({ data, tokens: t, dimensao = 'operacoes' }: { data: EvolucaoMensal[]; tokens: BankTokens; dimensao?: 'operacoes' | 'cpf' }) {
  const isCpf = dimensao === 'cpf';
  const convKey = isCpf ? 'taxaConversaoCpf' : 'taxaConversao';
  const vals = data.map(d => isCpf ? (d.taxaConversaoCpf ?? 0) : d.taxaConversao);
  const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
  const max = Math.ceil(Math.max(...vals) * 1.4) || 10;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <h3 className="text-sm font-semibold mb-0.5" style={{ color: t.text.primary }}>
        Taxa de conversão {isCpf ? 'por Pessoa' : ''}
      </h3>
      <p className="text-[11px] mb-4" style={{ color: t.text.muted }}>
        Média do período: <strong style={{ color: C.conversao }}>{avg.toFixed(2)}%</strong>
      </p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.conversao} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.conversao} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.border.default} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false}
              domain={[0, max]} width={38} tickFormatter={v => `${v}%`} />
            <Tooltip content={<SimpleTooltip formatter={(v: number) => `${v.toFixed(2)}%`} />} />
            <ReferenceLine y={avg} stroke={C.conversao} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
            <Area type="monotone" dataKey={convKey} stroke={C.conversao} strokeWidth={2.5}
              fill="url(#convGrad)" dot={{ r: 3, fill: C.conversao, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Chart: Tempo médio ────────────────────────────────────────────────────────

function TempoChart({ data, tokens: t }: { data: EvolucaoMensal[]; tokens: BankTokens }) {
  const filtered = data.filter(d => d.tempoMedio != null);
  if (!filtered.length) return (
    <div className="rounded-xl p-5 flex items-center justify-center" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <p className="text-xs" style={{ color: t.text.muted }}>Dados de tempo insuficientes</p>
    </div>
  );
  const avg = filtered.reduce((s, d) => s + (d.tempoMedio ?? 0), 0) / filtered.length;
  const max = Math.ceil(Math.max(...filtered.map(d => d.tempoMedio ?? 0)) * 1.3) || 30;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <h3 className="text-sm font-semibold mb-0.5" style={{ color: t.text.primary }}>Tempo médio por mês</h3>
      <p className="text-[11px] mb-4" style={{ color: t.text.muted }}>
        Média do período: <strong style={{ color: C.tempo }}>{avg.toFixed(1)}d</strong>
        <span className="ml-2 text-[10px]" style={{ color: t.text.muted }}>— linha = média</span>
      </p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="tempoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.tempo} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.tempo} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.border.default} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false}
              domain={[0, max]} width={38} tickFormatter={v => `${v}d`} />
            <Tooltip content={<SimpleTooltip formatter={(v: number) => `${v.toFixed(1)}d`} />} />
            <ReferenceLine y={avg} stroke={C.tempo} strokeDasharray="4 3" strokeOpacity={0.6} strokeWidth={1.5} />
            <Area type="monotone" dataKey="tempoMedio" stroke={C.tempo} strokeWidth={2.5}
              fill="url(#tempoGrad)" dot={{ r: 3, fill: C.tempo, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TendenciasScreen() {
  const { dataGlobal, loading, lastUpdated, fromCache } = useDashboardScreen();
  const { tokens: t } = useAuth();
  const { dimensao } = useFilters();
  const [scrolled, setScrolled] = useState(false);

  const semDados = !loading && !dataGlobal;
  const evol = dataGlobal?.evolucaoMensal ?? [];
  const isCpf = dimensao === 'cpf';

  // Insight computations (switch to CPF fields when dimensao === 'cpf')
  const volTrend  = trend3(evol.map(d => isCpf ? (d.iniciadasCpf ?? 0) : d.iniciadas));
  const convTrend = trend3(evol.map(d => isCpf ? (d.taxaConversaoCpf ?? 0) : d.taxaConversao));
  const bestConv  = bestMonth(evol, isCpf ? 'taxaConversaoCpf' : 'taxaConversao');
  const bestVol   = bestMonth(evol, isCpf ? 'iniciadasCpf' : 'iniciadas');

  const TrendIcon = ({ dir, good }: { dir: 'up'|'down'|'flat'; good: boolean }) => {
    if (dir === 'flat') return <Minus size={16} style={{ color: '#94A3B8' }} />;
    const color = (dir === 'up') === good ? '#10B981' : '#EF4444';
    return dir === 'up'
      ? <TrendingUp size={16} style={{ color }} />
      : <TrendingDown size={16} style={{ color }} />;
  };

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: t.bg.base }}
      onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
    >
      <PageHeaderBar
        title="Tendências"
        icon={<LineChartIcon size={20} style={{ color: t.accent.primary }} />}
        description={lastUpdated ?? 'Evolução mensal do funil — volume, conversão e tempo'}
        scrolled={scrolled}
        tokens={t}
        badges={fromCache && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}>
            cache local
          </span>
        )}
      />

      <div className="px-6 pb-6">
        {loading ? (
          <LoadingState message="Carregando tendências..." tokens={t} />
        ) : semDados ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
              <LineChartIcon size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Nenhum dado encontrado</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Acesse Fontes e clique em Atualizar</p>
          </div>
        ) : evol.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Sem dados de evolução mensal</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Expanda o histórico em Fontes para ver tendências</p>
          </div>
        ) : (
          <>
            {/* Insight cards */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <InsightCard
                icon={<Calendar size={16} style={{ color: C.iniciadas }} />}
                color={C.iniciadas}
                title="Meses de histórico"
                value={`${evol.length}`}
                sub={`${evol[0]?.label} → ${evol[evol.length - 1]?.label}`}
                tokens={t}
              />
              <InsightCard
                icon={<Award size={16} style={{ color: C.conversao }} />}
                color={C.conversao}
                title="Melhor conversão"
                value={bestConv ? `${((isCpf ? bestConv.taxaConversaoCpf : bestConv.taxaConversao) ?? 0).toFixed(2)}%` : '—'}
                sub={bestConv?.label}
                tokens={t}
              />
              <InsightCard
                icon={<TrendIcon dir={volTrend.dir} good={true} />}
                color={volTrend.dir === 'up' ? '#10B981' : volTrend.dir === 'down' ? '#EF4444' : '#94A3B8'}
                title="Tendência de volume"
                value={volTrend.dir === 'flat' ? 'Estável' : `${volTrend.dir === 'up' ? '+' : ''}${volTrend.pct.toFixed(1)}%`}
                sub="últimos 3 vs 3 anteriores"
                tokens={t}
              />
              <InsightCard
                icon={<TrendIcon dir={convTrend.dir} good={true} />}
                color={convTrend.dir === 'up' ? '#10B981' : convTrend.dir === 'down' ? '#EF4444' : '#94A3B8'}
                title="Tendência de conversão"
                value={convTrend.dir === 'flat' ? 'Estável' : `${convTrend.dir === 'up' ? '+' : ''}${convTrend.pct.toFixed(1)}%`}
                sub="últimos 3 vs 3 anteriores"
                tokens={t}
              />
            </div>

            {/* Main volume chart */}
            <div className="mb-5">
              <VolumeChart data={evol} tokens={t} dimensao={dimensao} />
            </div>

            {/* Conversão + Tempo */}
            <div className="grid grid-cols-2 gap-5">
              <ConversaoChart data={evol} tokens={t} dimensao={dimensao} />
              <TempoChart data={evol} tokens={t} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
