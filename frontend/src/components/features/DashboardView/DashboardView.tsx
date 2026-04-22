'use client';

import type { DashboardData, TabelaRow } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import TempoMedioFaseChart from '@/components/charts/TempoMedioFaseChart';
import OperacoesPorFaseChart from '@/components/charts/OperacoesPorFaseChart';
import VolumePorDataChart from '@/components/charts/VolumePorDataChart';
import DistribuicaoFasesChart from '@/components/charts/DistribuicaoFasesChart';
import GenericTableView from './GenericTableView';

interface Props {
  dashboardData: DashboardData;
  rows: TabelaRow[];
  tokens: BankTokens;
}

export default function DashboardView({ dashboardData, rows, tokens: t }: Props) {
  return (
    <div className="space-y-4">
      <TempoMedioFaseChart data={dashboardData.tempoMedioPorFase} tokens={t} />

      <div className="grid grid-cols-2 gap-4">
        <VolumePorDataChart data={dashboardData.volumePorData} tokens={t} />
        <OperacoesPorFaseChart data={dashboardData.operacoesPorFase} tokens={t} />
      </div>

      <DistribuicaoFasesChart data={dashboardData.distribuicaoFases} tokens={t} />

      <div>
        <p className="mb-2 text-sm font-semibold" style={{ color: t.text.primary }}>
          Registros — HISTORICO_OPERACAO
          <span className="ml-2 text-xs font-normal" style={{ color: t.text.muted }}>({rows.length} linhas)</span>
        </p>
        <GenericTableView rows={rows} tokens={t} />
      </div>
    </div>
  );
}
