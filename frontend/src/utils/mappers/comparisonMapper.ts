import type { DashboardData, TempoFase, VolumeData, FaseCount, UsuarioData } from '@/types/dashboard';

export const C6_COLOR   = '#2563EB';
export const INTER_COLOR = '#F97316';

export interface TempoFaseComparado {
  nome: string;
  fase: number;
  c6: number | null;
  inter: number | null;
}

export interface VolumeComparado {
  data: string;
  c6: number;
  inter: number;
}

export interface FaseComparada {
  nome: string;
  fase: number;
  c6: number;
  inter: number;
}

export interface ComparisonData {
  tempoFase: TempoFaseComparado[];
  volume: VolumeComparado[];
  fases: FaseComparada[];
  topC6: UsuarioData[];
  topInter: UsuarioData[];
}

function byNome<T extends { nome: string; fase: number }>(a: T, b: T) {
  return a.fase - b.fase;
}

export function buildComparison(c6: DashboardData | null, inter: DashboardData | null): ComparisonData {
  const tempoMap = new Map<string, TempoFaseComparado>();

  (c6?.tempoMedioPorFase ?? []).forEach((d) => {
    tempoMap.set(d.nome, { nome: d.nome, fase: d.fase, c6: d.tempoMedioDias, inter: null });
  });
  (inter?.tempoMedioPorFase ?? []).forEach((d) => {
    const ex = tempoMap.get(d.nome);
    if (ex) ex.inter = d.tempoMedioDias;
    else tempoMap.set(d.nome, { nome: d.nome, fase: d.fase, c6: null, inter: d.tempoMedioDias });
  });

  const volMap = new Map<string, VolumeComparado>();
  (c6?.volumePorData ?? []).forEach((d) => volMap.set(d.data, { data: d.data, c6: d.total, inter: 0 }));
  (inter?.volumePorData ?? []).forEach((d) => {
    const ex = volMap.get(d.data);
    if (ex) ex.inter = d.total;
    else volMap.set(d.data, { data: d.data, c6: 0, inter: d.total });
  });

  const faseMap = new Map<string, FaseComparada>();
  (c6?.operacoesPorFase ?? []).forEach((d) => faseMap.set(d.nome, { nome: d.nome, fase: d.fase, c6: d.total, inter: 0 }));
  (inter?.operacoesPorFase ?? []).forEach((d) => {
    const ex = faseMap.get(d.nome);
    if (ex) ex.inter = d.total;
    else faseMap.set(d.nome, { nome: d.nome, fase: d.fase, c6: 0, inter: d.total });
  });

  return {
    tempoFase: Array.from(tempoMap.values()).sort(byNome),
    volume: Array.from(volMap.values()).sort((a, b) => a.data.localeCompare(b.data)),
    fases: Array.from(faseMap.values()).sort(byNome),
    topC6: c6?.topUsuarios ?? [],
    topInter: inter?.topUsuarios ?? [],
  };
}
