'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2, ServerOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService } from '@/services/databaseService';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [50, 100, 200] as const;

const COL_META: Record<string, { label: string; align?: 'right' | 'center'; hide?: boolean }> = {
  NU_OPERACAO:      { label: 'Operação',  align: 'right' },
  NU_FASE_OPERACAO: { label: 'Cód. Fase', align: 'right' },
  NO_FASE_WEB:      { label: 'Etapa' },
  DT_INICIO_FASE:   { label: 'Data início' },
  CO_USUARIO_FASE:  { label: 'Usuário' },
  NO_FASE_OPERACAO: { label: 'Fase (BD)', hide: true },
};

const PREFERRED_ORDER = [
  'NU_OPERACAO', 'NU_FASE_OPERACAO', 'NO_FASE_WEB', 'DT_INICIO_FASE', 'CO_USUARIO_FASE',
];

const FASE_BADGE: Record<string, { bg: string; color: string }> = {
  'Simulação':             { bg: '#F1F5F9', color: '#475569' },
  'Cadastro':              { bg: '#EFF6FF', color: '#1D4ED8' },
  'Crédito':               { bg: '#F0FDF4', color: '#15803D' },
  'Negociação':            { bg: '#FFF7ED', color: '#C2410C' },
  'Análise de Documentos': { bg: '#FAF5FF', color: '#7E22CE' },
  'Análise Técnica':       { bg: '#EEF2FF', color: '#4338CA' },
  'Formalização':          { bg: '#F0FDFA', color: '#0F766E' },
  'Liberação':             { bg: '#ECFDF5', color: '#047857' },
  'Concluído':             { bg: '#F0FDF4', color: '#166534' },
  'Cancelada':             { bg: '#FFF1F2', color: '#BE123C' },
  'Desconhecida':          { bg: '#F8FAFC', color: '#94A3B8' },
};

function formatDate(val: unknown): string {
  if (!val) return '—';
  const s = String(val);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('pt-BR');
}

function formatCell(col: string, val: unknown): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-[#CBD5E1]">—</span>;

  if (col === 'NO_FASE_WEB') {
    const label = String(val);
    const style = FASE_BADGE[label] ?? FASE_BADGE['Desconhecida'];
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {label}
      </span>
    );
  }

  if (col === 'DT_INICIO_FASE') return formatDate(val);

  return String(val);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortIcon({ col, ordem, desc }: { col: string; ordem: string; desc: boolean }) {
  if (col !== ordem) return <ChevronsUpDown size={12} className="opacity-30" />;
  return desc
    ? <ChevronDown size={12} className="opacity-80" />
    : <ChevronUp size={12} className="opacity-80" />;
}

function Pagination({
  total, offset, pageSize, onPage, t,
}: {
  total: number;
  offset: number;
  pageSize: number;
  onPage: (o: number) => void;
  t: ReturnType<typeof useAuth>['tokens'];
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
                color: p === currentPage ? '#FFFFFF' : t.text.secondary,
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

  const [bancoCurrent, setBancoCurrent] = useState(bancosConectados[0]?.id ?? 'c6');
  const [info, setInfo]       = useState<{ total: number; dtInicio: string; dtFim: string } | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);
  const [rows, setRows]       = useState<Record<string, unknown>[]>([]);
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const [pageSize, setPageSize] = useState<typeof PAGE_SIZES[number]>(100);
  const [ordem, setOrdem]     = useState('DT_INICIO_FASE');
  const [desc, setDesc]       = useState(true);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty]     = useState(false);

  const banco = bancosConectados.find((b) => b.id === bancoCurrent);

  const loadPage = useCallback(async (newOffset: number, newOrdem: string, newDesc: boolean, newPageSize: number) => {
    if (!banco) return;
    setLoading(true);
    try {
      const res = await databaseService.parquetDados(banco.id, banco.ambiente, newPageSize, newOffset, newOrdem, newDesc);
      setRows(res.dados);
      setTotal(res.total);
      setOffset(newOffset);
    } finally {
      setLoading(false);
    }
  }, [banco]);

  useEffect(() => {
    if (!banco) return;
    databaseService.parquetInfo(banco.id, banco.ambiente).then((res) => {
      if (!res.existe) { setEmpty(true); return; }
      setEmpty(false);
      setInfo({ total: res.total!, dtInicio: res.dtInicio!, dtFim: res.dtFim! });
      const cols = (res.colunas ?? []).sort((a, b) => {
        const ai = PREFERRED_ORDER.indexOf(a);
        const bi = PREFERRED_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }).filter((c) => !COL_META[c]?.hide);
      setColunas(cols);
      loadPage(0, 'DT_INICIO_FASE', true, 100);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancoCurrent]);

  function handleSort(col: string) {
    const newDesc = col === ordem ? !desc : true;
    setOrdem(col);
    setDesc(newDesc);
    loadPage(0, col, newDesc, pageSize);
  }

  function handlePage(newOffset: number) {
    loadPage(newOffset, ordem, desc, pageSize);
  }

  function handlePageSize(size: typeof PAGE_SIZES[number]) {
    setPageSize(size);
    loadPage(0, ordem, desc, size);
  }

  function handleBanco(id: string) {
    setBancoCurrent(id);
    setOrdem('DT_INICIO_FASE');
    setDesc(true);
    setOffset(0);
    setRows([]);
    setInfo(null);
    setEmpty(false);
  }

  const formatDtRange = () => {
    if (!info) return null;
    return `${formatDate(info.dtInicio)} → ${formatDate(info.dtFim)}`;
  };

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

          {/* Banco pills */}
          {bancosConectados.length > 1 && (
            <div
              className="flex gap-1 rounded-xl p-1"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              {bancosConectados.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleBanco(b.id)}
                  className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: bancoCurrent === b.id ? t.accent.primary : 'transparent',
                    color: bancoCurrent === b.id ? '#FFFFFF' : t.text.muted,
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats bar */}
        {info && (
          <div className="ml-12 mt-3 flex items-center gap-5">
            <span className="text-xs font-semibold" style={{ color: t.text.primary }}>
              {info.total.toLocaleString('pt-BR')} registros
            </span>
            <span className="text-xs" style={{ color: t.text.muted }}>{formatDtRange()}</span>
            <span className="text-xs" style={{ color: t.text.muted }}>{colunas.length} colunas</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-3"
        style={{ borderBottom: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.surface }}
      >
        <p className="text-xs" style={{ color: t.text.muted }}>
          Ordenado por <strong style={{ color: t.text.secondary }}>{COL_META[ordem]?.label ?? ordem}</strong>
          {' '}({desc ? 'mais recente' : 'mais antigo'})
        </p>

        <div className="flex items-center gap-2">
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
                  color: pageSize === s ? t.text.primary : t.text.muted,
                  boxShadow: pageSize === s ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {s}
              </button>
            ))}
          </div>
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
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: t.bg.surface }}>
                <th
                  className="sticky top-0 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: t.text.muted, borderBottom: `1px solid ${t.border.default}`, backgroundColor: t.bg.surface, minWidth: 60 }}
                >
                  #
                </th>
                {colunas.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="sticky top-0 cursor-pointer select-none px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                    style={{
                      color: col === ordem ? t.accent.primary : t.text.muted,
                      textAlign: COL_META[col]?.align ?? 'left',
                      borderBottom: `1px solid ${t.border.default}`,
                      backgroundColor: t.bg.surface,
                      whiteSpace: 'nowrap',
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
                  className="transition-colors"
                  style={{ borderBottom: `1px solid ${t.border.subtle}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.bg.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td
                    className="px-4 py-2.5 text-right text-xs tabular-nums"
                    style={{ color: t.text.muted }}
                  >
                    {offset + i + 1}
                  </td>
                  {colunas.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-2.5"
                      style={{
                        color: t.text.primary,
                        textAlign: COL_META[col]?.align ?? 'left',
                        fontVariantNumeric: COL_META[col]?.align === 'right' ? 'tabular-nums' : undefined,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Loading overlay for page changes */}
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
    </div>
  );
}
