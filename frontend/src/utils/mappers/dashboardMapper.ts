import type { TabelaRow, DashboardData, FaseCount, VolumeData, UsuarioData, TempoFase, EvolucaoMensal } from '@/types/dashboard';

function getField(row: TabelaRow, key: string): string | number | null {
  const found = Object.keys(row).find((k) => k.toUpperCase() === key.toUpperCase());
  return found !== undefined ? row[found] : null;
}

function parseDate(value: string | number | null): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'None') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(value: string | number | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return d.toISOString().substring(0, 10);
}

function faseLabel(row: TabelaRow): string {
  const nome = getField(row, 'NO_FASE_OPERACAO');
  if (nome && String(nome).trim() && String(nome).trim() !== 'null') {
    return String(nome).trim();
  }
  const num = getField(row, 'NU_FASE_OPERACAO');
  return `Fase ${num ?? '?'}`;
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function buildDashboardData(rows: TabelaRow[]): DashboardData {
  if (!rows.length) {
    return {
      operacoesPorFase: [],
      volumePorData: [],
      tempoMedioPorFase: [],
      topUsuarios: [],
      distribuicaoFases: [],
      evolucaoMensal: [],
      kpis: {
        totalRegistros: 0, operacoesUnicas: 0, fasesUnicas: 0, topUsuario: '—',
        operacoesIniciadas: 0, operacoesConcluidas: 0, operacoesCanceladas: 0,
        operacoesEmFila: 0, taxaConversao: 0, tempoMedioTotal: null,
      },
      colunas: [],
      primeiraLinha: null,
    };
  }

  const faseMap: Record<string, { fase: number; nome: string; total: number }> = {};
  const dataMap: Record<string, number> = {};
  const userMap: Record<string, number> = {};
  const faseTimes: Record<string, { fase: number; nome: string; tempos: number[] }> = {};
  const opGroups = new Map<string, TabelaRow[]>();

  for (const row of rows) {
    const nuOp = String(getField(row, 'NU_OPERACAO') ?? '');
    const faseNum = Number(getField(row, 'NU_FASE_OPERACAO') ?? 0);
    const faseKey = String(faseNum);
    const nome = faseLabel(row);
    const dtVal = getField(row, 'DT_INICIO_FASE');
    const usuario = String(getField(row, 'CO_USUARIO_FASE') ?? 'Desconhecido').trim() || 'Desconhecido';

    if (nuOp) {
      if (!opGroups.has(nuOp)) opGroups.set(nuOp, []);
      opGroups.get(nuOp)!.push(row);
    }

    if (!faseMap[faseKey]) faseMap[faseKey] = { fase: faseNum, nome, total: 0 };
    faseMap[faseKey].total++;

    const dateKey = toDateKey(dtVal);
    if (dateKey) dataMap[dateKey] = (dataMap[dateKey] || 0) + 1;

    userMap[usuario] = (userMap[usuario] || 0) + 1;
  }

  // Per-op status and time tracking
  interface OpSummary { firstDate: Date | null; lastDate: Date | null; lastPhase: number }
  const opData = new Map<string, OpSummary>();

  for (const [nuOp, opRows] of opGroups.entries()) {
    // Sort by phase number for faseTimes (consecutive diff calculation)
    opRows.sort((a, b) =>
      Number(getField(a, 'NU_FASE_OPERACAO') ?? 0) - Number(getField(b, 'NU_FASE_OPERACAO') ?? 0)
    );

    for (let i = 0; i < opRows.length - 1; i++) {
      const curr = opRows[i];
      const next = opRows[i + 1];
      const faseNum = Number(getField(curr, 'NU_FASE_OPERACAO') ?? 0);
      const faseKey = String(faseNum);
      const nome = faseLabel(curr);
      const t1 = parseDate(getField(curr, 'DT_INICIO_FASE'))?.getTime();
      const t2 = parseDate(getField(next, 'DT_INICIO_FASE'))?.getTime();
      if (t1 != null && t2 != null) {
        const dias = (t2 - t1) / (1000 * 60 * 60 * 24);
        if (!isNaN(dias) && dias >= 0) {
          if (!faseTimes[faseKey]) faseTimes[faseKey] = { fase: faseNum, nome, tempos: [] };
          faseTimes[faseKey].tempos.push(dias);
        }
      }
    }

    // Sort by date to determine first/last for KPIs
    const byDate = [...opRows].sort((a, b) => {
      const da = parseDate(getField(a, 'DT_INICIO_FASE'))?.getTime() ?? 0;
      const db = parseDate(getField(b, 'DT_INICIO_FASE'))?.getTime() ?? 0;
      if (da !== db) return da - db;
      return Number(getField(a, 'NU_FASE_OPERACAO') ?? 0) - Number(getField(b, 'NU_FASE_OPERACAO') ?? 0);
    });
    opData.set(nuOp, {
      firstDate: parseDate(getField(byDate[0], 'DT_INICIO_FASE')),
      lastDate: parseDate(getField(byDate[byDate.length - 1], 'DT_INICIO_FASE')),
      lastPhase: Number(getField(byDate[byDate.length - 1], 'NU_FASE_OPERACAO') ?? 0),
    });
  }

  // Per-month time sums (for tempoMedio per month)
  const monthlyTimeSums = new Map<string, { total: number; count: number }>();
  for (const op of opData.values()) {
    if (!op.firstDate || !op.lastDate) continue;
    const mes = op.firstDate.toISOString().substring(0, 7);
    const dias = (op.lastDate.getTime() - op.firstDate.getTime()) / (1000 * 60 * 60 * 24);
    if (!isNaN(dias) && dias >= 0 && dias < 3650) {
      if (!monthlyTimeSums.has(mes)) monthlyTimeSums.set(mes, { total: 0, count: 0 });
      const s = monthlyTimeSums.get(mes)!;
      s.total += dias;
      s.count++;
    }
  }

  // Global KPI aggregations
  let concluidas = 0;
  let canceladas = 0;
  const temposTotais: number[] = [];

  for (const op of opData.values()) {
    if (op.lastPhase === 1300) concluidas++;
    else if (op.lastPhase === 1200) canceladas++;
    if (op.firstDate && op.lastDate) {
      const dias = (op.lastDate.getTime() - op.firstDate.getTime()) / (1000 * 60 * 60 * 24);
      if (!isNaN(dias) && dias >= 0 && dias < 3650) temposTotais.push(dias);
    }
  }
  const iniciadas = opData.size;
  const emFila = iniciadas - concluidas - canceladas;
  const taxaConversao = iniciadas > 0 ? Math.round((concluidas / iniciadas) * 1000) / 10 : 0;
  const tempoMedioTotal = temposTotais.length
    ? Number((temposTotais.reduce((a, b) => a + b, 0) / temposTotais.length).toFixed(1))
    : null;

  // Monthly evolution
  const monthlyMap = new Map<string, { iniciadas: number; concluidas: number; canceladas: number }>();
  for (const op of opData.values()) {
    if (!op.firstDate) continue;
    const mes = op.firstDate.toISOString().substring(0, 7);
    if (!monthlyMap.has(mes)) monthlyMap.set(mes, { iniciadas: 0, concluidas: 0, canceladas: 0 });
    const m = monthlyMap.get(mes)!;
    m.iniciadas++;
    if (op.lastPhase === 1300) m.concluidas++;
    else if (op.lastPhase === 1200) m.canceladas++;
  }

  const evolucaoMensal: EvolucaoMensal[] = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, d]) => {
      const [year, monthStr] = mes.split('-');
      const label = `${MONTH_NAMES[parseInt(monthStr) - 1]}/${year.slice(2)}`;
      const mEmFila = d.iniciadas - d.concluidas - d.canceladas;
      const mTaxa = d.iniciadas > 0 ? Math.round((d.concluidas / d.iniciadas) * 1000) / 10 : 0;
      const ts = monthlyTimeSums.get(mes);
      const tempoMedio = ts && ts.count > 0 ? Number((ts.total / ts.count).toFixed(1)) : null;
      return { mes, label, iniciadas: d.iniciadas, concluidas: d.concluidas, canceladas: d.canceladas, emFila: mEmFila, taxaConversao: mTaxa, tempoMedio };
    });

  const operacoesPorFase: FaseCount[] = Object.values(faseMap).sort((a, b) => a.fase - b.fase);

  const volumePorData: VolumeData[] = Object.entries(dataMap)
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-30);

  const topUsuarios: UsuarioData[] = Object.entries(userMap)
    .map(([usuario, total]) => ({ usuario, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tempoMedioPorFase: TempoFase[] = Object.values(faseTimes)
    .map(({ fase, nome, tempos }) => ({
      fase,
      nome,
      tempoMedioDias: Number((tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1)),
    }))
    .sort((a, b) => a.fase - b.fase);

  return {
    operacoesPorFase,
    volumePorData,
    tempoMedioPorFase,
    topUsuarios,
    distribuicaoFases: operacoesPorFase,
    evolucaoMensal,
    kpis: {
      totalRegistros: rows.length,
      operacoesUnicas: opGroups.size,
      fasesUnicas: operacoesPorFase.length,
      topUsuario: topUsuarios[0]?.usuario ?? '—',
      operacoesIniciadas: iniciadas,
      operacoesConcluidas: concluidas,
      operacoesCanceladas: canceladas,
      operacoesEmFila: Math.max(emFila, 0),
      taxaConversao,
      tempoMedioTotal,
    },
    colunas: Object.keys(rows[0]),
    primeiraLinha: rows[0],
  };
}
