'use client';

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import { BANKS } from '@/constants/banks';
import type { TabelaRow } from '@/types/dashboard';

// Only show enabled banks
export const TABELAS_BANKS = BANKS.filter((b) => b.enabled);

// Route calls to the correct service based on bank id
function getService(bancoId: string) {
  if (bancoId === 'inter') return databaseService.inter;
  return databaseService;
}

export function useTabelasScreen() {
  const [bancoId, setBancoId]                   = useState(TABELAS_BANKS[0]?.id ?? 'c6');
  const [tabelas, setTabelas]                   = useState<string[]>([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState('');
  const [rows, setRows]                         = useState<TabelaRow[]>([]);
  const [limite, setLimite]                     = useState(500);
  const [sqlCustom, setSqlCustom]               = useState('');
  const [loading, setLoading]                   = useState(false);
  const [loadingTabelas, setLoadingTabelas]      = useState(true);
  const [error, setError]                       = useState<string | null>(null);

  // Re-fetch table list whenever the bank changes
  useEffect(() => {
    setLoadingTabelas(true);
    setTabelas([]);
    setTabelaSelecionada('');
    setRows([]);
    setError(null);

    getService(bancoId).listarTabelas()
      .then((lista) => {
        setTabelas(lista);
        if (lista.length > 0) setTabelaSelecionada(lista[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTabelas(false));
  }, [bancoId]);

  const fetchTabela = useCallback(async (nome: string, lim: number) => {
    if (!nome) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getService(bancoId).buscarTabela(nome, lim);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [bancoId]);

  useEffect(() => {
    if (tabelaSelecionada) fetchTabela(tabelaSelecionada, limite);
  }, [tabelaSelecionada, limite, fetchTabela]);

  async function executarSql() {
    if (!sqlCustom.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getService(bancoId).executarQuery(sqlCustom);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return {
    bancoId, setBancoId,
    tabelas, loadingTabelas,
    tabelaSelecionada, setTabelaSelecionada,
    rows,
    limite, setLimite,
    sqlCustom, setSqlCustom,
    loading, error,
    executarSql,
  };
}
