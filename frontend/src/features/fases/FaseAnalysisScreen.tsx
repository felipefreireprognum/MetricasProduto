'use client';

import { useState } from 'react';
import {
  Layers,
  TrendingUp, CheckCircle2, XCircle, Clock, Timer,
  Users, RefreshCw, UserPlus, GitBranch,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { MacroMilestones } from '@/features/fases/components/MacroMilestones';
import { GapsModal } from '@/features/fases/components/GapsModal';
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
  const { dataGlobal, activeBank, loading } = useDashboardScreen();
  const { tokens: t } = useAuth();
  const { dimensao, periodoInicio, periodoFim, periodoLabel } = useFilters();
  const [showGaps, setShowGaps] = useState(false);

  const semDados = !loading && !dataGlobal;

  return (
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

            {/* Gaps button */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowGaps(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, color: t.text.secondary }}
              >
                <GitBranch size={12} />
                Análise de Gaps
              </button>
            </div>

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

      {showGaps && activeBank && (
        <GapsModal
          tokens={t}
          onClose={() => setShowGaps(false)}
          banco={activeBank.id}
          ambiente={activeBank.ambiente}
          inicio={periodoInicio ?? undefined}
          fim={periodoFim ?? undefined}
          periodoLabel={periodoLabel}
        />
      )}
    </div>
  );
}
