'use client';

import type { DashboardData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import { buildComparison } from '@/utils/mappers/comparisonMapper';
import TempoMedioFaseChart from '@/components/charts/TempoMedioFaseChart';
import OperacoesPorFaseChart from '@/components/charts/OperacoesPorFaseChart';
import VolumePorDataChart from '@/components/charts/VolumePorDataChart';
import TopUsuariosChart from '@/components/charts/TopUsuariosChart';

interface Props {
  dataC6: DashboardData | null;
  dataInter: DashboardData | null;
  tokens: BankTokens;
}

export default function DashboardView({ dataC6, dataInter, tokens: t }: Props) {
  const cmp = buildComparison(dataC6, dataInter);

  return (
    <div className="space-y-4">
      <TempoMedioFaseChart data={cmp.tempoFase} tokens={t} />

      <div className="grid grid-cols-2 gap-4">
        <VolumePorDataChart data={cmp.volume} tokens={t} />
        <OperacoesPorFaseChart data={cmp.fases} tokens={t} />
      </div>

      <TopUsuariosChart topC6={cmp.topC6} topInter={cmp.topInter} tokens={t} />
    </div>
  );
}
