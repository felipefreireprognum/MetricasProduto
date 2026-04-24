'use client';

import { Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { PhaseBreakdown } from '@/components/features/PhaseBreakdown/PhaseBreakdown';
import { MilestoneFunnel } from '@/components/features/MilestoneFunnel/MilestoneFunnel';

export default function FaseAnalysisScreen() {
  const { dataGlobal, loading, lastUpdated, fromCache } = useDashboardScreen();
  const { tokens: t } = useAuth();

  const semDados = !loading && !dataGlobal;

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: t.bg.base }}>
      <div className="p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: t.text.primary }}>Análise por Fase</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm" style={{ color: t.text.muted }}>
              {lastUpdated ?? 'Volume e tempo médio por fase do pipeline'}
            </p>
            {fromCache && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}
              >
                cache local
              </span>
            )}
          </div>
        </div>

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
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Use o botão Atualizar na barra lateral</p>
          </div>
        ) : dataGlobal && (
          <div className="flex flex-col gap-5">
            <PhaseBreakdown
              fases={dataGlobal.operacoesPorFase}
              temposFase={dataGlobal.tempoMedioPorFase}
              tokens={t}
            />
            <MilestoneFunnel
              phases={dataGlobal.operacoesPorFase}
              tokens={t}
            />
          </div>
        )}

      </div>
    </div>
  );
}
