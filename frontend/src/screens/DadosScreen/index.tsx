'use client';

import { RefreshCw, Database, Clock, AlertCircle, CheckCircle2, ServerOff, ChevronsDown } from 'lucide-react';
import { useCache, LIMITE_OPTIONS } from '@/contexts/CacheContext';
import { useAuth } from '@/contexts/AuthContext';

const CHIP: Record<string, { bg: string; fg: string; initials: string }> = {
  c6:    { bg: '#0D0D0D', fg: '#FFFFFF', initials: 'C6'  },
  inter: { bg: '#FF8700', fg: '#FFFFFF', initials: 'IN'  },
};

function StatusBadge({ bs }: { bs: ReturnType<typeof useCache>['bancosCache'][number] }) {
  if (bs.refreshing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
        <RefreshCw size={11} className="animate-spin" />
        Buscando dados…
      </span>
    );
  }
  if (bs.error) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
        <AlertCircle size={11} />
        Erro na atualização
      </span>
    );
  }
  if (bs.data) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 size={11} />
        {bs.fromCache ? 'Cache' : 'Atualizado'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
      <ServerOff size={11} />
      Sem dados
    </span>
  );
}

export default function DadosScreen() {
  const { bancosCache, fetchBanco, expandBanco, setLimiteBanco } = useCache();
  const { tokens: t } = useAuth();

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: t.bg.base }}>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${t.accent.primary}12` }}
          >
            <Database size={18} style={{ color: t.accent.primary }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: t.text.primary }}>
            Fontes
          </h1>
        </div>
        <p className="ml-12 text-sm" style={{ color: t.text.muted }}>
          Gerencie as conexões com os bancos de dados. Os dados são armazenados localmente em Parquet e atualizados sob demanda.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {bancosCache.map((bs) => {
          const chip = CHIP[bs.id] ?? {
            bg: bs.colors.bg,
            fg: bs.colors.text,
            initials: bs.name.slice(0, 2).toUpperCase(),
          };
          const registros = bs.data?.kpis.totalRegistros;
          const operacoes = bs.data?.kpis.operacoesUnicas;

          return (
            <div
              key={bs.id}
              className="flex flex-col rounded-2xl p-6 transition-shadow hover:shadow-md"
              style={{
                backgroundColor: t.bg.surface,
                border: `1px solid ${bs.error ? '#FCA5A5' : t.border.default}`,
              }}
            >
              {/* Bank identity */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                    style={{ backgroundColor: chip.bg, color: chip.fg }}
                  >
                    {chip.initials}
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: t.text.primary }}>{bs.name}</p>
                    <p className="text-xs" style={{ color: t.text.muted }}>{bs.ambiente || 'SQL Server'}</p>
                  </div>
                </div>
                <StatusBadge bs={bs} />
              </div>

              {/* Stats */}
              {bs.data ? (
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: t.bg.base }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.text.muted }}>
                      Registros
                    </p>
                    <p className="text-xl font-black" style={{ color: t.text.primary }}>
                      {registros?.toLocaleString('pt-BR') ?? '—'}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: t.bg.base }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.text.muted }}>
                      Operações
                    </p>
                    <p className="text-xl font-black" style={{ color: t.text.primary }}>
                      {operacoes?.toLocaleString('pt-BR') ?? '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="mb-5 flex items-center justify-center rounded-xl py-6"
                  style={{ backgroundColor: t.bg.base }}
                >
                  <p className="text-sm" style={{ color: t.text.muted }}>
                    Clique em <strong>Atualizar</strong> para carregar os dados
                  </p>
                </div>
              )}

              {/* Last updated */}
              {bs.lastUpdated && (
                <div className="mb-4 flex items-center gap-1.5" style={{ color: t.text.muted }}>
                  <Clock size={12} />
                  <span className="text-xs">Última atualização: {bs.lastUpdated}</span>
                </div>
              )}

              {/* Error message */}
              {bs.error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">Erro:</p>
                  <p className="text-xs text-red-500 mt-0.5 break-words">{bs.error}</p>
                </div>
              )}

              {/* Controls */}
              <div className="mt-auto pt-3 space-y-3" style={{ borderTop: `1px solid ${t.border.subtle}` }}>

                {/* Limit picker */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.text.muted }}>
                    Registros por operação
                  </p>
                  <div
                    className="grid grid-cols-4 gap-1 rounded-xl p-1"
                    style={{ backgroundColor: t.bg.base }}
                  >
                    {LIMITE_OPTIONS.map((opt) => {
                      const active = bs.limite === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setLimiteBanco(bs.id, opt)}
                          disabled={bs.refreshing}
                          className="rounded-lg py-1.5 text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: active ? '#FFFFFF' : 'transparent',
                            color: active ? t.text.primary : t.text.muted,
                            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          {opt / 1000}k
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchBanco(bs.id)}
                    disabled={bs.refreshing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity"
                    style={{
                      backgroundColor: t.accent.primary,
                      opacity: bs.refreshing ? 0.6 : 1,
                      cursor: bs.refreshing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <RefreshCw size={13} className={bs.refreshing ? 'animate-spin' : ''} />
                    {bs.refreshing ? 'Buscando…' : 'Atualizar'}
                  </button>

                  <button
                    onClick={() => expandBanco(bs.id)}
                    disabled={bs.refreshing || !bs.data}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-opacity"
                    style={{
                      borderColor: t.border.default,
                      color: t.text.secondary,
                      opacity: (bs.refreshing || !bs.data) ? 0.35 : 1,
                      cursor: (bs.refreshing || !bs.data) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronsDown size={13} />
                    Expandir
                  </button>
                </div>

                {/* Explanations */}
                <div
                  className="rounded-xl p-3 space-y-1.5"
                  style={{ backgroundColor: t.bg.base }}
                >
                  <div className="flex gap-2 text-xs" style={{ color: t.text.muted }}>
                    <RefreshCw size={11} className="mt-0.5 shrink-0" style={{ color: t.accent.primary }} />
                    <span><strong style={{ color: t.text.secondary }}>Atualizar</strong> — busca os {bs.limite / 1000}k registros mais recentes do banco e mescla com o arquivo local, sem duplicar.</span>
                  </div>
                  <div className="flex gap-2 text-xs" style={{ color: t.text.muted }}>
                    <ChevronsDown size={11} className="mt-0.5 shrink-0" style={{ color: t.text.secondary }} />
                    <span><strong style={{ color: t.text.secondary }}>Expandir</strong> — adiciona {bs.limite / 1000}k registros anteriores ao mais antigo já salvo, acumulando histórico sem refazer consultas grandes e sem duplicar.</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
