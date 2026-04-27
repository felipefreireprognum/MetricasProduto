import { api } from './api';
import type { TabelaRow, DashboardData } from '@/types/dashboard';

export const databaseService = {
  async getDashboard(banco: string, ambiente?: string): Promise<{ existe: boolean; data: DashboardData | null; savedAt: string | null }> {
    const { data } = await api.get<{ existe: boolean; data: DashboardData | null; savedAt: string | null }>('/dashboard', {
      params: { banco, ...(ambiente && { ambiente }) },
    });
    return data;
  },

  async atualizarCache(banco: string, limit: number, ambiente?: string): Promise<{ data: DashboardData; savedAt: string }> {
    const { data } = await api.get<{ data: DashboardData; savedAt: string }>('/cache/refresh', {
      params: { banco, limit, ...(ambiente && { ambiente }) },
    });
    return data;
  },

  async expandirCache(banco: string, limit: number, ambiente?: string): Promise<{ data: DashboardData; savedAt: string; adicionados: number }> {
    const { data } = await api.get<{ data: DashboardData; savedAt: string; adicionados: number }>('/cache/expand', {
      params: { banco, limit, ...(ambiente && { ambiente }) },
    });
    return data;
  },

  async parquetInfo(banco: string, ambiente?: string): Promise<{ existe: boolean; total?: number; colunas?: string[]; dtInicio?: string; dtFim?: string }> {
    const { data } = await api.get('/parquet/info', { params: { banco, ...(ambiente && { ambiente }) } });
    return data;
  },

  async parquetDados(banco: string, ambiente?: string, limit = 100, offset = 0, ordem = 'DT_INICIO_FASE', desc = true): Promise<{ total: number; offset: number; limit: number; dados: Record<string, unknown>[] }> {
    const { data } = await api.get('/parquet/dados', { params: { banco, ...(ambiente && { ambiente }), limit, offset, ordem, desc } });
    return data;
  },

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

  inter: {
    async listarTabelas(): Promise<string[]> {
      const { data } = await api.get<{ tabelas: string[] }>('/inter/tabelas');
      return data.tabelas;
    },

    async buscarTabela(nome: string, limit = 500, offset = 0): Promise<TabelaRow[]> {
      const { data } = await api.get<{ dados: TabelaRow[] }>(`/inter/tabela/${nome}`, {
        params: { limit, offset },
      });
      return data.dados;
    },

    async executarQuery(sql: string): Promise<TabelaRow[]> {
      const { data } = await api.get<{ dados: TabelaRow[] }>('/inter/query', { params: { sql } });
      return data.dados;
    },
  },
};
