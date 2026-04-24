import { api } from './api';
import type { TabelaRow } from '@/types/dashboard';

function buildWhere(inicio?: string | null, fim?: string | null): string {
  const parts: string[] = [];
  if (inicio) parts.push(`h.DT_INICIO_FASE >= '${inicio}'`);
  if (fim)    parts.push(`h.DT_INICIO_FASE <= '${fim}'`);
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
}

export const databaseService = {
  async lerCache(banco: string): Promise<{ existe: boolean; dados: TabelaRow[]; savedAt: string | null }> {
    const { data } = await api.get<{ existe: boolean; dados: TabelaRow[]; total: number; savedAt: string | null }>('/cache', {
      params: { banco },
    });
    return data;
  },

  async atualizarCache(banco: string, limit: number): Promise<{ dados: TabelaRow[]; savedAt: string }> {
    const { data } = await api.get<{ dados: TabelaRow[]; total: number; savedAt: string }>('/cache/refresh', {
      params: { banco, limit },
    });
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

  async buscarHistoricoComFase(
    limit: number,
    inicio?: string | null,
    fim?: string | null,
  ): Promise<TabelaRow[]> {
    const where = buildWhere(inicio, fim);
    const sql = `SELECT FIRST ${limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO FROM HISTORICO_OPERACAO h LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO${where} ORDER BY h.DT_INICIO_FASE DESC`;
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

    async buscarHistoricoComFase(
      limit: number,
      inicio?: string | null,
      fim?: string | null,
    ): Promise<TabelaRow[]> {
      const where = buildWhere(inicio, fim);
      const sql = `SELECT TOP ${limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO FROM HISTORICO_OPERACAO h LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO${where}`;
      const { data } = await api.get<{ dados: TabelaRow[] }>('/inter/query', { params: { sql } });
      return data.dados;
    },
  },
};
