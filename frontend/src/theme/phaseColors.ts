// ── Macrofase colors ──────────────────────────────────────────────────────────
// Single source of truth for all phase-related colors used across the app.

/** Main accent color per macrofase (for dots, bars, text highlights). */
export const MACROFASE_COLOR: Record<string, string> = {
  'Simulação':              '#94A3B8',
  'Cadastro':               '#3B82F6',
  'Crédito':                '#8B5CF6',
  'Negociação':             '#F59E0B',
  'Análise de Documentos':  '#EC4899',
  'Análise Técnica':        '#F97316',
  'Formalização':           '#10B981',
  'Liberação':              '#06B6D4',
  'Concluído':              '#16A34A',
  'Cancelada':              '#EF4444',
  'Desconhecida':           '#94A3B8',
  // backward compat — Parquet legado com nomenclatura anterior
  'Emissão de Contrato':    '#10B981',
  'Registro de Contratos':  '#06B6D4',
};

/** Badge style (subtle bg + strong text) for inline macrofase pills. */
export const MACROFASE_BADGE: Record<string, { bg: string; color: string }> = {
  'Simulação':              { bg: '#F1F5F9', color: '#475569' },
  'Cadastro':               { bg: '#EFF6FF', color: '#1D4ED8' },
  'Crédito':                { bg: '#F5F3FF', color: '#6D28D9' },
  'Negociação':             { bg: '#FFF7ED', color: '#C2410C' },
  'Análise de Documentos':  { bg: '#FAF5FF', color: '#7E22CE' },
  'Análise Técnica':        { bg: '#EEF2FF', color: '#4338CA' },
  'Formalização':           { bg: '#F0FDFA', color: '#0F766E' },
  'Liberação':              { bg: '#ECFEFF', color: '#0E7490' },
  'Concluído':              { bg: '#F0FDF4', color: '#166534' },
  'Cancelada':              { bg: '#FFF1F2', color: '#BE123C' },
  'Desconhecida':           { bg: '#F8FAFC', color: '#94A3B8' },
  // backward compat — Parquet legado com nomenclatura anterior
  'Emissão de Contrato':    { bg: '#F0FDFA', color: '#0F766E' },
  'Registro de Contratos':  { bg: '#ECFEFF', color: '#0E7490' },
};

/** Pipeline stage order (excludes Cancelada which is a terminal state). */
export const PIPELINE_STAGES: { id: string; color: string }[] = [
  { id: 'Simulação',             color: MACROFASE_COLOR['Simulação']             },
  { id: 'Cadastro',              color: MACROFASE_COLOR['Cadastro']              },
  { id: 'Crédito',               color: MACROFASE_COLOR['Crédito']               },
  { id: 'Negociação',            color: MACROFASE_COLOR['Negociação']            },
  { id: 'Análise de Documentos', color: MACROFASE_COLOR['Análise de Documentos'] },
  { id: 'Análise Técnica',       color: MACROFASE_COLOR['Análise Técnica']       },
  { id: 'Emissão de Contrato',   color: MACROFASE_COLOR['Emissão de Contrato']   },
  { id: 'Concluído',             color: MACROFASE_COLOR['Concluído']             },
];

/** Ordered macrofase list for grouping / iteration. */
export const MACROFASE_ORDER: string[] = [
  'Simulação', 'Cadastro', 'Crédito', 'Negociação',
  'Análise de Documentos', 'Análise Técnica',
  'Emissão de Contrato', 'Formalização', 'Liberação',
  'Concluído', 'Cancelada',
  'Registro de Contratos',
];

// ── Banco colors ──────────────────────────────────────────────────────────────

export interface BancoChip {
  bg:    string;
  color: string;
  label: string;
}

/** Badge / chip style per banco ID. */
export const BANCO_CHIP: Record<string, BancoChip> = {
  c6:    { bg: '#0D0D0D', color: '#FFFFFF', label: 'C6 Bank'     },
  inter: { bg: '#FF8700', color: '#FFFFFF', label: 'Banco Inter' },
};
