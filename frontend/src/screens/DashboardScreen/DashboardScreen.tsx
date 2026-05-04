'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUpRight, CheckCircle2, TrendingUp, Clock, User2,
  Database, ArrowUp, ArrowDown, CalendarRange, X,
  Users, RefreshCw, UserPlus,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters, PERIODO_PRESETS } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { EvolutionChart } from '@/components/features/EvolutionChart/EvolutionChart';
import { VariationTable } from '@/components/features/VariationTable/VariationTable';
import { MacroPhaseBar } from '@/components/features/MacroPhaseBar/MacroPhaseBar';
import { CompanyPerformance } from '@/components/features/CompanyPerformance/CompanyPerformance';
import { DateFilterModal } from '@/components/features/DateFilterModal/DateFilterModal';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
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
  people?:     string;
}

function KpiCard({ label, value, sub, icon, accent, tokens: t, conversion, spark, delta, people }: KpiCardProps) {
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

      {/* Value + optional people badge */}
      <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
        <p className="min-w-0 shrink truncate text-2xl font-black leading-none tracking-tight" style={{ color: t.text.primary }}>
          {value}
        </p>
        {people && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{ backgroundColor: t.bg.elevated, color: t.text.muted }}
          >
            {people}
          </span>
        )}
      </div>

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
  const { periodoInicio, periodoFim, periodoLabel, setPeriodo, dimensao } = useFilters();

  const [scrolled, setScrolled]         = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const hasFilter = !!(periodoInicio || periodoFim);

  useEffect(() => {
    if (!dataGlobal) return;
    const totalOps   = dataGlobal.kpis.operacoesUnicas;
    const macros     = dataGlobal.macrofaseTotais ?? [];
    const simul      = macros.find(m => m.macrofase === 'Simulação')?.total ?? 0;
    const semSimul   = totalOps - simul;
    console.group('🔍 Diagnóstico de Funil');
    console.log('Total operações únicas (qualquer fase):', totalOps);
    console.log('Com registro em Simulação:', simul);
    console.log('SEM registro em Simulação:', semSimul, `(${((semSimul / totalOps) * 100).toFixed(1)}%)`);
    console.log('--- Primeira macrofase por operação (totais) ---');
    console.table(macros.sort((a, b) => b.total - a.total));
    console.groupEnd();
  }, [dataGlobal]);

  const semDados = !loading && !hasData;
  const kpis     = dataGlobal?.kpis;
  const evol     = dataGlobal?.evolucaoMensal ?? [];

  const dateRange = (() => {
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const fmtDay = (d: Date) =>
      `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;

    if (!dataGlobal) return null;
    const e = dataGlobal.evolucaoMensal;
    if (e.length > 0) {
      const [fy, fm] = e[0].mes.split('-').map(Number);
      const [ty, tm] = e[e.length - 1].mes.split('-').map(Number);
      return {
        from: fmtDay(new Date(fy, fm - 1, 1)),
        to:   fmtDay(new Date(ty, tm, 0)),      // dia 0 do mês seguinte = último dia
      };
    }
    const vols = [...dataGlobal.volumePorData].sort((a, b) => a.data.localeCompare(b.data));
    if (vols.length > 0) {
      const fmt = (s: string) => { const d = new Date(s + 'T12:00:00'); return isNaN(d.getTime()) ? s : fmtDay(d); };
      return { from: fmt(vols[0].data), to: fmt(vols[vols.length - 1].data) };
    }
    return null;
  })();

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: t.bg.base }}
      onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
    >
      <PageHeaderBar
        title="Visão Geral"
        description={lastUpdated ?? 'Dados consolidados de todos os bancos'}
        scrolled={scrolled}
        tokens={t}
        badges={
          <>
            {fromCache && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}
              >
                cache local
              </span>
            )}
            {bancosStatus.map(({ banco, conectado }) => (
              <span
                key={banco.id}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: conectado ? '#10B98115' : '#EF444415',
                  color:           conectado ? '#10B981'   : '#EF4444',
                  border:          `1px solid ${conectado ? '#10B98130' : '#EF444430'}`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: conectado ? '#10B981' : '#EF4444' }} />
                {banco.name}
              </span>
            ))}
          </>
        }
        right={
          <div className="flex items-center gap-2">
            {/* Date filter button */}
            <button
              onClick={() => setShowDateModal(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all hover:opacity-80"
              style={{
                backgroundColor: hasFilter ? `${t.accent.primary}10` : t.bg.surface,
                border: `1px solid ${hasFilter ? t.accent.primary + '50' : t.border.default}`,
              }}
            >
              <CalendarRange size={13} style={{ color: hasFilter ? t.accent.primary : t.text.muted }} />
              {hasFilter ? (
                <span className="text-xs font-medium tabular-nums" style={{ color: t.accent.primary }}>
                  {periodoLabel}
                </span>
              ) : dateRange ? (
                <>
                  <span className="text-[10px] font-medium" style={{ color: t.text.muted }}>Dados de</span>
                  <span className="text-xs font-medium tabular-nums" style={{ color: t.text.secondary }}>{dateRange.from}</span>
                  <span className="text-[10px]" style={{ color: t.text.muted }}>→</span>
                  <span className="text-xs font-medium tabular-nums" style={{ color: t.text.secondary }}>{dateRange.to}</span>
                </>
              ) : (
                <span className="text-xs font-medium" style={{ color: t.text.muted }}>Filtrar período</span>
              )}
            </button>

            {/* Clear filter pill */}
            {hasFilter && (
              <button
                onClick={() => setPeriodo(PERIODO_PRESETS[0])}
                className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:opacity-70"
                style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, color: t.text.muted }}
                title="Remover filtro"
              >
                <X size={12} />
              </button>
            )}
          </div>
        }
      />

      <div className="px-6 pb-6">

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
            {/* KPI row — switches based on global dimensao */}
            <div className="mb-5 grid grid-cols-5 gap-4">
              {dimensao === 'operacoes' ? (
                <>
                  <KpiCard
                    label="Operações Iniciadas"
                    value={kpis ? fmt(kpis.operacoesIniciadas) : '—'}
                    people={kpis?.cpfsUnicos != null ? `${fmt(kpis.cpfsUnicos)} pess.` : undefined}
                    icon={<ArrowUpRight size={14} />}
                    accent={ACCENT.iniciadas}
                    tokens={t}
                    spark={evol.map((d: EvolucaoMensal) => d.iniciadas)}
                    delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.iniciadas)), higherGood: true } : undefined}
                  />
                  <KpiCard
                    label="Operações Concluídas"
                    value={kpis ? fmt(kpis.operacoesConcluidas) : '—'}
                    people={kpis?.cpfsConcluidos != null ? `${fmt(kpis.cpfsConcluidos)} pess.` : undefined}
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
                </>
              ) : (
                <>
                  <KpiCard
                    label="Pessoas Únicas"
                    value={kpis?.cpfsUnicos != null ? fmt(kpis.cpfsUnicos) : '—'}
                    icon={<Users size={14} />}
                    accent={ACCENT.iniciadas}
                    tokens={t}
                    spark={evol.map((d: EvolucaoMensal) => d.iniciadasCpf ?? 0)}
                    delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.iniciadasCpf ?? 0)), higherGood: true } : undefined}
                  />
                  <KpiCard
                    label="Pessoas Concluídas"
                    value={kpis?.cpfsConcluidos != null ? fmt(kpis.cpfsConcluidos) : '—'}
                    icon={<CheckCircle2 size={14} />}
                    accent={ACCENT.concluidas}
                    tokens={t}
                    spark={evol.map((d: EvolucaoMensal) => d.concluidasCpf ?? 0)}
                    delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.concluidasCpf ?? 0)), higherGood: true } : undefined}
                  />
                  <KpiCard
                    label="Conversão por Pessoa"
                    value={kpis?.taxaConversaoCpf != null ? `${kpis.taxaConversaoCpf.toFixed(1)}%` : '—'}
                    icon={<TrendingUp size={14} />}
                    accent={ACCENT.conversao}
                    tokens={t}
                    conversion={kpis?.taxaConversaoCpf}
                    spark={evol.map((d: EvolucaoMensal) => d.taxaConversaoCpf ?? 0)}
                    delta={evol.length >= 2 ? { ...moDelta(evol.map((d) => d.taxaConversaoCpf ?? 0)), higherGood: true } : undefined}
                  />
                  <KpiCard
                    label="Reincidentes"
                    value={kpis?.cpfsReincidentes != null ? fmt(kpis.cpfsReincidentes) : '—'}
                    sub={kpis?.pctReincidentes != null ? `${kpis.pctReincidentes.toFixed(1)}% tentaram 2x+` : undefined}
                    icon={<RefreshCw size={14} />}
                    accent={ACCENT.fila}
                    tokens={t}
                  />
                  <KpiCard
                    label="Captação Nova"
                    value={kpis?.cpfsNovos != null ? fmt(kpis.cpfsNovos) : '—'}
                    sub={kpis?.cpfsRetorno != null ? `${fmt(kpis.cpfsRetorno)} retornos` : undefined}
                    icon={<UserPlus size={14} />}
                    accent={ACCENT.usuario}
                    tokens={t}
                  />
                </>
              )}
            </div>

            {/* Evolution (2/3) + Variation table (1/3) */}
            {evol.length > 0 && (
              <div className="mb-5 grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <EvolutionChart data={evol} tokens={t} dimensao={dimensao} />
                </div>
                <div>
                  <VariationTable data={evol} tokens={t} />
                </div>
              </div>
            )}

            {/* Phase bar (2/3) + Company performance (1/3) */}
            {dataGlobal && dataGlobal.operacoesPorFase.length > 0 && (
              <div className="mb-5 grid grid-cols-3 items-stretch gap-4">
                <div className="col-span-2 flex flex-col">
                  <MacroPhaseBar
                    fases={
                      dimensao === 'cpf'
                        ? dataGlobal.operacoesPorFase.map(f => ({ ...f, total: f.totalCpf ?? f.total }))
                        : dataGlobal.operacoesPorFase
                    }
                    tempos={dataGlobal.tempoMedioPorFase}
                    macrofaseTotais={dimensao === 'cpf' ? [] : (dataGlobal.macrofaseTotais ?? [])}
                    tokens={t}
                    dimensao={dimensao}
                  />
                </div>
                <div className="flex flex-col">
                  <CompanyPerformance dataC6={dataC6} dataInter={dataInter} tokens={t} />
                </div>
              </div>
            )}

          </>
        )}
      </div>{/* /px-6 pb-6 */}

      {showDateModal && (
        <DateFilterModal tokens={t} onClose={() => setShowDateModal(false)} />
      )}
    </div>
  );
}
