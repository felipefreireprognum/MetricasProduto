export interface TabelaRow {
  [key: string]: string | number | null;
}

export interface HistoricoOperacao {
  NUOPERACAO: number;
  NUFASEOPERACAO: number;
  DTINICIOFASE: string;
  COUSUARIOFASE: string;
}

export interface FaseCount {
  fase: number;
  total: number;
}

export interface VolumeData {
  data: string;
  total: number;
}

export interface UsuarioData {
  usuario: string;
  total: number;
}

export interface TempoFase {
  fase: number;
  tempoMedioDias: number;
}

export interface DashboardData {
  operacoesPorFase: FaseCount[];
  volumePorData: VolumeData[];
  tempoMedioPorFase: TempoFase[];
  topUsuarios: UsuarioData[];
  distribuicaoFases: FaseCount[];
}
