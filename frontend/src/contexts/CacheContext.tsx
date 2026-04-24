'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { BANKS } from '@/constants/banks';
import { databaseService } from '@/services/databaseService';
import type { TabelaRow } from '@/types/dashboard';

const ENABLED_BANKS = BANKS.filter((b) => b.enabled);

export const LIMITE_OPTIONS = [20000, 50000, 100000, 200000] as const;

export interface BancoCache {
  id:          string;
  name:        string;
  colors:      { bg: string; text: string };
  rows:        TabelaRow[];
  lastUpdated: string | null;
  fromCache:   boolean;
  refreshing:  boolean;
  limite:      number;
}

interface CacheContextValue {
  bancosCache:    BancoCache[];
  loading:        boolean;
  fetchBanco:     (id: string) => Promise<void>;
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
      id: b.id, name: b.name, colors: b.colors,
      rows: [], lastUpdated: null, fromCache: false, refreshing: false,
      limite: 20000,
    }))
  );

  function update(id: string, patch: Partial<BancoCache>) {
    setBancosCache((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }

  // Load CSV caches on mount
  useEffect(() => {
    setLoading(true);
    Promise.allSettled(ENABLED_BANKS.map((b) => databaseService.lerCache(b.id)))
      .then((results) => {
        setBancosCache((prev) => prev.map((bs, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value.existe) {
            return {
              ...bs,
              rows: r.value.dados,
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
    update(id, { refreshing: true });
    try {
      const { dados, savedAt } = await databaseService.atualizarCache(id, bs.limite);
      update(id, { rows: dados, lastUpdated: formatSavedAt(savedAt), fromCache: false, refreshing: false });
    } catch {
      update(id, { refreshing: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancosCache]);

  const setLimiteBanco = useCallback((id: string, limite: number) => {
    update(id, { limite });
  }, []);

  return (
    <CacheContext.Provider value={{ bancosCache, loading, fetchBanco, setLimiteBanco }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error('useCache must be used within CacheProvider');
  return ctx;
}
