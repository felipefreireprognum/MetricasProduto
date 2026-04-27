'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { BANKS } from '@/constants/banks';
import { databaseService } from '@/services/databaseService';
import type { DashboardData } from '@/types/dashboard';

const ENABLED_BANKS = BANKS.filter((b) => b.enabled);

export const LIMITE_OPTIONS = [20000, 50000, 100000, 200000] as const;

export interface BancoCache {
  id:          string;
  name:        string;
  ambiente:    string;
  colors:      { bg: string; text: string };
  data:        DashboardData | null;
  lastUpdated: string | null;
  fromCache:   boolean;
  refreshing:  boolean;
  error:       string | null;
  limite:      number;
}

interface CacheContextValue {
  bancosCache:    BancoCache[];
  loading:        boolean;
  fetchBanco:     (id: string) => Promise<void>;
  expandBanco:    (id: string) => Promise<void>;
  setLimiteBanco: (id: string, limite: number) => void;
}

const CacheContext = createContext<CacheContextValue | null>(null);

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function CacheProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [bancosCache, setBancosCache] = useState<BancoCache[]>(
    ENABLED_BANKS.map((b) => ({
      id: b.id, name: b.name, ambiente: b.ambiente, colors: b.colors,
      data: null, lastUpdated: null, fromCache: false, refreshing: false, error: null,
      limite: 20000,
    }))
  );

  function update(id: string, patch: Partial<BancoCache>) {
    setBancosCache((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }

  useEffect(() => {
    setLoading(true);
    Promise.allSettled(ENABLED_BANKS.map((b) => databaseService.getDashboard(b.id, b.ambiente)))
      .then((results) => {
        setBancosCache((prev) => prev.map((bs, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value.existe) {
            return {
              ...bs,
              data: r.value.data,
              lastUpdated: r.value.savedAt ? formatSavedAt(r.value.savedAt) : null,
              fromCache: true,
            };
          }
          return bs;
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchBanco = useCallback(async (id: string) => {
    const bs = bancosCache.find((b) => b.id === id);
    if (!bs) return;
    update(id, { refreshing: true, error: null });
    try {
      const { data, savedAt } = await databaseService.atualizarCache(id, bs.limite, bs.ambiente);
      update(id, { data, lastUpdated: formatSavedAt(savedAt), fromCache: false, refreshing: false, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      console.error(`[CacheContext] fetchBanco(${id}):`, msg);
      update(id, { refreshing: false, error: msg });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancosCache]);

  const expandBanco = useCallback(async (id: string) => {
    const bs = bancosCache.find((b) => b.id === id);
    if (!bs) return;
    update(id, { refreshing: true, error: null });
    try {
      const { data, savedAt } = await databaseService.expandirCache(id, bs.limite, bs.ambiente);
      update(id, { data, lastUpdated: formatSavedAt(savedAt), fromCache: false, refreshing: false, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao expandir';
      console.error(`[CacheContext] expandBanco(${id}):`, msg);
      update(id, { refreshing: false, error: msg });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancosCache]);

  const setLimiteBanco = useCallback((id: string, limite: number) => {
    update(id, { limite });
  }, []);

  return (
    <CacheContext.Provider value={{ bancosCache, loading, fetchBanco, expandBanco, setLimiteBanco }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error('useCache must be used within CacheProvider');
  return ctx;
}
