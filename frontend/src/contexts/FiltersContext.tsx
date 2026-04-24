'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// ── Period presets ────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export interface PeriodoPreset {
  label: string;
  inicio: string | null;
  fim: string | null;
}

export const PERIODO_PRESETS: PeriodoPreset[] = [
  { label: 'Todos os períodos', inicio: null,            fim: null         },
  { label: 'Últimos 3 meses',   inicio: monthsAgo(3),   fim: today()      },
  { label: 'Últimos 6 meses',   inicio: monthsAgo(6),   fim: today()      },
  { label: 'Últimos 12 meses',  inicio: monthsAgo(12),  fim: today()      },
  { label: '2025',               inicio: '2025-01-01',   fim: '2025-12-31' },
  { label: '2024',               inicio: '2024-01-01',   fim: '2024-12-31' },
];

// ── Context ───────────────────────────────────────────────────────────────────

interface FiltersContextValue {
  periodoInicio: string | null;
  periodoFim: string | null;
  periodoLabel: string;
  setPeriodo: (p: PeriodoPreset) => void;
  removedBancoIds: string[];
  toggleBanco: (id: string) => void;
  isBancoRemovido: (id: string) => boolean;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodoState] = useState<PeriodoPreset>(PERIODO_PRESETS[0]);
  const [removedBancoIds, setRemovedBancoIds] = useState<string[]>([]);

  const setPeriodo = (p: PeriodoPreset) => setPeriodoState(p);

  const toggleBanco = (id: string) =>
    setRemovedBancoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const isBancoRemovido = (id: string) => removedBancoIds.includes(id);

  return (
    <FiltersContext.Provider
      value={{
        periodoInicio: periodo.inicio,
        periodoFim: periodo.fim,
        periodoLabel: periodo.label,
        setPeriodo,
        removedBancoIds,
        toggleBanco,
        isBancoRemovido,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
}
