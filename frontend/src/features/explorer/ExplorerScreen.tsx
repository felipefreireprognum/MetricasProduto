'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2, ServerOff,
  Search, X, Filter, ChevronDown as DropChevron, BookOpen, Download,
} from 'lucide-react';
import { PhaseLegendModal } from '@/components/features/PhaseLegendModal/PhaseLegendModal';
import { MACROFASE_BADGE, MACROFASE_COLOR, BANCO_CHIP, PIPELINE_STAGES } from '@/theme/phaseColors';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService } from '@/services/databaseService';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [50, 100, 200] as const;

const COL_META: Record<string, { label: string; align?: 'right' | 'center' }> = {
  BANCO:             { label: 'Banco' },
  AMBIENTE:          { label: 'Ambiente' },
  NU_OPERACAO:       { label: 'Operação',      align: 'right' },
  NU_FASE_OPERACAO:  { label: 'Cód. Fase',     align: 'right' },
  NO_FASE:           { label: 'Fase' },
  MACROFASE:         { label: 'Macrofase' },
  DT_INICIO_FASE:    { label: 'Data início' },
  CO_USUARIO_FASE:   { label: 'Usuário' },
  NO_FASE_OPERACAO:  { label: 'Nome Fase (BD)' },
  NO_FASE_WEB:       { label: 'Etapa Web' },
};

const PREFERRED_ORDER = [
  'BANCO', 'AMBIENTE', 'NU_OPERACAO', 'NU_FASE_OPERACAO', 'NO_FASE', 'MACROFASE',
  'DT_INICIO_FASE', 'CO_USUARIO_FASE', 'NO_FASE_OPERACAO', 'NO_FASE_WEB',
];

// BANCO_CHIP, MACROFASE_BADGE, MACROFASE_COLOR, PIPELINE_STAGES → imported from @/theme/phaseColors

function formatDate(val: unknown): string {
  if (!val) return '—';
  const s = String(val);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('pt-BR');
}

function formatCell(col: string, val: unknown, macrofase?: string): React.ReactNode {
  if (val === null || val === undefined) return <span style={{ color: '#CBD5E1' }}>—</span>;

  if (col === 'BANCO') {
    const key  = String(val).toLowerCase();
    const chip = BANCO_CHIP[key];
    if (!chip) return <span>{String(val)}</span>;
    return (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
        style={{ backgroundColor: chip.bg, color: chip.color }}
      >
        {chip.label}
      </span>
    );
  }

  if (col === 'MACROFASE') {
    const label = String(val);
    const style = MACROFASE_BADGE[label] ?? MACROFASE_BADGE['Desconhecida'];
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {label}
      </span>
    );
  }

  if (col === 'NO_FASE') {
    const style = macrofase
      ? (MACROFASE_BADGE[macrofase] ?? MACROFASE_BADGE['Desconhecida'])
      : MACROFASE_BADGE['Desconhecida'];
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {String(val)}
      </span>
    );
  }

  if (col === 'NU_FASE_OPERACAO') {
    const color = macrofase
      ? (MACROFASE_COLOR[macrofase] ?? MACROFASE_COLOR['Desconhecida'])
      : MACROFASE_COLOR['Desconhecida'];
    return (
      <span className="font-black tabular-nums" style={{ color }}>
        {String(val)}
      </span>
    );
  }

  if (col === 'DT_INICIO_FASE') return formatDate(val);

  return String(val);
}

// ── Row detail modal ──────────────────────────────────────────────────────────

const FIELD_ORDER = [
  { key: 'NU_OPERACAO',      label: 'Nº Operação'     },
  { key: 'BANCO',            label: 'Banco'           },
  { key: 'AMBIENTE',         label: 'Ambiente'        },
  { key: 'NU_FASE_OPERACAO', label: 'Código da Fase'  },
  { key: 'NO_FASE',          label: 'Fase'            },
  { key: 'MACROFASE',        label: 'Macrofase'       },
  { key: 'DT_INICIO_FASE',   label: 'Data de Início'  },
  { key: 'CO_USUARIO_FASE',  label: 'Usuário'         },
  { key: 'NO_FASE_OPERACAO', label: 'Nome Fase (BD)'  },
  { key: 'NO_FASE_WEB',      label: 'Etapa Web'       },
];

function RowDetailModal({ row, colunas, onClose, tokens: t }: {
  row:     Record<string, unknown>;
  colunas: string[];
  onClose: () => void;
  tokens:  ReturnType<typeof useAuth>['tokens'];
}) {
  const macrofase   = String(row.MACROFASE ?? '');
  const faseNome    = String(row.NO_FASE ?? row.NO_FASE_OPERACAO ?? '—');
  const faseCod     = row.NU_FASE_OPERACAO != null ? Number(row.NU_FASE_OPERACAO) : null;
  const stageInfo   = PIPELINE_STAGES.find(p => p.id === macrofase);
  const accentColor = stageInfo?.color ?? '#94A3B8';
  const currentIdx  = PIPELINE_STAGES.findIndex(p => p.id === macrofase);
  const isCancelled = macrofase === 'Cancelada';

  const fields = FIELD_ORDER.filter(f => colunas.includes(f.key) && row[f.key] != null && f.key !== 'NU_OPERACAO');
  const extraCols = colunas.filter(c =>
    !FIELD_ORDER.some(f => f.key === c) && row[c] != null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex w-full max-w-lg flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Accent strip */}
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                {macrofase || 'Desconhecida'}
              </span>
              {faseCod != null && (
                <span className="font-mono text-xs" style={{ color: t.text.muted }}>
                  fase {faseCod}
                </span>
              )}
            </div>
            <p className="text-2xl font-black tabular-nums" style={{ color: t.text.primary }}>
              {String(row.NU_OPERACAO ?? '—')}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: t.text.muted }}>{faseNome}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ color: t.text.muted }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Pipeline progress */}
        {!isCancelled && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-0.5">
              {PIPELINE_STAGES.map((stage, i) => {
                const isCur  = i === currentIdx;
                const isPast = currentIdx >= 0 && i < currentIdx;
                return (
                  <div key={stage.id} className="relative flex flex-1 items-center">
                    <div
                      className="h-1.5 w-full rounded-sm transition-all"
                      style={{ backgroundColor: (isCur || isPast) ? stage.color : `${stage.color}25` }}
                    />
                    {isCur && (
                      <div
                        className="absolute -top-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white"
                        style={{ backgroundColor: stage.color, boxShadow: `0 0 0 2px ${stage.color}40` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[9px] font-medium" style={{ color: t.text.muted }}>Simulação</span>
              <span className="text-[9px] font-medium" style={{ color: t.text.muted }}>Concluído</span>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}>
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-600">Operação cancelada</span>
          </div>
        )}

        {/* Divider */}
        <div className="shrink-0" style={{ height: 1, backgroundColor: t.border.subtle }} />

        {/* Fields */}
        <div className="max-h-64 overflow-y-auto px-6 py-4 space-y-3">
          {fields.map(({ key, label }) => (
            <div key={key} className="flex items-start justify-between gap-6">
              <span className="shrink-0 text-xs" style={{ color: t.text.muted }}>{label}</span>
              <span className="text-right text-xs font-semibold" style={{ color: t.text.primary }}>
                {formatCell(key, row[key])}
              </span>
            </div>
          ))}
          {extraCols.map(col => (
            <div key={col} className="flex items-start justify-between gap-6">
              <span className="shrink-0 text-xs" style={{ color: t.text.muted }}>
                {COL_META[col]?.label ?? col}
              </span>
              <span className="text-right text-xs font-semibold" style={{ color: t.text.primary }}>
                {formatCell(col, row[col])}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-end px-6 py-3"
          style={{ borderTop: `1px solid ${t.border.subtle}` }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: t.bg.base,
              border: `1px solid ${t.border.default}`,
              color: t.text.secondary,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.surface)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export modal ──────────────────────────────────────────────────────────────

const EXPORT_LIMITS = [
  { label: 'Todos',  value: undefined },
  { label: '10k',    value: 10_000    },
  { label: '50k',    value: 50_000    },
  { label: '100k',   value: 100_000   },
  { label: '200k',   value: 200_000   },
] as const;

function ExportModal({ bancoCurrent, availableBancos, macrofaseOpts, ambienteOpts, total, onClose, tokens: t }: {
  bancoCurrent:   string;
  availableBancos: string[];
  macrofaseOpts:  string[];
  ambienteOpts:   string[];
  total:          number;
  onClose:        () => void;
  tokens:         ReturnType<typeof useAuth>['tokens'];
}) {
  const [banco,      setBanco]     = useState(bancoCurrent);
  const [limitVal,   setLimitVal]  = useState<number | undefined>(undefined);
  const [macrofases, setMacrofases] = useState<string[]>([]);
  const [ambiente,   setAmbiente]  = useState('');
  const [exporting,  setExporting] = useState(false);
  const [err,        setErr]       = useState<string | null>(null);

  const bancoOptions = [
    { id: 'all',  label: 'Todos' },
    ...availableBancos.map(b => ({ id: b, label: BANCO_CHIP[b]?.label ?? b })),
  ];

  async function handleExport() {
    setExporting(true);
    setErr(null);
    try {
      await databaseService.exportCsv({
        banco,
        ...(banco !== 'all' && ambiente ? { ambiente } : {}),
        ...(limitVal    ? { limit:     limitVal              } : {}),
        ...(macrofases.length > 0 ? { macrofases: macrofases.join(',') } : {}),
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao gerar CSV');
    } finally {
      setExporting(false);
    }
  }

  const segBtn = (active: boolean) => ({
    backgroundColor: active ? t.accent.primary : 'transparent',
    color:           active ? '#FFFFFF' : t.text.muted,
    border:          active ? 'none' : `1px solid ${t.border.default}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
              <Download size={15} style={{ color: '#16A34A' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.text.primary }}>Exportar CSV</h2>
              <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>
                {total.toLocaleString('pt-BR')} registros disponíveis
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" style={{ color: t.text.muted }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Banco */}
          <div>
            <p className="mb-2 text-xs font-semibold" style={{ color: t.text.secondary }}>Banco</p>
            <div className="flex flex-wrap gap-1.5">
              {bancoOptions.map(opt => (
                <button key={opt.id} onClick={() => { setBanco(opt.id); setAmbiente(''); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={segBtn(banco === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Registros */}
          <div>
            <p className="mb-2 text-xs font-semibold" style={{ color: t.text.secondary }}>Registros</p>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_LIMITS.map(opt => (
                <button key={opt.label} onClick={() => setLimitVal(opt.value)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={segBtn(limitVal === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ambiente (only when single banco has multiple ambientes) */}
          {banco !== 'all' && ambienteOpts.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold" style={{ color: t.text.secondary }}>Ambiente</p>
              <div className="flex flex-wrap gap-1.5">
                {[{ label: 'Todos', value: '' }, ...ambienteOpts.map(a => ({ label: a, value: a }))].map(opt => (
                  <button key={opt.label} onClick={() => setAmbiente(opt.value)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                    style={segBtn(ambiente === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Macrofase — multi-select */}
          {macrofaseOpts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: t.text.secondary }}>Macrofase</p>
                {macrofases.length > 0 && (
                  <button
                    onClick={() => setMacrofases([])}
                    className="text-[10px] font-medium"
                    style={{ color: t.accent.primary }}
                  >
                    Limpar ({macrofases.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {macrofaseOpts.map(m => {
                  const active = macrofases.includes(m);
                  const badge  = MACROFASE_BADGE[m] ?? MACROFASE_BADGE['Desconhecida'];
                  return (
                    <button
                      key={m}
                      onClick={() => setMacrofases(prev =>
                        active ? prev.filter(x => x !== m) : [...prev, m]
                      )}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all"
                      style={{
                        backgroundColor: active ? badge.bg  : 'transparent',
                        color:           active ? badge.color : t.text.muted,
                        border:          `1px solid ${active ? badge.color + '60' : t.border.default}`,
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              {macrofases.length === 0 && (
                <p className="mt-1 text-[10px]" style={{ color: t.text.muted }}>
                  Nenhuma selecionada = exporta todas
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {err && (
            <p className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#FFF1F2', color: '#BE123C' }}>
              {err}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${t.border.subtle}` }}>
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.default}`, color: t.text.secondary }}
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#16A34A', color: '#FFFFFF' }}
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {exporting ? 'Gerando…' : 'Baixar CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown filter ───────────────────────────────────────────────────────────

function DropdownFilter({
  label, value, options, onChange, tokens: t, badge,
}: {
  label:    string;
  value:    string;
  options:  string[];
  onChange: (v: string) => void;
  tokens:   ReturnType<typeof useAuth>['tokens'];
  badge?:   boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const active = !!value;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          backgroundColor: active ? `${t.accent.primary}12` : t.bg.surface,
          border:          `1px solid ${active ? t.accent.primary : t.border.default}`,
          color:           active ? t.accent.primary : t.text.secondary,
        }}
      >
        <Filter size={11} />
        {active ? value : label}
        {active
          ? <X size={11} onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }} />
          : <DropChevron size={11} className={open ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        }
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-h-64 overflow-y-auto rounded-xl shadow-lg"
          style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
        >
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className="flex w-full items-center px-3 py-2 text-left text-xs transition-colors"
            style={{ color: t.text.muted }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Todos
          </button>
          {options.map(opt => {
            const style = badge ? (MACROFASE_BADGE[opt] ?? MACROFASE_BADGE['Desconhecida']) : null;
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex w-full items-center px-3 py-2 text-left text-xs font-medium"
                style={{
                  color:           opt === value ? t.accent.primary : t.text.primary,
                  backgroundColor: opt === value ? `${t.accent.primary}10` : 'transparent',
                }}
                onMouseEnter={e => { if (opt !== value) e.currentTarget.style.backgroundColor = t.bg.base; }}
                onMouseLeave={e => { if (opt !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {style ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: style.bg, color: style.color }}
                  >
                    {opt}
                  </span>
                ) : opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, ordem, desc }: { col: string; ordem: string; desc: boolean }) {
  if (col !== ordem) return <ChevronsUpDown size={12} className="opacity-30" />;
  return desc
    ? <ChevronDown size={12} className="opacity-80" />
    : <ChevronUp size={12} className="opacity-80" />;
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  total, offset, pageSize, onPage, t,
}: {
  total:    number;
  offset:   number;
  pageSize: number;
  onPage:   (o: number) => void;
  t:        ReturnType<typeof useAuth>['tokens'];
}) {
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages  = Math.ceil(total / pageSize);

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase = 'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors';

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs" style={{ color: t.text.muted }}>
        {offset + 1}–{Math.min(offset + pageSize, total)} de {total.toLocaleString('pt-BR')} registros
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(0, offset - pageSize))}
          disabled={currentPage === 1}
          className={btnBase}
          style={{ color: currentPage === 1 ? t.text.muted : t.text.secondary, opacity: currentPage === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: t.text.muted }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage((p - 1) * pageSize)}
              className={btnBase}
              style={{
                backgroundColor: p === currentPage ? t.accent.primary : 'transparent',
                color:           p === currentPage ? '#FFFFFF' : t.text.secondary,
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(Math.min((totalPages - 1) * pageSize, offset + pageSize))}
          disabled={currentPage === totalPages}
          className={btnBase}
          style={{ color: currentPage === totalPages ? t.text.muted : t.text.secondary, opacity: currentPage === totalPages ? 0.4 : 1 }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ExplorerScreen() {
  const { tokens: t, bancosConectados } = useAuth();

  const [bancoCurrent, setBancoCurrent] = useState<string>('all');
  const [selectedRow, setSelectedRow]   = useState<Record<string, unknown> | null>(null);
  const [showLegend, setShowLegend]     = useState(false);
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);
  const [showExport, setShowExport]           = useState(false);
  const [info, setInfo]         = useState<{ total: number; dtInicio: string; dtFim: string } | null>(null);
  const [macrofaseOpts, setMacrofaseOpts] = useState<string[]>([]);
  const [faseOpts, setFaseOpts]           = useState<string[]>([]);
  const [ambienteOpts, setAmbienteOpts]   = useState<string[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [rows, setRows]       = useState<Record<string, unknown>[]>([]);
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const [pageSize, setPageSize] = useState<typeof PAGE_SIZES[number]>(100);
  const [ordem, setOrdem]     = useState('DT_INICIO_FASE');
  const [desc, setDesc]       = useState(true);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty]     = useState(false);

  // Filters
  const [busca, setBusca]         = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [macrofase, setMacrofase] = useState('');
  const [faseNome, setFaseNome]   = useState('');

  const banco = bancoCurrent !== 'all'
    ? bancosConectados.find((b) => b.id === bancoCurrent)
    : null;

  const loadPage = useCallback(async (
    bancoId:      string,
    bancoAmb:     string | undefined,
    newOffset:    number,
    newOrdem:     string,
    newDesc:      boolean,
    newPageSize:  number,
    newBusca:     string,
    newMacrofase: string,
    newFaseNome:  string,
  ) => {
    setLoading(true);
    try {
      const res = await databaseService.parquetDados(
        bancoId, bancoAmb,
        newPageSize, newOffset, newOrdem, newDesc,
        newBusca || undefined,
        newMacrofase || undefined,
        newFaseNome || undefined,
      );
      setRows(res.dados);
      setTotal(res.total);
      setOffset(newOffset);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derives the banco params for the current selection
  function curParams() {
    const amb = bancoCurrent !== 'all'
      ? (bancosConectados.find(b => b.id === bancoCurrent)?.ambiente)
      : undefined;
    return { id: bancoCurrent, amb };
  }

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => setBusca(buscaInput), 350);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  // Re-fetch when filters change
  useEffect(() => {
    if (colunas.length === 0) return;
    const { id, amb } = curParams();
    loadPage(id, amb, 0, ordem, desc, pageSize, busca, macrofase, faseNome);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, macrofase, faseNome]);

  useEffect(() => {
    const { id, amb } = curParams();
    databaseService.parquetInfo(id, amb).then((res) => {
      if (!res.existe) { setEmpty(true); return; }
      setEmpty(false);
      setInfo({ total: res.total!, dtInicio: res.dtInicio!, dtFim: res.dtFim! });
      setAvailableBancos(res.bancos ?? [id]);
      setMacrofaseOpts(res.macrofases ?? []);
      setFaseOpts(res.fases ?? []);
      setAmbienteOpts(res.ambientes ?? []);
      const cols = (res.colunas ?? []).sort((a, b) => {
        const ai = PREFERRED_ORDER.indexOf(a);
        const bi = PREFERRED_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      setColunas(cols);
      loadPage(id, amb, 0, 'DT_INICIO_FASE', true, 100, '', '', '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancoCurrent]);

  function handleSort(col: string) {
    const newDesc = col === ordem ? !desc : true;
    const { id, amb } = curParams();
    setOrdem(col);
    setDesc(newDesc);
    loadPage(id, amb, 0, col, newDesc, pageSize, busca, macrofase, faseNome);
  }

  function handlePage(newOffset: number) {
    const { id, amb } = curParams();
    loadPage(id, amb, newOffset, ordem, desc, pageSize, busca, macrofase, faseNome);
  }

  function handlePageSize(size: typeof PAGE_SIZES[number]) {
    const { id, amb } = curParams();
    setPageSize(size);
    loadPage(id, amb, 0, ordem, desc, size, busca, macrofase, faseNome);
  }

  function handleBanco(id: string) {
    setBancoCurrent(id);
    setOrdem('DT_INICIO_FASE');
    setDesc(true);
    setOffset(0);
    setRows([]);
    setInfo(null);
    setEmpty(false);
    setBuscaInput('');
    setBusca('');
    setMacrofase('');
    setFaseNome('');
  }

  function handleMacrofase(v: string) {
    setMacrofase(v);
    if (v) setFaseNome(''); // reset fase when macrofase changes
  }

  function clearAllFilters() {
    setBuscaInput('');
    setBusca('');
    setMacrofase('');
    setFaseNome('');
  }

  const hasFilters = !!(busca || macrofase || faseNome);

  const formatDtRange = () => {
    if (!info) return null;
    return `${formatDate(info.dtInicio)} → ${formatDate(info.dtFim)}`;
  };

  // Filter fase options by selected macrofase if needed
  const filteredFaseOpts = macrofase
    ? faseOpts // ideally filtered, but we don't have that mapping client-side; show all
    : faseOpts;

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: t.bg.base }}>

      {/* Header */}
      <div className="shrink-0 px-8 pt-7 pb-5" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${t.accent.primary}12` }}
              >
                <Sheet size={18} style={{ color: t.accent.primary }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: t.text.primary }}>Banco de Dados de Métricas</h1>
            </div>
            <p className="ml-12 text-sm" style={{ color: t.text.muted }}>
              Dados do arquivo local (Parquet) — base que alimenta o dashboard.
            </p>
          </div>

          <div
            className="flex gap-1 rounded-xl p-1"
            style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
          >
            <button
              onClick={() => handleBanco('all')}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor: bancoCurrent === 'all' ? t.accent.primary : 'transparent',
                color:           bancoCurrent === 'all' ? '#FFFFFF' : t.text.muted,
              }}
            >
              Todos
            </button>
            {bancosConectados.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBanco(b.id)}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: bancoCurrent === b.id ? t.accent.primary : 'transparent',
                  color:           bancoCurrent === b.id ? '#FFFFFF' : t.text.muted,
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {info && (
          <div className="ml-12 mt-3 flex items-center gap-5">
            <span className="text-xs font-semibold" style={{ color: t.text.primary }}>
              {info.total.toLocaleString('pt-BR')} registros
            </span>
            {bancoCurrent === 'all' && availableBancos.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: t.text.muted }}>
                {availableBancos.map(b => {
                  const chip = BANCO_CHIP[b];
                  return chip ? (
                    <span
                      key={b}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: chip.bg, color: chip.color }}
                    >
                      {chip.label}
                    </span>
                  ) : null;
                })}
              </span>
            )}
            <span className="text-xs" style={{ color: t.text.muted }}>{formatDtRange()}</span>
            <span className="text-xs" style={{ color: t.text.muted }}>{colunas.length} colunas</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div
        className="shrink-0 px-8 py-3 flex flex-col gap-2.5"
        style={{ borderBottom: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.surface }}
      >
        {/* Row 1: search + filters + page size */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 max-w-sm"
            style={{ backgroundColor: t.bg.base, border: `1px solid ${buscaInput ? t.accent.primary : t.border.default}` }}
          >
            <Search size={13} style={{ color: t.text.muted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar por operação, usuário, fase…"
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: t.text.primary }}
            />
            {buscaInput && (
              <button onClick={() => setBuscaInput('')}>
                <X size={12} style={{ color: t.text.muted }} />
              </button>
            )}
          </div>

          {/* Column filters */}
          <DropdownFilter
            label="Macrofase"
            value={macrofase}
            options={macrofaseOpts}
            onChange={handleMacrofase}
            tokens={t}
            badge
          />
          <DropdownFilter
            label="Fase"
            value={faseNome}
            options={filteredFaseOpts}
            onChange={setFaseNome}
            tokens={t}
          />

          {hasFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{ color: '#EF4444', border: '1px solid #FCA5A533', backgroundColor: '#FFF1F2' }}
            >
              <X size={11} />
              Limpar filtros
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowLegend(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.default}`, color: t.text.secondary }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent.primary)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = t.border.default)}
            >
              <BookOpen size={11} />
              Legenda
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ backgroundColor: '#16A34A', color: '#FFFFFF' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Download size={11} />
              Exportar CSV
            </button>
            <span className="text-xs" style={{ color: t.text.muted }}>Linhas por página</span>
            <div
              className="flex gap-1 rounded-lg p-0.5"
              style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.default}` }}
            >
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => handlePageSize(s)}
                  className="rounded-md px-3 py-1 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: pageSize === s ? '#FFFFFF' : 'transparent',
                    color:           pageSize === s ? t.text.primary : t.text.muted,
                    boxShadow:       pageSize === s ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: sort info + active filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: t.text.muted }}>
            Ordenado por{' '}
            <strong style={{ color: t.text.secondary }}>{COL_META[ordem]?.label ?? ordem}</strong>
            {' '}({desc ? 'mais recente' : 'mais antigo'})
          </span>
          {hasFilters && (
            <span className="text-[11px]" style={{ color: t.text.muted }}>
              ·{' '}
              <span style={{ color: t.accent.primary, fontWeight: 600 }}>
                {total.toLocaleString('pt-BR')} resultado{total !== 1 ? 's' : ''}
              </span>
              {' '}com filtro ativo
            </span>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <ServerOff size={32} style={{ color: t.text.muted }} />
            <p className="text-sm font-medium" style={{ color: t.text.secondary }}>
              Nenhum dado encontrado para este banco
            </p>
            <p className="text-xs" style={{ color: t.text.muted }}>
              Acesse <strong>Fontes</strong> e clique em <strong>Atualizar</strong> para carregar os dados.
            </p>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: t.text.muted }}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        ) : rows.length === 0 && hasFilters ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Search size={32} style={{ color: t.text.muted }} />
            <p className="text-sm font-medium" style={{ color: t.text.secondary }}>Nenhum resultado</p>
            <p className="text-xs" style={{ color: t.text.muted }}>Tente remover ou alterar os filtros.</p>
            <button
              onClick={clearAllFilters}
              className="mt-1 rounded-lg px-4 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: t.accent.primary, color: '#FFFFFF' }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: t.bg.surface }}>
                <th
                  className="sticky top-0 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: t.text.muted, borderBottom: `1px solid ${t.border.default}`, backgroundColor: t.bg.surface, minWidth: 48 }}
                >
                  #
                </th>
                {colunas.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="sticky top-0 cursor-pointer select-none px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                    style={{
                      color:           col === ordem ? t.accent.primary : t.text.muted,
                      textAlign:       COL_META[col]?.align ?? 'left',
                      borderBottom:    `1px solid ${t.border.default}`,
                      backgroundColor: t.bg.surface,
                      whiteSpace:      'nowrap',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {COL_META[col]?.label ?? col}
                      <SortIcon col={col} ordem={ordem} desc={desc} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: `1px solid ${t.border.subtle}` }}
                  onClick={() => setSelectedRow(row)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.bg.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={{ color: t.text.muted }}>
                    {offset + i + 1}
                  </td>
                  {colunas.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-2.5"
                      style={{
                        color:              t.text.primary,
                        textAlign:          COL_META[col]?.align ?? 'left',
                        fontVariantNumeric: COL_META[col]?.align === 'right' ? 'tabular-nums' : undefined,
                        whiteSpace:         'nowrap',
                        maxWidth:           240,
                        overflow:           'hidden',
                        textOverflow:       'ellipsis',
                      }}
                    >
                      {formatCell(col, row[col], String(row['MACROFASE'] ?? ''))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {loading && rows.length > 0 && (
          <div className="fixed inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-lg"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              <Loader2 size={14} className="animate-spin" style={{ color: t.accent.primary }} />
              <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Carregando…</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer pagination */}
      {total > 0 && (
        <div
          className="shrink-0 px-8 py-3"
          style={{ borderTop: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.surface }}
        >
          <Pagination total={total} offset={offset} pageSize={pageSize} onPage={handlePage} t={t} />
        </div>
      )}

      {selectedRow && (
        <RowDetailModal
          row={selectedRow}
          colunas={colunas}
          onClose={() => setSelectedRow(null)}
          tokens={t}
        />
      )}

      {showLegend && (
        <PhaseLegendModal
          banco={bancoCurrent === 'all' && availableBancos.length > 1 ? 'all' : (availableBancos[0] ?? bancoCurrent)}
          onClose={() => setShowLegend(false)}
          tokens={t}
        />
      )}

      {showExport && (
        <ExportModal
          bancoCurrent={bancoCurrent}
          availableBancos={availableBancos}
          macrofaseOpts={macrofaseOpts}
          ambienteOpts={ambienteOpts}
          total={total}
          onClose={() => setShowExport(false)}
          tokens={t}
        />
      )}
    </div>
  );
}
