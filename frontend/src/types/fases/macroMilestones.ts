import type { FaseCount, TempoFase, FaseTransicao, MacrofaseTotal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

export interface Saida {
  para: number;
  nome: string;
  qtd:  number;
}

export interface Entrada {
  de:   number;
  nome: string;
  qtd:  number;
}

export interface PhaseDetail {
  fase:        number;
  nome:        string;
  total:       number;
  tempo:       number | null;
  abandono:    number;
  emAndamento: number;
  saidas:      Saida[];
  entradas:    Entrada[];
}

export interface MacrofaseRow {
  id:          string;
  label:       string;
  color:       string;
  count:       number;
  avgTempo:    number | null;
  abandono:    number;
  emAndamento: number;
  phases:      PhaseDetail[];
  reprovados?: number;
}

export interface HoverState {
  row: MacrofaseRow;
  x:   number;
  y:   number;
}

export interface MacroMilestonesProps {
  fases:            FaseCount[];
  tempos:           TempoFase[];
  tokens:           BankTokens;
  mode?:            'funnel' | 'detail' | 'expand' | 'chevron';
  transicoes?:      FaseTransicao[];
  macrofaseTotais?: MacrofaseTotal[];
  dimensao?:        'operacoes' | 'cpf';
}