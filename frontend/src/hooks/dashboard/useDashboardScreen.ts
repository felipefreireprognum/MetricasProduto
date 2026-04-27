'use client';

import { useCache } from '@/contexts/CacheContext';
import { useFilters } from '@/contexts/FiltersContext';

export function useDashboardScreen() {
  const { bancosCache, loading } = useCache();
  const { removedBancoIds } = useFilters();

  const active = bancosCache.filter((b) => !removedBancoIds.includes(b.id));

  const dataC6    = active.find((b) => b.id === 'c6')?.data    ?? null;
  const dataInter = active.find((b) => b.id === 'inter')?.data ?? null;

  // Global: single active bank → use its data directly
  // Multi-bank combination is handled by the backend /dashboard/global endpoint (future)
  const dataGlobal = active.length === 1 ? (active[0]?.data ?? null) : (active[0]?.data ?? null);

  const hasData    = !!dataGlobal;
  const fromCache  = active.some((b) => b.fromCache);
  const lastUpdated = active
    .map((b) => b.lastUpdated)
    .filter(Boolean)
    .join(' · ') || null;

  return { dataC6, dataInter, dataGlobal, loading, hasData, fromCache, lastUpdated };
}
