import { api } from './api';
import type { TabelaRow } from '@/types/dashboard';

export const databaseService = {
  async listarTabelas(): Promise<string[]> {
    const { data } = await api.get<{ tabelas: string[] }>('/tabelas');
    return data.tabelas;
  },

  async buscarTabela(nome: string, limit = 500, offset = 0): Promise<TabelaRow[]> {
    const { data } = await api.get<{ dados: TabelaRow[] }>(`/tabela/${nome}`, {
      params: { limit, offset },
    });
    return data.dados;
  },

  async executarQuery(sql: string): Promise<TabelaRow[]> {
    const { data } = await api.get<{ dados: TabelaRow[] }>('/query', { params: { sql } });
    return data.dados;
  },

  async buscarHistoricoComFase(limit: number): Promise<TabelaRow[]> {
    const sql = `SELECT FIRST ${limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO FROM HISTORICO_OPERACAO h LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO`;
    const { data } = await api.get<{ dados: TabelaRow[] }>('/query', { params: { sql } });
    return data.dados;
  },
};
