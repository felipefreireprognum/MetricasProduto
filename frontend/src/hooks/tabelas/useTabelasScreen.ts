'use client';

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import type { TabelaRow } from '@/types/dashboard';

export function useTabelasScreen() {
  const [tabelas, setTabelas] = useState<string[]>([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState('');
  const [rows, setRows] = useState<TabelaRow[]>([]);
  const [limite, setLimite] = useState(500);
  const [sqlCustom, setSqlCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTabelas, setLoadingTabelas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    databaseService.listarTabelas()
      .then((lista) => {
        setTabelas(lista);
        if (lista.length > 0) setTabelaSelecionada(lista[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTabelas(false));
  }, []);

  const fetchTabela = useCallback(async (nome: string, lim: number) => {
    if (!nome) return;
    setLoading(true);
    setError(null);
    try {
      const data = await databaseService.buscarTabela(nome, lim);
      setRows(data);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return {
    tabelas, loadingTabelas,
    tabelaSelecionada, setTabelaSelecionada,
    rows,
    limite, setLimite,
    sqlCustom, setSqlCustom,
    loading, error,
    executarSql,
  };
}
