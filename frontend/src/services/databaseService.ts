import { api } from './api';
import type { TabelaRow, DashboardData, JornadaData } from '@/types/dashboard';

export const databaseService = {
  async getDashboard(banco: string, ambiente?: string, inicio?: string, fim?: string): Promise<{ existe: boolean; data: DashboardData | null; savedAt: string | null }> {
    const { data } = await api.get<{ existe: boolean; data: DashboardData | null; savedAt: string | null }>('/dashboard', {
      params: {
        banco,
        ...(ambiente && { ambiente }),
        ...(inicio   && { inicio }),
        ...(fim      && { fim }),
      },
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

  async parquetInfo(banco: string, ambiente?: string): Promise<{ existe: boolean; total?: number; colunas?: string[]; dtInicio?: string; dtFim?: string; macrofases?: string[]; fases?: string[]; bancos?: string[]; ambientes?: string[] }> {
    const { data } = await api.get('/parquet/info', { params: { banco, ...(ambiente && { ambiente }) } });
    return data;
  },

  async parquetDados(
    banco: string,
    ambiente?: string,
    limit = 100,
    offset = 0,
    ordem = 'DT_INICIO_FASE',
    desc = true,
    busca?: string,
    macrofase?: string,
    fase_nome?: string,
  ): Promise<{ total: number; offset: number; limit: number; dados: Record<string, unknown>[] }> {
    const { data } = await api.get('/parquet/dados', {
      params: {
        banco,
        ...(ambiente   && { ambiente }),
        limit, offset, ordem, desc,
        ...(busca      && { busca }),
        ...(macrofase  && { macrofase }),
        ...(fase_nome  && { fase_nome }),
      },
    });
    return data;
  },

  async exportCsv(params: {
    banco:       string;
    ambiente?:   string;
    limit?:      number;
    macrofases?: string;
    fase_nome?:  string;
  }): Promise<void> {
    const { data, headers } = await api.get('/parquet/export', {
      params: { ...params },
      responseType: 'blob',
    });
    const blob = new Blob([data as BlobPart], { type: 'text/csv;charset=utf-8-sig' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const cd   = (headers as Record<string, string>)['content-disposition'] ?? '';
    const m    = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    a.download = m ? m[1].replace(/['"]/g, '') : `metricas_${params.banco}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async getJornada(banco: string, ambiente?: string): Promise<JornadaData> {
    const { data } = await api.get<JornadaData>('/jornada', {
      params: { banco, ...(ambiente && { ambiente }) },
    });
    return data;
  },

  async getFases(banco: string): Promise<{ cod: number; nome: string; macrofase: string; banco: string }[]> {
    const { data } = await api.get<{ fases: { cod: number; nome: string; macrofase: string; banco: string }[] }>('/fases', { params: { banco } });
    return data.fases ?? [];
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
