'use client';

import { useState } from 'react';
import {
  Layers, BookOpen,
  TrendingUp, CheckCircle2, XCircle, Clock, Timer,
  Users, RefreshCw, UserPlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { MacroMilestones } from '@/components/features/MacroMilestones/MacroMilestones';
import { PhaseLegendModal } from '@/components/features/PhaseLegendModal/PhaseLegendModal';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
import type { DashboardKpis } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── KPI Cards ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon:   React.ReactNode;
  color:  string;
  value:  string;
  label:  string;
  sub?:   string;
  tokens: BankTokens;
}

function KpiCard({ icon, color, value, label, sub, tokens: t }: KpiCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: t.bg.surface,
        border:     `1px solid ${t.border.default}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>
          {value}
        </p>
        <p className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>{label}</p>
        {sub && <p className="text-[10px] font-medium" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

function FunnelKpis({ kpis, tokens: t, dimensao }: { kpis: DashboardKpis; tokens: BankTokens; dimensao: 'operacoes' | 'cpf' }) {
  const base = kpis.operacoesIniciadas || 1;
  const cancelPct = (kpis.operacoesCanceladas / base * 100).toFixed(1);
  const filaPct   = (kpis.operacoesEmFila    / base * 100).toFixed(1);
  const hasCpf = kpis.cpfsUnicos != null;

  if (dimensao === 'cpf' && hasCpf) {
    return (
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard
          icon={<Users size={16} style={{ color: '#3B82F6' }} />}
          color="#3B82F6"
          value={(kpis.cpfsUnicos ?? 0).toLocaleString('pt-BR')}
          label="CPFs Únicos"
          sub="CPFs no funil"
          tokens={t}
        />
        <KpiCard
          icon={<CheckCircle2 size={16} style={{ color: '#16A34A' }} />}
          color="#16A34A"
          value={(kpis.cpfsConcluidos ?? 0).toLocaleString('pt-BR')}
          label="CPFs Concluídos"
          sub={`${(kpis.taxaConversaoCpf ?? 0).toFixed(1)}% de conversão`}
          tokens={t}
        />
        <KpiCard
          icon={<RefreshCw size={16} style={{ color: '#EF4444' }} />}
          color="#EF4444"
          value={(kpis.cpfsReincidentes ?? 0).toLocaleString('pt-BR')}
          label="Reincidentes"
          sub={`${(kpis.pctReincidentes ?? 0).toFixed(1)}% tentaram 2x+`}
          tokens={t}
        />
        <KpiCard
          icon={<UserPlus size={16} style={{ color: '#F59E0B' }} />}
          color="#F59E0B"
          value={(kpis.cpfsNovos ?? 0).toLocaleString('pt-BR')}
          label="Captação Nova"
          sub={`${(kpis.cpfsRetorno ?? 0).toLocaleString('pt-BR')} retornos`}
          tokens={t}
        />
        <KpiCard
          icon={<Timer size={16} style={{ color: '#8B5CF6' }} />}
          color="#8B5CF6"
          value={kpis.tempoMedioTotal != null ? `${kpis.tempoMedioTotal.toFixed(1)}d` : '—'}
          label="Tempo Médio"
          sub="dias por proposta"
          tokens={t}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard
        icon={<TrendingUp size={16} style={{ color: '#3B82F6' }} />}
        color="#3B82F6"
        value={kpis.operacoesIniciadas.toLocaleString('pt-BR')}
        label="Iniciadas"
        sub="propostas no funil"
        tokens={t}
      />
      <KpiCard
        icon={<CheckCircle2 size={16} style={{ color: '#16A34A' }} />}
        color="#16A34A"
        value={kpis.operacoesConcluidas.toLocaleString('pt-BR')}
        label="Concluídas"
        sub={`${kpis.taxaConversao.toFixed(1)}% de conversão`}
        tokens={t}
      />
      <KpiCard
        icon={<XCircle size={16} style={{ color: '#EF4444' }} />}
        color="#EF4444"
        value={kpis.operacoesCanceladas.toLocaleString('pt-BR')}
        label="Canceladas"
        sub={`${cancelPct}% do total`}
        tokens={t}
      />
      <KpiCard
        icon={<Clock size={16} style={{ color: '#F59E0B' }} />}
        color="#F59E0B"
        value={kpis.operacoesEmFila.toLocaleString('pt-BR')}
        label="Em Andamento"
        sub={`${filaPct}% do total`}
        tokens={t}
      />
      <KpiCard
        icon={<Timer size={16} style={{ color: '#8B5CF6' }} />}
        color="#8B5CF6"
        value={kpis.tempoMedioTotal != null ? `${kpis.tempoMedioTotal.toFixed(1)}d` : '—'}
        label="Tempo Médio"
        sub="dias por proposta"
        tokens={t}
      />
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FaseAnalysisScreen() {
  const { dataGlobal, loading, lastUpdated, fromCache } = useDashboardScreen();
  const { tokens: t, bancosConectados } = useAuth();
  const { dimensao } = useFilters();

  const [scrolled, setScrolled]     = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const bancoCurrent = bancosConectados[0]?.id ?? 'c6';

  const semDados = !loading && !dataGlobal;

  const dateRange = (() => {
    if (!dataGlobal) return null;
    const e = dataGlobal.evolucaoMensal;
    if (e.length > 0) return { from: e[0].label, to: e[e.length - 1].label };
    return null;
  })();

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: t.bg.base }}
      onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
    >
      <PageHeaderBar
        title="Por Fase"
        icon={<Layers size={20} style={{ color: t.accent.primary }} />}
        description={lastUpdated ?? 'Volume, abandono e fluxo por fase do pipeline'}
        scrolled={scrolled}
        tokens={t}
        badges={fromCache && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}
          >
            cache local
          </span>
        )}
        right={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLegend(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: t.bg.surface,
                border: `1px solid ${t.border.default}`,
                color: t.text.secondary,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent.primary)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = t.border.default)}
            >
              <BookOpen size={12} />
              Legenda
            </button>
            {dateRange && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
              >
                <span className="text-[11px]" style={{ color: t.text.muted }}>Dados de</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: t.text.secondary }}>{dateRange.from}</span>
                <span className="text-[10px]" style={{ color: t.text.muted }}>→</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: t.text.secondary }}>{dateRange.to}</span>
              </div>
            )}
          </div>
        )}
      />

      <div className="px-6 pb-6">
        {loading ? (
          <LoadingState message="Carregando fases..." tokens={t} />
        ) : semDados ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              <Layers size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Nenhum dado encontrado</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Acesse Fontes e clique em Atualizar</p>
          </div>
        ) : dataGlobal && (
          <>
            <FunnelKpis kpis={dataGlobal.kpis} tokens={t} dimensao={dimensao} />
            <div>
              <MacroMilestones
                fases={
                  dimensao === 'cpf'
                    ? dataGlobal.operacoesPorFase.map(f => ({ ...f, total: f.totalCpf ?? f.total }))
                    : dataGlobal.operacoesPorFase
                }
                tempos={dataGlobal.tempoMedioPorFase}
                tokens={t}
                mode="chevron"
                transicoes={dataGlobal.transicoes}
                macrofaseTotais={dimensao === 'cpf' ? [] : (dataGlobal.macrofaseTotais ?? [])}
                dimensao={dimensao}
              />
            </div>
          </>
        )}
      </div>

      {showLegend && (
        <PhaseLegendModal
          banco={bancoCurrent}
          onClose={() => setShowLegend(false)}
          tokens={t}
        />
      )}
    </div>
  );
}
