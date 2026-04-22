'use client';

import { Play, RefreshCw } from 'lucide-react';
import { STRINGS } from '@/constants/strings';
import { useTabelasScreen } from '@/hooks/tabelas/useTabelasScreen';
import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/shared/LoadingState';
import GenericTableView from '@/components/features/DashboardView/GenericTableView';
import Button from '@/components/ui/Button';

export default function TabelasScreen() {
  const { tokens } = useAuth();
  const {
    tabelas, loadingTabelas,
    tabelaSelecionada, setTabelaSelecionada,
    rows,
    limite, setLimite,
    sqlCustom, setSqlCustom,
    loading, error,
    executarSql,
  } = useTabelasScreen();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-[#E2E8F0] bg-white p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{STRINGS.tabelas.tabela}</p>
          {loadingTabelas ? (
            <LoadingState message="Carregando tabelas..." />
          ) : (
            <select
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#1A5FFF] focus:outline-none"
              value={tabelaSelecionada}
              onChange={(e) => setTabelaSelecionada(e.target.value)}
            >
              {tabelas.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{STRINGS.tabelas.limite}</p>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-full accent-[#1A5FFF]"
          />
          <p className="mt-1 text-right text-xs text-[#475569]">{limite} {STRINGS.tabelas.registros}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{STRINGS.tabelas.sqlCustom}</p>
          <textarea
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-[#0F172A] focus:border-[#1A5FFF] focus:outline-none resize-none"
            rows={6}
            placeholder="SELECT * FROM ..."
            value={sqlCustom}
            onChange={(e) => setSqlCustom(e.target.value)}
          />
          <Button size="sm" fullWidth className="mt-2" onClick={executarSql} disabled={!sqlCustom.trim() || loading}>
            <Play size={12} />
            {STRINGS.tabelas.executar}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F8F9FC] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">{tabelaSelecionada || STRINGS.tabelas.title}</h1>
            <p className="text-sm text-[#475569]">{rows.length} {STRINGS.tabelas.registros}</p>
          </div>
          {loading && <RefreshCw size={16} className="animate-spin text-[#1A5FFF]" />}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#EF4444]">{error}</div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <GenericTableView rows={rows} tokens={tokens} />
        )}
      </main>
    </div>
  );
}
