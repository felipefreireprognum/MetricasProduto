'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { databaseService } from '@/services/databaseService';
import { MACROFASE_COLOR, MACROFASE_BADGE, MACROFASE_ORDER, BANCO_CHIP } from '@/theme/phaseColors';
import type { BankTokens } from '@/theme/tokens';

interface FaseEntry {
  cod:       number;
  nome:      string;
  macrofase: string;
  banco:     string;
}

interface Props {
  banco:   string;
  onClose: () => void;
  tokens:  BankTokens;
}

function PhaseTable({ fases, tokens: t }: { fases: FaseEntry[]; tokens: BankTokens }) {
  const sorted = [...fases].sort((a, b) => {
    const ai = MACROFASE_ORDER.indexOf(a.macrofase);
    const bi = MACROFASE_ORDER.indexOf(b.macrofase);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.cod - b.cod;
  });

  let lastMacrofase = '';

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr style={{ backgroundColor: t.bg.base }}>
          {['Cód.', 'Nome da Fase', 'Macrofase'].map(h => (
            <th
              key={h}
              className="sticky top-0 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider"
              style={{ color: t.text.muted, borderBottom: `1px solid ${t.border.default}`, backgroundColor: t.bg.base }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((f, i) => {
          const isNewGroup = f.macrofase !== lastMacrofase;
          lastMacrofase    = f.macrofase;
          const color      = MACROFASE_COLOR[f.macrofase] ?? MACROFASE_COLOR['Desconhecida'];
          const badge      = MACROFASE_BADGE[f.macrofase] ?? MACROFASE_BADGE['Desconhecida'];

          return (
            <>
              {isNewGroup && (
                <tr key={`g-${f.macrofase}`} style={{ backgroundColor: `${color}08` }}>
                  <td
                    colSpan={3}
                    className="px-3 py-1.5"
                    style={{ borderBottom: `1px solid ${color}25`, borderTop: i > 0 ? `1px solid ${color}25` : 'none' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {f.macrofase}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              <tr
                key={f.cod}
                style={{ borderBottom: `1px solid ${t.border.subtle}` }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td
                  className="px-3 py-2 text-right tabular-nums font-black w-14"
                  style={{ color, fontVariantNumeric: 'tabular-nums' }}
                >
                  {f.cod}
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: t.text.primary }}>
                  {f.nome}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {f.macrofase}
                  </span>
                </td>
              </tr>
            </>
          );
        })}
      </tbody>
    </table>
  );
}

export function PhaseLegendModal({ banco, onClose, tokens: t }: Props) {
  const [fases, setFases]       = useState<FaseEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    databaseService.getFases(banco).then(data => {
      setFases(data);
      const bancos = [...new Set(data.map(f => f.banco))];
      if (bancos.length > 0) setActiveTab(bancos[0]);
      setLoading(false);
    });
  }, [banco]);

  const bancosDisponiveis = [...new Set(fases.map(f => f.banco))];
  const showTabs          = bancosDisponiveis.length > 1;
  const fasesAtivas       = showTabs ? fases.filter(f => f.banco === activeTab) : fases;

  const bancoAtual   = showTabs ? activeTab : bancosDisponiveis[0];
  const bancoLabel   = bancoAtual ? (BANCO_CHIP[bancoAtual]?.label ?? bancoAtual) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '85vh', backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.border.subtle}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${t.accent.primary}12` }}
            >
              <BookOpen size={15} style={{ color: t.accent.primary }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold" style={{ color: t.text.primary }}>Legenda de Fases</h2>
                {bancoLabel && !showTabs && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: BANCO_CHIP[bancoAtual ?? '']?.bg ?? t.bg.base,
                      color:           BANCO_CHIP[bancoAtual ?? '']?.color ?? t.text.primary,
                    }}
                  >
                    {bancoLabel}
                  </span>
                )}
              </div>
              {!loading && (
                <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>
                  {fasesAtivas.length} fases mapeadas
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: t.text.muted }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs (only when all banks) */}
        {showTabs && !loading && (
          <div
            className="shrink-0 flex gap-1 px-6 py-2"
            style={{ borderBottom: `1px solid ${t.border.subtle}`, backgroundColor: t.bg.base }}
          >
            {bancosDisponiveis.map(b => {
              const chip = BANCO_CHIP[b];
              return (
                <button
                  key={b}
                  onClick={() => setActiveTab(b)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: activeTab === b ? (chip?.bg ?? t.accent.primary) : 'transparent',
                    color:           activeTab === b ? (chip?.color ?? '#FFFFFF') : t.text.muted,
                    border:          activeTab === b ? 'none' : `1px solid ${t.border.default}`,
                  }}
                >
                  {chip?.label ?? b}
                  <span className="tabular-nums opacity-75 text-[10px]">
                    {fases.filter(f => f.banco === b).length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm" style={{ color: t.text.muted }}>Carregando…</span>
            </div>
          ) : fasesAtivas.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm" style={{ color: t.text.muted }}>
                Nenhuma fase mapeada para este banco.
              </span>
            </div>
          ) : (
            <PhaseTable fases={fasesAtivas} tokens={t} />
          )}
        </div>
      </div>
    </div>
  );
}
