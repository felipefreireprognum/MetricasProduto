'use client';

import { useState, useEffect } from 'react';
import { useCache } from '@/contexts/CacheContext';
import { useFilters } from '@/contexts/FiltersContext';
import { databaseService } from '@/services/databaseService';
import type { DashboardData } from '@/types/dashboard';

export function useDashboardScreen() {
  const { bancosCache, loading: cacheLoading } = useCache();
  const { removedBancoIds, periodoInicio, periodoFim } = useFilters();

  const [filteredData, setFilteredData]     = useState<DashboardData | null>(null);
  const [filterLoading, setFilterLoading]   = useState(false);

  const active      = bancosCache.filter((b) => !removedBancoIds.includes(b.id));
  const activeBank  = active[0];
  const cachedData  = activeBank?.data ?? null;

  const hasPeriod = !!(periodoInicio || periodoFim);

  useEffect(() => {
    if (!hasPeriod) {
      setFilteredData(null);
      return;
    }
    if (!activeBank?.id) return;

    let cancelled = false;
    setFilterLoading(true);
    databaseService
      .getDashboard(activeBank.id, activeBank.ambiente, periodoInicio ?? undefined, periodoFim ?? undefined)
      .then(result => {
        if (!cancelled) setFilteredData(result.data);
      })
      .catch(() => { if (!cancelled) setFilteredData(null); })
      .finally(() => { if (!cancelled) setFilterLoading(false); });

    return () => { cancelled = true; };
  }, [periodoInicio, periodoFim, activeBank?.id, activeBank?.ambiente, hasPeriod]);

  const dataC6    = active.find((b) => b.id === 'c6')?.data    ?? null;
  const dataInter = active.find((b) => b.id === 'inter')?.data ?? null;
  const dataGlobal = hasPeriod ? filteredData : cachedData;
  const loading    = cacheLoading || filterLoading;
  const hasData    = !!dataGlobal;
  const fromCache  = !hasPeriod && active.some((b) => b.fromCache);
  const lastUpdated = active
    .map((b) => b.lastUpdated)
    .filter(Boolean)
    .join(' · ') || null;

  return { dataC6, dataInter, dataGlobal, loading, hasData, fromCache, lastUpdated };
}
