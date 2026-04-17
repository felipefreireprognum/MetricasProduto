import { api } from './api';
import type { TabelaRow } from '@/types/dashboard';

export const databaseService = {
  async listarTabelas(): Promise<string[]> {
    const { data } = await api.get<string[]>('/tabelas');
    return data;
  },

  async buscarTabela(nome: string, limit = 500, offset = 0): Promise<TabelaRow[]> {
    const { data } = await api.get<TabelaRow[]>(`/tabela/${nome}`, {
      params: { limit, offset },
    });
    return data;
  },

  async executarQuery(sql: string): Promise<TabelaRow[]> {
    const { data } = await api.get<TabelaRow[]>('/query', { params: { sql } });
    return data;
  },
};
