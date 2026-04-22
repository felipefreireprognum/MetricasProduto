'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import type { TabelaRow } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';
import { bankTokens } from '@/theme/tokens';

interface Props {
  rows: TabelaRow[];
  tokens?: BankTokens;
}

type SortDir = 'asc' | 'desc' | null;

export default function GenericTableView({ rows, tokens: t = bankTokens.default }: Props) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  if (!rows.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl text-sm" style={{ color: t.text.muted, backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
        Nenhum dado encontrado
      </div>
    );
  }

  const cols = Object.keys(rows[0]);

  function handleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null); setSortDir(null);
  }

  function setFilter(col: string, val: string) {
    setFilters((prev) => ({ ...prev, [col]: val }));
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== '');

  const processed = useMemo(() => {
    let data = [...rows];

    // Filtros
    for (const [col, val] of activeFilters) {
      const lower = val.toLowerCase();
      data = data.filter((r) => String(r[col] ?? '').toLowerCase().includes(lower));
    }

    // Ordenação
    if (sortCol && sortDir) {
      data.sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return data;
  }, [rows, filters, sortCol, sortDir]);

  return (
    <div style={{ borderTop: `1px solid ${t.border.default}`, borderBottom: `1px solid ${t.border.default}` }}>
      {/* Barra de filtros ativos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ backgroundColor: t.bg.elevated, borderBottom: `1px solid ${t.border.default}` }}>
          <span className="text-xs font-medium" style={{ color: t.text.muted }}>Filtros:</span>
          {activeFilters.map(([col, val]) => (
            <span key={col} className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${t.accent.primary}15`, color: t.accent.primary }}>
              <span className="font-bold">{col}</span>: {val}
              <button onClick={() => setFilter(col, '')} className="hover:opacity-70">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={() => setFilters({})}
            className="ml-auto text-xs hover:opacity-70"
            style={{ color: t.text.muted }}
          >
            Limpar tudo
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: t.bg.elevated }}>
            {/* Linha de headers clicáveis */}
            <tr>
              {cols.map((col) => {
                const isActive = sortCol === col;
                return (
                  <th
                    key={col}
                    className="group cursor-pointer select-none px-4 py-3 text-left whitespace-nowrap"
                    style={{ borderBottom: `1px solid ${t.border.default}`, color: isActive ? t.accent.primary : t.text.secondary }}
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide">{col}</span>
                      <span style={{ color: isActive ? t.accent.primary : t.text.muted }} className="opacity-40 group-hover:opacity-100 transition-opacity">
                        {isActive && sortDir === 'asc'  ? <ArrowUp size={12} /> :
                         isActive && sortDir === 'desc' ? <ArrowDown size={12} /> :
                         <ArrowUpDown size={11} />}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Linha de filtros */}
            <tr>
              {cols.map((col) => (
                <th key={col} className="px-2 py-1.5" style={{ borderBottom: `2px solid ${t.border.default}`, backgroundColor: t.bg.elevated }}>
                  <input
                    type="text"
                    value={filters[col] ?? ''}
                    onChange={(e) => setFilter(col, e.target.value)}
                    placeholder="Filtrar…"
                    className="w-full rounded-lg px-2.5 py-1 text-xs transition focus:outline-none"
                    style={{
                      backgroundColor: t.bg.surface,
                      border: `1px solid ${filters[col] ? t.accent.primary : t.border.default}`,
                      color: t.text.primary,
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.slice(0, 500).map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${t.border.subtle}`, backgroundColor: i % 2 === 0 ? t.bg.surface : t.bg.elevated }}
              >
                {cols.map((col) => (
                  <td key={col} className="px-4 py-2.5 whitespace-nowrap max-w-[220px] truncate" style={{ color: t.text.primary }}>
                    {row[col] == null
                      ? <span style={{ color: t.text.muted }}>—</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {processed.length === 0 && (
          <div className="flex h-20 items-center justify-center text-sm" style={{ color: t.text.muted }}>
            Nenhum resultado para os filtros aplicados
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${t.border.default}`, backgroundColor: t.bg.elevated }}>
        <span className="text-xs" style={{ color: t.text.muted }}>
          {processed.length < rows.length
            ? <><strong style={{ color: t.text.primary }}>{processed.length}</strong> de {rows.length} registros</>
            : <><strong style={{ color: t.text.primary }}>{rows.length}</strong> registros</>}
        </span>
        {sortCol && (
          <span className="text-xs" style={{ color: t.text.muted }}>
            Ordenado por <strong style={{ color: t.text.primary }}>{sortCol}</strong> ({sortDir === 'asc' ? '↑ A→Z' : '↓ Z→A'})
          </span>
        )}
      </div>
    </div>
  );
}
