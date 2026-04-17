'use client';

import type { DashboardData, TabelaRow } from '@/types/dashboard';
import OperacoesPorFaseChart from '@/components/charts/OperacoesPorFaseChart';
import VolumePorDataChart from '@/components/charts/VolumePorDataChart';
import TempoMedioFaseChart from '@/components/charts/TempoMedioFaseChart';
import TopUsuariosChart from '@/components/charts/TopUsuariosChart';
import DistribuicaoFasesChart from '@/components/charts/DistribuicaoFasesChart';
import GenericTableView from './GenericTableView';

interface Props {
  tabelaSelecionada: string;
  dashboardData: DashboardData | null;
  rows: TabelaRow[];
}

export default function DashboardView({ tabelaSelecionada, dashboardData, rows }: Props) {
  if (tabelaSelecionada === 'HISTORICO_OPERACAO' && dashboardData) {
    return (
      <div className="space-y-4">
        {/* Row 1 — full width */}
        <VolumePorDataChart data={dashboardData.volumePorData} />
        {/* Row 2 — 2 cols */}
        <div className="grid grid-cols-2 gap-4">
          <OperacoesPorFaseChart data={dashboardData.operacoesPorFase} />
          <DistribuicaoFasesChart data={dashboardData.distribuicaoFases} />
        </div>
        {/* Row 3 — 2 cols */}
        <div className="grid grid-cols-2 gap-4">
          <TempoMedioFaseChart data={dashboardData.tempoMedioPorFase} />
          <TopUsuariosChart data={dashboardData.topUsuarios} />
        </div>
      </div>
    );
  }

  return <GenericTableView rows={rows} />;
}
