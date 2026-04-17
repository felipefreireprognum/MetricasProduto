'use client';

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import type { TabelaRow, DashboardData } from '@/types/dashboard';
import { buildDashboardData } from '@/utils/mappers/dashboardMapper';

export function useDashboardScreen() {
  const [tabelas, setTabelas] = useState<string[]>([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('HISTORICO_OPERACAO');
  const [rows, setRows] = useState<TabelaRow[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [limite, setLimite] = useState(500);
  const [sqlCustom, setSqlCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTabelas, setLoadingTabelas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    databaseService.listarTabelas()
      .then(setTabelas)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTabelas(false));
  }, []);

  const fetchTabela = useCallback(async (nome: string, lim: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await databaseService.buscarTabela(nome, lim);
      setRows(data);
      if (nome === 'HISTORICO_OPERACAO') {
        setDashboardData(buildDashboardData(data));
      } else {
        setDashboardData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabelaSelecionada) fetchTabela(tabelaSelecionada, limite);
  }, [tabelaSelecionada, limite, fetchTabela]);

  async function executarSql() {
    if (!sqlCustom.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await databaseService.executarQuery(sqlCustom);
      setRows(data);
      setDashboardData(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return {
    tabelas, loadingTabelas,
    tabelaSelecionada, setTabelaSelecionada,
    rows, dashboardData,
    limite, setLimite,
    sqlCustom, setSqlCustom,
    loading, error,
    executarSql,
  };
}
