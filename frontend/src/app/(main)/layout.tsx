'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart2, BarChart3, Layers, TrendingUp, Trophy, Activity, Route as RouteIcon,
  Database, Server, Table2, CalendarRange, CalendarDays, Pencil, BookOpen, X, FileBarChart2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FiltersProvider, useFilters, PERIODO_PRESETS } from '@/contexts/FiltersContext';
import { CacheProvider, useCache } from '@/contexts/CacheContext';
import Sidebar from '@/components/layout/Sidebar';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
import { DateFilterModal } from '@/components/features/DateFilterModal/DateFilterModal';
import { PhaseLegendModal } from '@/components/features/PhaseLegendModal/PhaseLegendModal';
import { ROUTES } from '@/constants/routes';
import { BANKS } from '@/constants/banks';

const FIRST_BANCO = BANKS.filter((b) => b.enabled)[0]?.id ?? 'c6';

// Inner component — rendered inside FiltersProvider + CacheProvider so all hooks work
function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { tokens: t, bancosStatus } = useAuth();
  const { periodoInicio, periodoFim, periodoLabel, setPeriodo } = useFilters();
  const { bancosCache } = useCache();
  const pathname = usePathname();

  const [scrolled,      setScrolled]      = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showLegend,    setShowLegend]    = useState(false);

  const ROUTE_META: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
    [ROUTES.DASHBOARD]:   { title: 'Visão Geral',      description: 'Dados consolidados de todos os bancos',               icon: <BarChart2  size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.FASES]:       { title: 'Por Fase',          description: 'Volume, abandono e fluxo por fase do pipeline',        icon: <Layers     size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.TENDENCIAS]:  { title: 'Tendências',        description: 'Evolução mensal — volume, conversão e tempo',          icon: <TrendingUp size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.MACROFASES]:  { title: 'Macro Mensal',      description: 'Comparativo mes a mes por macrofase',                  icon: <BarChart3  size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.EXPORTACOES]: { title: 'Exportações',       description: 'Power BI e CSV da base de métricas',                   icon: <FileBarChart2 size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.RANKINGS]:    { title: 'Rankings',          description: 'Fases e usuários com maior impacto no funil',          icon: <Trophy     size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.DIAGNOSTICO]: { title: 'Diagnóstico',       description: 'Gargalos, riscos e prioridades de ação',              icon: <Activity   size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.JORNADA]:     { title: 'Jornada da Pessoa', description: 'Reincidência e comportamento de retorno por CPF',     icon: <RouteIcon  size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.EXPLORER]:    { title: 'BD Métricas',       description: 'Registros do banco de dados local (Parquet)',          icon: <Database   size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.DADOS]:       { title: 'Fontes',            description: 'Atualizar e expandir o warehouse de dados',           icon: <Server     size={20} style={{ color: t.accent.primary }} /> },
    [ROUTES.TABELAS]:     { title: 'Consulta BD',       description: 'Acesso direto ao banco Firebird',                     icon: <Table2     size={20} style={{ color: t.accent.primary }} /> },
  };

  const meta      = ROUTE_META[pathname] ?? { title: pathname.slice(1), description: '', icon: null };
  const hasFilter = !!(periodoInicio || periodoFim);
  const fromCache = bancosCache.some((b) => b.fromCache);

  // Derive exact data period (day precision) from volumePorData across all banks
  const allDatas  = bancosCache
    .flatMap((b) => b.data?.volumePorData?.map((v) => v.data) ?? [])
    .filter(Boolean)
    .sort();
  const dataInicio = allDatas[0] ?? null;
  const dataFim    = allDatas[allDatas.length - 1] ?? null;

  function fmtData(iso: string): string {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Fallback to month precision from evolucaoMensal
  const allMeses  = bancosCache.flatMap((b) => b.data?.evolucaoMensal?.map((e) => e.mes) ?? []).sort();
  const mesInicio = allMeses[0];
  const mesFim    = allMeses[allMeses.length - 1];

  function fmtMes(mes: string): string {
    const [ano, m] = mes.split('-');
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${nomes[parseInt(m, 10) - 1]}/${ano}`;
  }

  const periodoDataLabel = dataInicio && dataFim
    ? `${fmtData(dataInicio)} – ${fmtData(dataFim)}`
    : mesInicio && mesFim
      ? `${fmtMes(mesInicio)} – ${fmtMes(mesFim)}`
      : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: t.bg.base }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: t.bg.base }}
        onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
      >
        <PageHeaderBar
          title={meta.title}
          icon={meta.icon}
          description={meta.description}
          scrolled={scrolled}
          tokens={t}
          badges={
            <>
              {periodoDataLabel && !hasFilter && (
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `${t.accent.primary}10`, color: t.accent.primary, border: `1px solid ${t.accent.primary}25` }}
                >
                  <CalendarDays size={9} />
                  {periodoDataLabel}
                </span>
              )}
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
              <button
                onClick={() => setShowLegend(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, color: t.text.secondary }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent.primary)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.border.default)}
              >
                <BookOpen size={12} />
                Legenda
              </button>
              {/* Date range display + alterar button */}
              <div
                className="flex items-center rounded-lg overflow-hidden"
                style={{ border: `1px solid ${hasFilter ? `${t.accent.primary}50` : t.border.default}`, backgroundColor: hasFilter ? `${t.accent.primary}08` : t.bg.surface }}
              >
                {/* Date label (non-interactive) */}
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <CalendarRange size={12} style={{ color: hasFilter ? t.accent.primary : t.text.muted }} />
                  <span className="text-xs font-medium tabular-nums" style={{ color: hasFilter ? t.accent.primary : t.text.secondary }}>
                    {hasFilter ? periodoLabel : (periodoDataLabel ?? 'Sem dados')}
                  </span>
                </div>
                {/* Divider */}
                <div className="w-px self-stretch" style={{ backgroundColor: hasFilter ? `${t.accent.primary}30` : t.border.default }} />
                {/* Alterar button */}
                <button
                  onClick={() => setShowDateModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-70"
                  style={{ color: hasFilter ? t.accent.primary : t.text.muted }}
                >
                  <Pencil size={10} />
                  Alterar
                </button>
                {/* Clear filter */}
                {hasFilter && (
                  <>
                    <div className="w-px self-stretch" style={{ backgroundColor: `${t.accent.primary}30` }} />
                    <button
                      onClick={() => setPeriodo(PERIODO_PRESETS[0])}
                      className="flex items-center justify-center px-2 py-1.5 transition-colors hover:opacity-70"
                      style={{ color: t.accent.primary }}
                      title="Remover filtro"
                    >
                      <X size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          }
        />

        {children}

        {showDateModal && <DateFilterModal tokens={t} onClose={() => setShowDateModal(false)} />}
        {showLegend    && <PhaseLegendModal banco={FIRST_BANCO} onClose={() => setShowLegend(false)} tokens={t} />}
      </main>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <FiltersProvider>
      <CacheProvider>
        <MainLayoutInner>{children}</MainLayoutInner>
      </CacheProvider>
    </FiltersProvider>
  );
}
