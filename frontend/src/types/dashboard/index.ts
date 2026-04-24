export interface TabelaRow {
  [key: string]: string | number | null;
}

export interface HistoricoOperacao {
  NU_OPERACAO: number;
  NU_FASE_OPERACAO: number;
  DT_INICIO_FASE: string;
  CO_USUARIO_FASE: string;
}

export interface FaseCount {
  fase: number;
  nome: string;
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
  nome: string;
  tempoMedioDias: number;
}

export interface EvolucaoMensal {
  mes: string;
  label: string;
  iniciadas: number;
  concluidas: number;
  canceladas: number;
  emFila: number;
  taxaConversao: number;
  tempoMedio: number | null;
}

export interface DashboardKpis {
  totalRegistros: number;
  operacoesUnicas: number;
  fasesUnicas: number;
  topUsuario: string;
  operacoesIniciadas: number;
  operacoesConcluidas: number;
  operacoesCanceladas: number;
  operacoesEmFila: number;
  taxaConversao: number;
  tempoMedioTotal: number | null;
}

export interface DashboardData {
  operacoesPorFase: FaseCount[];
  volumePorData: VolumeData[];
  tempoMedioPorFase: TempoFase[];
  topUsuarios: UsuarioData[];
  distribuicaoFases: FaseCount[];
  evolucaoMensal: EvolucaoMensal[];
  kpis: DashboardKpis;
  colunas: string[];
  primeiraLinha: TabelaRow | null;
}
