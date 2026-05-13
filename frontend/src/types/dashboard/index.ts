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
  fase:         number;
  nome:         string;
  macrofase:    string;
  total:        number;
  abandono?:    number;
  emAndamento?: number;
  totalCpf?:    number;
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
  fase:           number;
  nome:           string;
  macrofase:      string;
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
  iniciadasCpf?: number;
  concluidasCpf?: number;
  taxaConversaoCpf?: number;
}

export interface MacroEvolucaoStage {
  id: string;
  label: string;
  shortLabel: string;
}

export interface MacroEvolucaoRow {
  mes: string;
  label: string;
  [key: string]: string | number | null;
}

export interface MacroEvolucaoTotal {
  id: string;
  label: string;
  total: number;
  abandono: number;
  emAndamento: number;
  creditoReprovado: number;
  tempoMedio: number | null;
  pctAvanco: number;
}

export interface MacroEvolucaoData {
  stages: MacroEvolucaoStage[];
  rows: MacroEvolucaoRow[];
  totais: MacroEvolucaoTotal[];
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
  // CPF metrics — present only after ETL with updated SQL
  cpfsUnicos?: number;
  cpfsConcluidos?: number;
  cpfsReincidentes?: number;
  pctReincidentes?: number;
  taxaConversaoCpf?: number;
  cpfsNovos?: number;
  cpfsRetorno?: number;
}

export interface FaseTransicao {
  de:       number;
  para:     number;
  paraNome: string;
  qtd:      number;
}

export interface MacrofaseTotal {
  macrofase:   string;
  total:       number;
  reprovados?: number;
}

export interface TopCpf {
  cpf:   string;
  total: number;
}

// ── Jornada da Pessoa ─────────────────────────────────────────────────────────

export interface TentativaGrupo {
  grupo:      string;
  pessoas:    number;
  concluidas: number;
  conversao:  number;
  operacoes?: number;
}

export interface ProgressoData {
  melhorou:          number;
  igual:             number;
  piorou:            number;
  converteuNa2a:     number;
  totalReincidentes: number;
}

export interface QuebraFase {
  fase:      number;
  nome:      string;
  macrofase: string;
  pessoas:   number;
  pct:       number;
}

export interface JornadaData {
  semDados:               boolean;
  totalCpfs:              number;
  reincidentes:           number;
  pctReincidentes:        number;
  mediaOps:               number;
  totalRetentativas?:     number;
  pctRetentativas?:       number;
  convPrimeiraTentativa:  number;
  convReincidentes:       number;
  totalQuebrou:           number;
  tentativasDistribuicao: TentativaGrupo[];
  primeiraQuebra:         QuebraFase[];
  progresso?:             ProgressoData;
  tempoEntreAtividades: {
    mediana: number | null;
    media:   number | null;
    distribuicao: { faixa: string; total: number }[];
  };
}

export interface DashboardData {
  operacoesPorFase:  FaseCount[];
  volumePorData:     VolumeData[];
  tempoMedioPorFase: TempoFase[];
  topUsuarios:       UsuarioData[];
  topCpfs?:          TopCpf[];
  distribuicaoFases: FaseCount[];
  evolucaoMensal:    EvolucaoMensal[];
  kpis:              DashboardKpis;
  colunas:           string[];
  primeiraLinha:     TabelaRow | null;
  transicoes:        FaseTransicao[];
  macrofaseTotais:   MacrofaseTotal[];
}
