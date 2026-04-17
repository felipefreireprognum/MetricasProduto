export interface Ag31Metrics {
  // Base Principal — Contratos
  PRI_CTR_ATIVOS?: number;
  PRI_CTR_INATIVOS?: number;
  PRI_CTR_COM_FCVS?: number;
  PRI_CTR_SEM_FCVS?: number;
  PRI_CTR_COM_SERIE?: number;
  PRI_CTR_SEM_SERIE?: number;
  PRI_CTR_PREST_EMITIDAS?: number;
  PRI_CTR_BAIXAS?: number;
  // Base Finalizados — Contratos
  FIN_CTR_ATIVOS?: number;
  FIN_CTR_INATIVOS?: number;
  FIN_CTR_COM_FCVS?: number;
  FIN_CTR_SEM_FCVS?: number;
  // Imóveis
  PRI_IMV_CADASTRADOS?: number;
  PRI_IMV_VAGOS_NOVOS?: number;
  PRI_IMV_VAGOS_RETOMADOS?: number;
  PRI_IMV_OCUPADOS_ATIVOS?: number;
  PRI_IMV_OCUPADOS_INATIVOS?: number;
  // Originação
  ORI_INICIADAS?: number;
  ORI_CONCLUIDAS?: number;
  ORI_APOS_AVALIACAO?: number;
  ORI_APOS_ASSINATURA?: number;
  [key: string]: number | string | undefined;
}

export interface Ag31Bank {
  nome: string;
  sigla: 'sicredi' | 'c6' | 'itau';
  metrics: Ag31Metrics;
  rawFields: string[];
}

export interface ComparativoRow {
  campo: string;
  sicredi: number | string;
  c6: number | string;
  itau: number | string;
  status: string[];
}
