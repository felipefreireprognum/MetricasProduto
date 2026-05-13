'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { databaseService } from '@/services/databaseService';
import type { BankTokens } from '@/theme/tokens';

type GapRow = { macrofase: string; totalMacrofase: number; opsComRegistro: number; gap: number; pctGap: number };
type FaseRow = { fase: number; nome: string; macrofase: string; ops: number; pct: number };

interface Props {
  tokens: BankTokens;
  onClose: () => void;
  banco: string;
  ambiente?: string;
  inicio?: string;
  fim?: string;
  periodoLabel?: string;
}

const MACROFASE_COLOR: Record<string, string> = {
  'Simulação':             '#94A3B8',
  'Cadastro':              '#3B82F6',
  'Crédito':               '#8B5CF6',
  'Negociação':            '#F59E0B',
  'Análise de Documentos': '#EC4899',
  'Análise Técnica':       '#F97316',
  'Emissão de Contrato':   '#059669',
};

function gapSeverity(pct: number): { color: string; label: string; icon: React.ReactNode } {
  if (pct === 0)  return { color: '#16A34A', label: 'Sem gap',  icon: <CheckCircle2 size={12} /> };
  if (pct < 1)    return { color: '#16A34A', label: '< 1%',     icon: <CheckCircle2 size={12} /> };
  if (pct < 5)    return { color: '#CA8A04', label: 'Baixo',    icon: <Info         size={12} /> };
  if (pct < 15)   return { color: '#EA580C', label: 'Médio',    icon: <AlertTriangle size={12} /> };
  return            { color: '#DC2626', label: 'Alto',     icon: <AlertTriangle size={12} /> };
}

export function GapsModal({ tokens: t, onClose, banco, ambiente, inicio, fim, periodoLabel }: Props) {
  const filterLabel = periodoLabel;
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [macroRows,    setMacroRows]    = useState<GapRow[]>([]);
  const [faseRows,     setFaseRows]     = useState<FaseRow[]>([]);
  const [totalOps,     setTotalOps]     = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    databaseService.getGaps(banco, ambiente, inicio, fim)
      .then(res => {
        if (!res.existe) { setError('Parquet não encontrado. Atualize os dados primeiro.'); return; }
        setTotalOps(res.totalOps ?? 0);
        setMacroRows(res.porMacrofase ?? []);
        setFaseRows(res.primeiraFase ?? []);
      })
      .catch(e => setError(e?.message ?? 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [banco, ambiente, inicio, fim, filterLabel]);

  const maxGap = Math.max(...macroRows.map(r => r.gap), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div
        className="flex flex-col w-full max-w-2xl max-h-[88vh] rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${t.border.default}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: t.text.primary }}>Análise de Gaps do Funil</h2>
            <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>
              Diferença entre operações contadas no funil e operações com registro real na fase
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:opacity-70" style={{ color: t.text.muted }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: t.text.muted }}>Calculando gaps...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            </div>
          ) : (
            <>
              {/* Explicação */}
              <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed" style={{ backgroundColor: `${t.accent.primary}08`, border: `1px solid ${t.accent.primary}20`, color: t.text.secondary }}>
                <span className="font-bold" style={{ color: t.accent.primary }}>Como ler:</span>
                {' '}O funil conta operações via <code className="font-mono">op_max_fase &gt;= threshold</code> — qualquer op que atingiu uma fase posterior é contada em todas as anteriores.
                {' '}O <span className="font-semibold">gap</span> são as ops que o funil inclui mas que <span className="font-semibold">nunca tiveram registro real</span> naquela macrofase (entraram lateralmente em etapas mais avançadas).
              </div>

              {/* Tabela por macrofase */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.text.muted }}>
                  Gap por macrofase · {totalOps.toLocaleString('pt-BR')} operações no total
                </p>
                <div className="flex flex-col gap-2">
                  {macroRows.map(row => {
                    const color    = MACROFASE_COLOR[row.macrofase] ?? t.accent.primary;
                    const sev      = gapSeverity(row.pctGap);
                    const barPct   = (row.gap / maxGap) * 100;
                    return (
                      <div
                        key={row.macrofase}
                        className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.subtle}`, borderLeft: `3px solid ${color}` }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{row.macrofase}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-[10px] tabular-nums">
                            <span style={{ color: t.text.muted }}>funil: <span className="font-bold" style={{ color: t.text.secondary }}>{row.totalMacrofase.toLocaleString('pt-BR')}</span></span>
                            <span style={{ color: t.text.muted }}>c/ registro: <span className="font-bold" style={{ color: t.text.secondary }}>{row.opsComRegistro.toLocaleString('pt-BR')}</span></span>
                            <span
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                              style={{ backgroundColor: `${sev.color}15`, color: sev.color, border: `1px solid ${sev.color}30` }}
                            >
                              {sev.icon}
                              gap: {row.gap.toLocaleString('pt-BR')} ({row.pctGap.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        {row.gap > 0 && (
                          <div className="h-1 overflow-hidden rounded-full mt-1" style={{ backgroundColor: t.border.default }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: sev.color, opacity: 0.6 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distribuição de onde as ops começam */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.text.muted }}>
                  Primeira fase registrada por operação
                  <span className="ml-1 font-normal normal-case" style={{ color: t.text.muted }}>(onde cada op "entrou" no sistema)</span>
                </p>
                <div className="flex flex-col gap-1">
                  {faseRows.map(row => {
                    const color  = MACROFASE_COLOR[row.macrofase] ?? t.text.muted;
                    const barPct = row.pct;
                    return (
                      <div key={row.fase} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0" style={{ width: '200px' }}>
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[10px] font-medium truncate" style={{ color: t.text.secondary }}>{row.nome}</span>
                          <span className="text-[9px]" style={{ color: t.text.muted }}>#{row.fase}</span>
                        </div>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 0.5)}%`, backgroundColor: color, opacity: 0.65 }} />
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums w-10 text-right" style={{ color: t.text.secondary }}>
                          {row.ops.toLocaleString('pt-BR')}
                        </span>
                        <span className="shrink-0 text-[9px] tabular-nums w-8 text-right" style={{ color: t.text.muted }}>
                          {row.pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
