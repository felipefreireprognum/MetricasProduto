'use client';

import {
  ArrowUpRight, CheckCircle2, TrendingUp, Clock, User2,
  Database, ArrowUp, ArrowDown,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { EvolutionChart } from '@/components/features/EvolutionChart/EvolutionChart';
import { VariationTable } from '@/components/features/VariationTable/VariationTable';
import { MacroMilestones } from '@/components/features/MacroMilestones/MacroMilestones';
import { CompanyPerformance } from '@/components/features/CompanyPerformance/CompanyPerformance';
import type { EvolucaoMensal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Colors ────────────────────────────────────────────────────────────────────

const ACCENT = {
  iniciadas: '#3B82F6',
  concluidas: '#10B981',
  conversao:  '#F59E0B',
  fila:       '#8B5CF6',
  usuario:    '#06B6D4',
} as const;

// ── Delta helper ──────────────────────────────────────────────────────────────

function moDelta(vals: number[]): { raw: number; pct: number } {
  const last = vals[vals.length - 1] ?? 0;
  const prev = vals[vals.length - 2] ?? 0;
  const raw  = last - prev;
  const pct  = prev !== 0 ? (raw / Math.abs(prev)) * 100 : 0;
  return { raw, pct };
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:       string;
  value:       string | number;
  sub?:        string;
  icon:        React.ReactNode;
  accent:      string;
  tokens:      BankTokens;
  conversion?: number;
  spark?:      number[];
  delta?:      { raw: number; pct: number; higherGood?: boolean };
}

function KpiCard({ label, value, sub, icon, accent, tokens: t, conversion, spark, delta }: KpiCardProps) {
  const sparkData = spark?.map((v, i) => ({ i, v })) ?? [];
  const gradId    = `kpi-${label.replace(/\s/g, '')}`;

  const deltaColor = delta
    ? (delta.higherGood !== false ? delta.raw >= 0 : delta.raw <= 0)
      ? '#10B981'
      : '#EF4444'
    : null;
  const deltaUp = delta && delta.raw >= 0;

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        backgroundColor: t.bg.surface,
        border: `1px solid ${t.border.default}`,
        borderTop: `3px solid ${accent}`,
        gap: spark ? '6px' : '10px',
      }}
    >
      {/* Label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight" style={{ color: t.text.muted }}>
          {label}
        </p>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          {icon}
        </span>
      </div>

      {/* Value */}
      <p className="truncate text-2xl font-black leading-none tracking-tight" style={{ color: t.text.primary }}>
        {value}
      </p>

      {/* Progress bar (conversion only) */}
      {conversion !== undefined && (
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.bg.elevated }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(Math.max(conversion, 0), 100)}%`, backgroundColor: accent }}
          />
        </div>
      )}

      {/* Delta */}
      {delta && (
        <div className="flex items-center gap-1 text-[10px]">
          <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: deltaColor! }}>
            {deltaUp
              ? <ArrowUp className="h-2.5 w-2.5" />
              : <ArrowDown className="h-2.5 w-2.5" />}
            {Math.abs(delta.pct).toFixed(1)}%
          </span>
          <span style={{ color: t.text.muted }}>vs mês ant.</span>
        </div>
      )}

      {/* Sub-text (when no delta) */}
      {sub && !delta && (
        <p className="truncate text-[11px] leading-snug" style={{ color: t.text.muted }}>
          {sub}
        </p>
      )}

      {/* Sparkline */}
      {spark && spark.length > 1 && (
        <div className="h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accent}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

function fmt(v: string | number): string {
  if (v === '—') return '—';
  return typeof v === 'number' ? v.toLocaleString('pt-BR') : v;
}

export default function DashboardScreen() {
  const { dataC6, dataInter, dataGlobal, loading, hasData, fromCache, lastUpdated } = useDashboardScreen();
  const { tokens: t, bancosStatus } = useAuth();

  const semDados = !loading && !hasData;
  const kpis     = dataGlobal?.kpis;
  const evol     = dataGlobal?.evolucaoMensal ?? [];

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: t.bg.base }}>
      <div className="p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: t.text.primary }}>Visão Geral</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm" style={{ color: t.text.muted }}>
              {lastUpdated ?? 'Dados consolidados de todos os bancos'}
            </p>
            {fromCache && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}
              >
                cache local
              </span>
            )}
            {bancosStatus.length > 0 && (
              <div className="flex items-center gap-1.5">
                {bancosStatus.map(({ banco, conectado }) => (
                  <span
                    key={banco.id}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: conectado ? '#10B98115' : '#EF444415',
                      color: conectado ? '#10B981' : '#EF4444',
                      border: `1px solid ${conectado ? '#10B98130' : '#EF444430'}`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: conectado ? '#10B981' : '#EF4444' }} />
                    {banco.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

{loading ? (
          <LoadingState message="Carregando dados dos bancos..." tokens={t} />
        ) : semDados ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              <Database size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Nenhum dado encontrado</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Verifique se os bancos estão acessíveis</p>
            <p className="mt-3 text-xs" style={{ color: t.text.muted }}>Use o botão Atualizar ao lado de cada banco no topo</p>
          </div>
        ) : (
          <>
            {/* KPI row — 5 cards with sparklines */}
            <div className="mb-5 grid grid-cols-5 gap-4">
              <KpiCard
                label="Operações Iniciadas"
                value={kpis ? fmt(kpis.operacoesIniciadas) : '—'}
                icon={<ArrowUpRight size={14} />}
                accent={ACCENT.iniciadas}
                tokens={t}
                spark={evol.map((d: EvolucaoMensal) => d.iniciadas)}
                delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.iniciadas)), higherGood: true } : undefined}
              />
              <KpiCard
                label="Operações Concluídas"
                value={kpis ? fmt(kpis.operacoesConcluidas) : '—'}
                icon={<CheckCircle2 size={14} />}
                accent={ACCENT.concluidas}
                tokens={t}
                spark={evol.map((d: EvolucaoMensal) => d.concluidas)}
                delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.concluidas)), higherGood: true } : undefined}
              />
              <KpiCard
                label="Taxa de Conversão"
                value={kpis ? `${kpis.taxaConversao.toFixed(1)}%` : '—'}
                icon={<TrendingUp size={14} />}
                accent={ACCENT.conversao}
                tokens={t}
                conversion={kpis?.taxaConversao}
                spark={evol.map((d: EvolucaoMensal) => d.taxaConversao)}
                delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.taxaConversao)), higherGood: true } : undefined}
              />
              <KpiCard
                label="Operações em Fila"
                value={kpis ? fmt(kpis.operacoesEmFila) : '—'}
                icon={<Clock size={14} />}
                accent={ACCENT.fila}
                tokens={t}
                spark={evol.map((d: EvolucaoMensal) => d.emFila)}
                delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.emFila)), higherGood: false } : undefined}
              />
              <KpiCard
                label="Usuário Mais Ativo"
                value={kpis?.topUsuario ?? '—'}
                sub={dataGlobal?.topUsuarios[0] ? `${fmt(dataGlobal.topUsuarios[0].total)} registros` : undefined}
                icon={<User2 size={14} />}
                accent={ACCENT.usuario}
                tokens={t}
              />
            </div>

            {/* Evolution (2/3) + Variation table (1/3) */}
            {evol.length > 0 && (
              <div className="mb-5 grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <EvolutionChart data={evol} tokens={t} />
                </div>
                <div>
                  <VariationTable data={evol} tokens={t} />
                </div>
              </div>
            )}

            {/* Macro milestones (2/3) + Company performance (1/3) */}
            {dataGlobal && dataGlobal.operacoesPorFase.length > 0 && (
              <div className="mb-5 grid grid-cols-3 items-stretch gap-4">
                <div className="col-span-2 flex flex-col">
                  <MacroMilestones
                    fases={dataGlobal.operacoesPorFase}
                    tempos={dataGlobal.tempoMedioPorFase}
                    tokens={t}
                  />
                </div>
                <div className="flex flex-col">
                  <CompanyPerformance dataC6={dataC6} dataInter={dataInter} tokens={t} />
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
