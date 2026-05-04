'use client';

import { useState } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFilters, PERIODO_PRESETS, type PeriodoPreset } from '@/contexts/FiltersContext';
import type { BankTokens } from '@/theme/tokens';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function firstDay(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
function lastDay(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}
function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  tokens: BankTokens;
  onClose: () => void;
}

export function DateFilterModal({ tokens: t, onClose }: Props) {
  const { periodoInicio, periodoFim, periodoLabel, setPeriodo } = useFilters();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  const [gridYear, setGridYear] = useState(currentYear);
  const [localInicio, setLocalInicio] = useState(periodoInicio ?? '');
  const [localFim, setLocalFim]     = useState(periodoFim ?? '');

  const handlePreset = (preset: PeriodoPreset) => {
    setLocalInicio(preset.inicio ?? '');
    setLocalFim(preset.fim ?? '');
  };

  const handleMonthClick = (monthIdx: number) => {
    const month        = monthIdx + 1;
    const clickedFirst = firstDay(gridYear, month);
    const clickedLast  = lastDay(gridYear, month);

    // Toggle off if clicking the exact single-month selection
    if (localInicio === clickedFirst && localFim === clickedLast) {
      setLocalInicio('');
      setLocalFim('');
      return;
    }

    // No selection yet → start single-month anchor
    if (!localInicio || !localFim) {
      setLocalInicio(clickedFirst);
      setLocalFim(clickedLast);
      return;
    }

    // Extend range towards clicked month; clicking inside resets to that month
    if (clickedFirst > localFim) {
      setLocalFim(clickedLast);
    } else if (clickedLast < localInicio) {
      setLocalInicio(clickedFirst);
    } else {
      // Inside current range → reset anchor to clicked month
      setLocalInicio(clickedFirst);
      setLocalFim(clickedLast);
    }
  };

  const handleClear = () => {
    setLocalInicio('');
    setLocalFim('');
  };

  const handleApply = () => {
    const inicio = localInicio || null;
    const fim    = localFim    || null;
    if (!inicio && !fim) {
      setPeriodo(PERIODO_PRESETS[0]);
    } else {
      const parts: string[] = [];
      if (inicio) parts.push(fmtDate(inicio));
      if (fim)    parts.push(fmtDate(fim));
      setPeriodo({ label: parts.join(' → '), inicio, fim });
    }
    onClose();
  };

  const isMonthInRange = (monthIdx: number): boolean => {
    if (!localInicio && !localFim) return false;
    const ms = firstDay(gridYear, monthIdx + 1);
    const me = lastDay(gridYear, monthIdx + 1);
    if (localInicio && localFim) return me >= localInicio && ms <= localFim;
    if (localInicio) return me >= localInicio;
    if (localFim)    return ms <= localFim;
    return false;
  };

  const isMonthStart = (monthIdx: number): boolean =>
    localInicio === firstDay(gridYear, monthIdx + 1);

  const isMonthEnd = (monthIdx: number): boolean =>
    localFim === lastDay(gridYear, monthIdx + 1);

  const isMonthExact = (monthIdx: number): boolean =>
    isMonthStart(monthIdx) && isMonthEnd(monthIdx);

  const hasLocal   = !!(localInicio || localFim);
  const hasApplied = !!(periodoInicio || periodoFim);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(15,23,42,0.45)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-[660px] max-w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.border.subtle}` }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: t.accent.primary }} />
            <span className="text-sm font-semibold" style={{ color: t.text.primary }}>
              Filtrar por período
            </span>
            {hasApplied && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: `${t.accent.primary}15`, color: t.accent.primary }}
              >
                filtro ativo
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: t.text.muted, backgroundColor: t.bg.elevated }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex" style={{ minHeight: 300 }}>
          {/* Left: Presets */}
          <div
            className="w-44 shrink-0 p-3 flex flex-col gap-0.5"
            style={{ borderRight: `1px solid ${t.border.subtle}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 py-1" style={{ color: t.text.muted }}>
              Atalhos
            </p>
            {PERIODO_PRESETS.map((preset) => {
              const isActive = periodoLabel === preset.label && !hasLocal;
              const willSet  = localInicio === (preset.inicio ?? '') && localFim === (preset.fim ?? '');
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="text-left rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: willSet ? `${t.accent.primary}12` : 'transparent',
                    color: willSet ? t.accent.primary : t.text.secondary,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Right: date inputs + month grid */}
          <div className="flex-1 p-5">
            {/* Date range inputs */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: t.text.muted }}
                >
                  De
                </label>
                <input
                  type="date"
                  value={localInicio}
                  onChange={e => setLocalInicio(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: t.bg.base,
                    border: `1px solid ${localInicio ? t.accent.primary : t.border.default}`,
                    color: t.text.primary,
                    outline: 'none',
                  }}
                />
              </div>
              <div className="flex items-end pb-2 text-xs" style={{ color: t.text.muted }}>→</div>
              <div className="flex-1">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: t.text.muted }}
                >
                  Até
                </label>
                <input
                  type="date"
                  value={localFim}
                  onChange={e => setLocalFim(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: t.bg.base,
                    border: `1px solid ${localFim ? t.accent.primary : t.border.default}`,
                    color: t.text.primary,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Year nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setGridYear(y => y - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:opacity-70"
                style={{ color: t.text.secondary, backgroundColor: t.bg.base, border: `1px solid ${t.border.default}` }}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-bold tabular-nums" style={{ color: t.text.primary }}>
                {gridYear}
              </span>
              <button
                onClick={() => setGridYear(y => y + 1)}
                disabled={gridYear >= currentYear}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:opacity-70 disabled:opacity-25"
                style={{ color: t.text.secondary, backgroundColor: t.bg.base, border: `1px solid ${t.border.default}` }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Month grid 4×3 */}
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_LABELS.map((label, i) => {
                const exact    = isMonthExact(i);
                const isStart  = isMonthStart(i);
                const isEnd    = isMonthEnd(i);
                const isEdge   = isStart || isEnd;
                const inRange  = isMonthInRange(i);
                const isFuture = gridYear === currentYear && i > currentMonth;
                return (
                  <button
                    key={label}
                    disabled={isFuture}
                    onClick={() => handleMonthClick(i)}
                    className="rounded-lg py-2 text-xs font-semibold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isEdge
                        ? t.accent.primary
                        : inRange
                        ? `${t.accent.primary}18`
                        : t.bg.base,
                      color: isEdge
                        ? '#fff'
                        : inRange
                        ? t.accent.primary
                        : t.text.secondary,
                      border: isEdge
                        ? `2px solid ${t.accent.primary}`
                        : inRange && !exact
                        ? `1px solid ${t.accent.primary}35`
                        : `1px solid ${t.border.default}`,
                      fontWeight: isEdge ? 800 : undefined,
                    }}
                  >
                    {label}
                    {isStart && !exact && (
                      <span style={{ display: 'block', fontSize: '7px', opacity: 0.85, marginTop: '1px' }}>início</span>
                    )}
                    {isEnd && !exact && (
                      <span style={{ display: 'block', fontSize: '7px', opacity: 0.85, marginTop: '1px' }}>fim</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-center" style={{ color: t.text.muted }}>
              Clique para selecionar · clique outro mês para ampliar o range
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: `1px solid ${t.border.subtle}` }}
        >
          <p className="text-xs" style={{ color: t.text.muted }}>
            {hasLocal
              ? `${localInicio ? fmtDate(localInicio) : '…'} → ${localFim ? fmtDate(localFim) : '…'}`
              : 'Nenhum filtro selecionado'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:opacity-80"
              style={{
                color: t.text.secondary,
                backgroundColor: t.bg.base,
                border: `1px solid ${t.border.default}`,
              }}
            >
              Limpar
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg px-5 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: t.accent.primary }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
