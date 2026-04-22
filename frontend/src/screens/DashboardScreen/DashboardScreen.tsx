'use client';

import { RefreshCw, Activity, GitBranch, Users, Database } from 'lucide-react';
import { STRINGS } from '@/constants/strings';
import { useDashboardScreen, LIMITE_OPTIONS } from '@/hooks/dashboard/useDashboardScreen';
import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/shared/LoadingState';
import DashboardView from '@/components/features/DashboardView';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  tokens: import('@/theme/tokens').BankTokens;
}

function KpiCard({ label, value, icon, accent, tokens: t }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: t.bg.surface,
        border: `1px solid ${t.border.default}`,
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: t.text.muted }}>{label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: t.text.primary }}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}18` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const { dashboardData, rows, loading, error, fetchMetricas, lastUpdated, limite, setLimite } = useDashboardScreen();
  const { tokens: t, bancosStatus } = useAuth();

  const kpis = dashboardData?.kpis;

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: t.bg.base }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold" style={{ color: t.text.primary }}>{STRINGS.dashboard.title}</h1>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-sm" style={{ color: t.text.muted }}>
                {lastUpdated ? `Atualizado às ${lastUpdated}` : STRINGS.dashboard.subtitle}
              </p>
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
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: conectado ? '#10B981' : '#EF4444' }}
                      />
                      {banco.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de registros */}
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${t.border.default}` }}>
              {LIMITE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setLimite(opt)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: limite === opt ? t.accent.yellow : t.bg.surface,
                    color: limite === opt ? t.text.inverse : t.text.secondary,
                    borderRight: `1px solid ${t.border.default}`,
                  }}
                >
                  {opt >= 1000 ? `${opt / 1000}k` : opt}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMetricas}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: t.bg.surface, color: t.text.secondary, border: `1px solid ${t.border.default}` }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg p-3 text-sm text-red-400" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444430' }}>{error}</div>
        )}

        {loading ? (
          <LoadingState message="Carregando métricas..." />
        ) : !dashboardData || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: t.bg.surface }}>
              <Database size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Nenhum dado encontrado</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>
              A tabela <span className="font-mono font-medium">HISTORICO_OPERACAO</span> está vazia ou sem registros acessíveis.
            </p>
            <button
              onClick={fetchMetricas}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: t.bg.surface, color: t.text.primary, border: `1px solid ${t.border.default}` }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mb-6 grid grid-cols-4 gap-4">
              <KpiCard label="Total de Registros"  value={kpis?.totalRegistros ?? 0} icon={<Database size={18} />}  accent={t.kpi.info}    tokens={t} />
              <KpiCard label="Operações Únicas"    value={kpis?.operacoesUnicas ?? 0} icon={<Activity size={18} />}  accent={t.accent.yellow} tokens={t} />
              <KpiCard label="Fases Distintas"     value={kpis?.fasesUnicas ?? 0}    icon={<GitBranch size={18} />} accent={t.kpi.warning} tokens={t} />
              <KpiCard label="Usuário Mais Ativo"  value={kpis?.topUsuario ?? '—'}   icon={<Users size={18} />}     accent={t.kpi.success} tokens={t} />
            </div>

            {/* Charts + Tabela */}
            <DashboardView dashboardData={dashboardData} rows={rows} tokens={t} />
          </>
        )}
      </div>
    </div>
  );
}
