import type { TabelaRow, DashboardData, FaseCount, VolumeData, UsuarioData, TempoFase } from '@/types/dashboard';

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

export function buildDashboardData(rows: TabelaRow[]): DashboardData {
  if (!rows.length) {
    return {
      operacoesPorFase: [],
      volumePorData: [],
      tempoMedioPorFase: [],
      topUsuarios: [],
      distribuicaoFases: [],
      kpis: { totalRegistros: 0, operacoesUnicas: 0, fasesUnicas: 0, topUsuario: '—' },
      colunas: [],
      primeiraLinha: null,
    };
  }

  const faseMap: Record<string, { fase: number; nome: string; total: number }> = {};
  const dataMap: Record<string, number> = {};
  const userMap: Record<string, number> = {};
  const faseTimes: Record<string, { fase: number; nome: string; tempos: number[] }> = {};

  // Agrupamento por operação — garante que calculamos tempo corretamente
  // independente da ordem de chegada das linhas da API
  const opGroups = new Map<string, TabelaRow[]>();

  for (const row of rows) {
    const nuOp = String(getField(row, 'NU_OPERACAO') ?? '');
    const faseNum = Number(getField(row, 'NU_FASE_OPERACAO') ?? 0);
    const faseKey = String(faseNum);
    const nome = faseLabel(row);
    const dtVal = getField(row, 'DT_INICIO_FASE');
    const usuario = String(getField(row, 'CO_USUARIO_FASE') ?? 'Desconhecido').trim() || 'Desconhecido';

    // Agrupa por operação para calcular tempo depois
    if (nuOp) {
      if (!opGroups.has(nuOp)) opGroups.set(nuOp, []);
      opGroups.get(nuOp)!.push(row);
    }

    // Conta por fase
    if (!faseMap[faseKey]) faseMap[faseKey] = { fase: faseNum, nome, total: 0 };
    faseMap[faseKey].total++;

    // Volume por data
    const dateKey = toDateKey(dtVal);
    if (dateKey) dataMap[dateKey] = (dataMap[dateKey] || 0) + 1;

    // Top usuários
    userMap[usuario] = (userMap[usuario] || 0) + 1;
  }

  // Calcula tempo médio por fase agrupando por operação
  for (const opRows of opGroups.values()) {
    // Ordena as fases desta operação numericamente
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
  }

  const operacoesPorFase: FaseCount[] = Object.values(faseMap)
    .sort((a, b) => a.fase - b.fase);

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

  console.log(`[Mapper] ${opGroups.size} operações únicas | ${tempoMedioPorFase.length} fases com tempo calculado:`,
    tempoMedioPorFase.map(f => `${f.nome}: ${f.tempoMedioDias}d`));

  return {
    operacoesPorFase,
    volumePorData,
    tempoMedioPorFase,
    topUsuarios,
    distribuicaoFases: operacoesPorFase,
    kpis: {
      totalRegistros: rows.length,
      operacoesUnicas: opGroups.size,
      fasesUnicas: operacoesPorFase.length,
      topUsuario: topUsuarios[0]?.usuario ?? '—',
    },
    colunas: Object.keys(rows[0]),
    primeiraLinha: rows[0],
  };
}
