'use client';

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import type { TabelaRow, DashboardData } from '@/types/dashboard';
import { buildDashboardData } from '@/utils/mappers/dashboardMapper';

export const LIMITE_OPTIONS = [500, 1000, 2000, 5000] as const;

export function useDashboardScreen() {
  const [rows, setRows] = useState<TabelaRow[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [limite, setLimite] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMetricas = useCallback(async (lim: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await databaseService.buscarHistoricoComFase(lim);
      setRows(data);
      setDashboardData(buildDashboardData(data));
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetricas(limite);
  }, [limite, fetchMetricas]);

  return {
    rows, dashboardData,
    limite, setLimite,
    loading, error,
    fetchMetricas: () => fetchMetricas(limite),
    lastUpdated,
  };
}
