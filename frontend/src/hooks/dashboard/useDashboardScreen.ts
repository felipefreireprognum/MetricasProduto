'use client';

import { useMemo } from 'react';
import { useCache } from '@/contexts/CacheContext';
import { useFilters } from '@/contexts/FiltersContext';
import { buildDashboardData } from '@/utils/mappers/dashboardMapper';

export function useDashboardScreen() {
  const { bancosCache, loading } = useCache();
  const { removedBancoIds } = useFilters();

  const active = bancosCache.filter((b) => !removedBancoIds.includes(b.id));

  const dataC6 = useMemo(() => {
    const rows = active.find((b) => b.id === 'c6')?.rows ?? [];
    return rows.length ? buildDashboardData(rows) : null;
  }, [active]);

  const dataInter = useMemo(() => {
    const rows = active.find((b) => b.id === 'inter')?.rows ?? [];
    return rows.length ? buildDashboardData(rows) : null;
  }, [active]);

  const dataGlobal = useMemo(() => {
    const all = active.flatMap((b) => b.rows);
    return all.length ? buildDashboardData(all) : null;
  }, [active]);

  const hasData   = !!dataGlobal;
  const fromCache = active.some((b) => b.fromCache);
  const lastUpdated = active
    .map((b) => b.lastUpdated)
    .filter(Boolean)
    .join(' · ') || null;

  return { dataC6, dataInter, dataGlobal, loading, hasData, fromCache, lastUpdated };
}
