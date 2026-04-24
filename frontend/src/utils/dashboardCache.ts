import type { TabelaRow } from '@/types/dashboard';

const KEY = 'metricas_cache_v1';

export interface CacheEntry {
  rows: TabelaRow[];
  savedAt: string;
  limite: number;
}

export function saveCache(rows: TabelaRow[], limite: number): void {
  try {
    const entry: CacheEntry = { rows, savedAt: new Date().toISOString(), limite };
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // quota exceeded — ignore silently
  }
}

export function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

export function clearCache(): void {
  localStorage.removeItem(KEY);
}

export function formatCacheDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
