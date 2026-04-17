import type { TabelaRow, DashboardData, FaseCount, VolumeData, UsuarioData, TempoFase } from '@/types/dashboard';

export function buildDashboardData(rows: TabelaRow[]): DashboardData {
  const faseMap: Record<number, number> = {};
  const dataMap: Record<string, number> = {};
  const userMap: Record<string, number> = {};
  const faseTimes: Record<number, number[]> = {};

  const sorted = [...rows].sort((a, b) => {
    if (a.NUOPERACAO !== b.NUOPERACAO) return Number(a.NUOPERACAO) - Number(b.NUOPERACAO);
    return Number(a.NUFASEOPERACAO) - Number(b.NUFASEOPERACAO);
  });

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const fase = Number(row.NUFASEOPERACAO);
    const dtStr = String(row.DTINICIOFASE || '');
    const usuario = String(row.COUSUARIOFASE || 'Desconhecido');

    faseMap[fase] = (faseMap[fase] || 0) + 1;

    const dateKey = dtStr.substring(0, 10);
    if (dateKey && dateKey !== 'null') dataMap[dateKey] = (dataMap[dateKey] || 0) + 1;

    userMap[usuario] = (userMap[usuario] || 0) + 1;

    if (i + 1 < sorted.length && sorted[i + 1].NUOPERACAO === row.NUOPERACAO) {
      const next = sorted[i + 1];
      const t1 = new Date(dtStr).getTime();
      const t2 = new Date(String(next.DTINICIOFASE || '')).getTime();
      const dias = (t2 - t1) / (1000 * 60 * 60 * 24);
      if (!isNaN(dias) && dias >= 0) {
        if (!faseTimes[fase]) faseTimes[fase] = [];
        faseTimes[fase].push(dias);
      }
    }
  }

  const operacoesPorFase: FaseCount[] = Object.entries(faseMap)
    .map(([fase, total]) => ({ fase: Number(fase), total }))
    .sort((a, b) => a.fase - b.fase);

  const volumePorData: VolumeData[] = Object.entries(dataMap)
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-30);

  const topUsuarios: UsuarioData[] = Object.entries(userMap)
    .map(([usuario, total]) => ({ usuario, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tempoMedioPorFase: TempoFase[] = Object.entries(faseTimes)
    .map(([fase, tempos]) => ({
      fase: Number(fase),
      tempoMedioDias: Number((tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1)),
    }))
    .sort((a, b) => a.fase - b.fase);

  return { operacoesPorFase, volumePorData, tempoMedioPorFase, topUsuarios, distribuicaoFases: operacoesPorFase };
}
