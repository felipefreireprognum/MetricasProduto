'use client';

import { Play, RefreshCw, Database, Download } from 'lucide-react';
import { STRINGS } from '@/constants/strings';
import { useTabelasScreen, TABELAS_BANKS } from '@/hooks/tabelas/useTabelasScreen';
import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/shared/LoadingState';
import GenericTableView from '@/components/features/DashboardView/GenericTableView';
import Button from '@/components/ui/Button';
import { exportToCsv } from '@/utils/exportCsv';

// Bank chip colors — matches sidebar
const CHIP: Record<string, { bg: string; fg: string }> = {
  c6:    { bg: '#111827', fg: '#FFFFFF' },
  inter: { bg: '#FF8700', fg: '#FFFFFF' },
};

function chipStyle(bancoId: string, colors: { bg: string; text: string }) {
  return CHIP[bancoId] ?? { bg: colors.bg, fg: colors.text };
}

export default function TabelasScreen() {
  const { tokens: t } = useAuth();
  const {
    bancoId, setBancoId,
    tabelas, loadingTabelas,
    tabelaSelecionada, setTabelaSelecionada,
    rows,
    limite, setLimite,
    sqlCustom, setSqlCustom,
    loading, error,
    executarSql,
  } = useTabelasScreen();

  const bancAtual = TABELAS_BANKS.find((b) => b.id === bancoId);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: t.bg.base }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto p-4"
        style={{ backgroundColor: t.bg.surface, borderRight: `1px solid ${t.border.default}` }}
      >

        {/* Bank selector */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: t.text.muted }}>
            Banco / Ambiente
          </p>
          <div className="flex flex-col gap-1.5">
            {TABELAS_BANKS.map((banco) => {
              const chip    = chipStyle(banco.id, banco.colors);
              const active  = bancoId === banco.id;
              return (
                <button
                  key={banco.id}
                  onClick={() => setBancoId(banco.id)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: active ? `${t.accent.primary}08` : 'transparent',
                    border: `1px solid ${active ? t.accent.primary : t.border.default}`,
                  }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ backgroundColor: chip.bg, color: chip.fg }}
                  >
                    {banco.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>
                      {banco.name}
                    </p>
                    <p className="text-[10px]" style={{ color: t.text.muted }}>
                      {banco.dbType}
                    </p>
                  </div>
                  {active && (
                    <span
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.accent.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${t.border.default}` }} />

        {/* Table selector */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: t.text.muted }}>
            {STRINGS.tabelas.tabela}
          </p>
          {loadingTabelas ? (
            <LoadingState message="Carregando tabelas..." tokens={t} />
          ) : tabelas.length === 0 ? (
            <p className="text-xs" style={{ color: t.text.muted }}>Nenhuma tabela encontrada</p>
          ) : (
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{
                borderColor: t.border.default,
                backgroundColor: t.bg.base,
                color: t.text.primary,
              }}
              value={tabelaSelecionada}
              onChange={(e) => setTabelaSelecionada(e.target.value)}
            >
              {tabelas.map((tb) => (
                <option key={tb} value={tb}>{tb}</option>
              ))}
            </select>
          )}
        </div>

        {/* Limit slider */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: t.text.muted }}>
            {STRINGS.tabelas.limite}
          </p>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-full accent-[#1A5FFF]"
          />
          <p className="mt-1 text-right text-xs" style={{ color: t.text.secondary }}>
            {limite} {STRINGS.tabelas.registros}
          </p>
        </div>

        {/* Custom SQL */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: t.text.muted }}>
            {STRINGS.tabelas.sqlCustom}
          </p>
          <textarea
            className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none resize-none"
            style={{
              borderColor: t.border.default,
              backgroundColor: t.bg.base,
              color: t.text.primary,
            }}
            rows={6}
            placeholder="SELECT * FROM ..."
            value={sqlCustom}
            onChange={(e) => setSqlCustom(e.target.value)}
          />
          <Button
            size="sm"
            fullWidth
            className="mt-2"
            onClick={executarSql}
            disabled={!sqlCustom.trim() || loading}
          >
            <Play size={12} />
            {STRINGS.tabelas.executar}
          </Button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: t.bg.base }}>

        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ backgroundColor: t.bg.surface, borderBottom: `1px solid ${t.border.default}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {bancAtual && (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: chipStyle(bancAtual.id, bancAtual.colors).bg }}
              >
                {bancAtual.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold" style={{ color: t.text.primary }}>
                {tabelaSelecionada || 'Operações'}
              </h1>
              <p className="text-xs" style={{ color: t.text.muted }}>
                {bancAtual?.name} · {rows.length.toLocaleString('pt-BR')} {STRINGS.tabelas.registros}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && <RefreshCw size={15} className="animate-spin shrink-0" style={{ color: t.accent.primary }} />}
            {rows.length > 0 && !loading && (
              <button
                onClick={() => exportToCsv(rows, `${tabelaSelecionada || 'query'}_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: t.bg.surface, color: t.text.secondary, border: `1px solid ${t.border.default}` }}
              >
                <Download size={13} />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div
              className="mb-4 rounded-lg p-3 text-sm"
              style={{ backgroundColor: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <LoadingState message="Carregando dados..." tokens={t} />
          ) : rows.length === 0 && !loadingTabelas ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
              >
                <Database size={28} style={{ color: t.text.muted }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Sem dados</p>
              <p className="mt-1 text-xs" style={{ color: t.text.muted }}>
                Selecione uma tabela ou execute uma query
              </p>
            </div>
          ) : (
            <GenericTableView rows={rows} tokens={t} />
          )}
        </div>
      </main>
    </div>
  );
}
