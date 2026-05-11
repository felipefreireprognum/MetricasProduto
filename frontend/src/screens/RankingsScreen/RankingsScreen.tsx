'use client';

import { useState } from 'react';
import {
  Trophy, Layers, XCircle, Timer, Users, TrendingDown, BarChart2, RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
import { MACROFASE_COLOR } from '@/theme/phaseColors';
import type { BankTokens } from '@/theme/tokens';
import type { FaseCount, TempoFase, UsuarioData, MacrofaseTotal, TopCpf } from '@/types/dashboard';

// ── Helpers ───────────────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 10;

const MEDAL: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' },
  1: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  2: { bg: '#FEF3E2', text: '#92400E', border: '#FCD9A0' },
};

function tempoBg(dias: number): { bg: string; text: string } {
  if (dias < 7)  return { bg: '#DCFCE7', text: '#16A34A' };
  if (dias < 20) return { bg: '#FEF9C3', text: '#CA8A04' };
  if (dias < 40) return { bg: '#FFEDD5', text: '#EA580C' };
  return            { bg: '#FEE2E2', text: '#DC2626' };
}

function tempoLabel(dias: number): string {
  if (dias < 7)  return 'rápido';
  if (dias < 20) return 'moderado';
  if (dias < 40) return 'lento';
  return 'crítico';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RankRow {
  key:       string | number;
  label:     string;
  sublabel?: string;
  value:     string;
  subvalue?: string;
  barPct:    number;
  color:     string;
  badge?:    { bg: string; text: string; label: string };
}

// ── RankingCard ───────────────────────────────────────────────────────────────

function RankingCard({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  rows,
  tokens: t,
  emptyText,
}: {
  title:       string;
  subtitle:    string;
  icon:        LucideIcon;
  accentColor: string;
  rows:        RankRow[];
  tokens:      BankTokens;
  emptyText?:  string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        <CardHeader title={title} subtitle={subtitle} Icon={Icon} accentColor={accentColor} count={0} t={t} />
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}12` }}
          >
            <Icon size={14} style={{ color: accentColor }} />
          </div>
          <p className="text-xs" style={{ color: t.text.muted }}>{emptyText ?? 'Sem dados'}</p>
        </div>
      </div>
    );
  }

  const visible = expanded ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hasMore = rows.length > INITIAL_VISIBLE;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <CardHeader title={title} subtitle={subtitle} Icon={Icon} accentColor={accentColor} count={rows.length} t={t} />

      <div className="flex flex-col">
        {visible.map((row, i) => {
          const medal   = MEDAL[i];
          const isTop3  = i < 3;
          const isFirst = i === 0;

          return (
            <div
              key={row.key}
              className="group flex items-center gap-3 px-4 py-3 transition-colors"
              style={{
                borderBottom:    `1px solid ${t.border.subtle}`,
                backgroundColor: isFirst ? `${accentColor}05` : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${accentColor}08`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = isFirst ? `${accentColor}05` : 'transparent')}
            >
              {/* Rank badge */}
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                style={isTop3
                  ? { backgroundColor: medal.bg, color: medal.text, border: `1px solid ${medal.border}` }
                  : { backgroundColor: t.bg.base, color: t.text.muted, border: `1px solid ${t.border.subtle}` }
                }
              >
                {i + 1}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold leading-tight" style={{ color: t.text.primary }}>
                      {row.label}
                    </p>
                    {row.sublabel && (
                      <p className="text-[9px] mt-0.5 truncate" style={{ color: t.text.muted }}>{row.sublabel}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-black tabular-nums leading-none" style={{ color: isTop3 ? accentColor : t.text.primary }}>
                      {row.value}
                    </p>
                    {row.subvalue && (
                      <p className="text-[9px] tabular-nums" style={{ color: t.text.muted }}>{row.subvalue}</p>
                    )}
                    {row.badge && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{ backgroundColor: row.badge.bg, color: row.badge.text }}
                      >
                        {row.badge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(row.barPct, 2)}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors"
          style={{ borderTop: `1px solid ${t.border.subtle}`, color: t.text.muted, backgroundColor: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.bg.base)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {expanded ? '↑ Ver menos' : `↓ Ver mais ${rows.length - INITIAL_VISIBLE}`}
        </button>
      )}
    </div>
  );
}

function CardHeader({
  title, subtitle, Icon, accentColor, count, t,
}: {
  title: string; subtitle: string; Icon: LucideIcon; accentColor: string; count: number; t: BankTokens;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: `1px solid ${t.border.subtle}` }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accentColor}15` }}
      >
        <Icon size={14} style={{ color: accentColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: t.text.primary }}>{title}</h3>
        <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>{subtitle}</p>
      </div>
      {count > 0 && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{ backgroundColor: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Row builders ──────────────────────────────────────────────────────────────

function buildAbandonoRows(fases: FaseCount[], baseline: number): RankRow[] {
  const sorted = [...fases]
    .filter(f => (f.abandono ?? 0) > 0)
    .sort((a, b) => (b.abandono ?? 0) - (a.abandono ?? 0));
  const max = sorted.length > 0 ? sorted[0].abandono! : 1;
  return sorted.map(f => {
    const ab = f.abandono!;
    return {
      key:      f.fase,
      label:    f.nome,
      sublabel: `Fase ${f.fase} · ${f.macrofase}`,
      value:    ab.toLocaleString('pt-BR'),
      subvalue: baseline > 0 ? `${(ab / baseline * 100).toFixed(1)}% do total` : undefined,
      barPct:   (ab / max) * 100,
      color:    MACROFASE_COLOR[f.macrofase] ?? '#94A3B8',
    };
  });
}

function buildSlowRows(tempos: TempoFase[]): RankRow[] {
  const sorted = [...tempos].sort((a, b) => b.tempoMedioDias - a.tempoMedioDias);
  const max = sorted.length > 0 ? sorted[0].tempoMedioDias : 1;
  return sorted.map(tf => {
    const b = tempoBg(tf.tempoMedioDias);
    return {
      key:      tf.fase,
      label:    tf.nome,
      sublabel: `Fase ${tf.fase} · ${tf.macrofase}`,
      value:    `${tf.tempoMedioDias.toFixed(1)}d`,
      barPct:   (tf.tempoMedioDias / max) * 100,
      color:    MACROFASE_COLOR[tf.macrofase] ?? '#94A3B8',
      badge:    { bg: b.bg, text: b.text, label: tempoLabel(tf.tempoMedioDias) },
    };
  });
}

function buildUsuariosRows(usuarios: UsuarioData[]): RankRow[] {
  const sorted = [...usuarios].sort((a, b) => b.total - a.total);
  const max = sorted.length > 0 ? sorted[0].total : 1;
  return sorted.map(u => ({
    key:    u.usuario,
    label:  u.usuario,
    value:  u.total.toLocaleString('pt-BR'),
    barPct: (u.total / max) * 100,
    color:  '#3B82F6',
  }));
}

function buildVolumeRows(fases: FaseCount[], useCpf = false): RankRow[] {
  const getVal = (f: FaseCount) => useCpf ? (f.totalCpf ?? f.total) : f.total;
  const sorted = [...fases].filter(f => getVal(f) > 0).sort((a, b) => getVal(b) - getVal(a));
  const max = sorted.length > 0 ? getVal(sorted[0]) : 1;
  return sorted.map(f => {
    const v = getVal(f);
    return {
      key:      f.fase,
      label:    f.nome,
      sublabel: `Fase ${f.fase} · ${f.macrofase}`,
      value:    v.toLocaleString('pt-BR'),
      barPct:   (v / max) * 100,
      color:    MACROFASE_COLOR[f.macrofase] ?? '#94A3B8',
    };
  });
}

function buildReincidentesRows(topCpfs: TopCpf[]): RankRow[] {
  const filtered = topCpfs.filter(c => c.total > 1);
  const max = filtered.length > 0 ? filtered[0].total : 1;
  return filtered.map(c => ({
    key:      c.cpf,
    label:    c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    value:    `${c.total} ops`,
    subvalue: `${c.total - 1} tentativa(s) extra`,
    barPct:   (c.total / max) * 100,
    color:    '#F59E0B',
  }));
}

function buildMacrofaseAbandonoRows(fases: FaseCount[], macrofaseTotais: MacrofaseTotal[]): RankRow[] {
  const abandonoMap = new Map<string, number>();
  for (const f of fases) {
    abandonoMap.set(f.macrofase, (abandonoMap.get(f.macrofase) ?? 0) + (f.abandono ?? 0));
  }
  const totalMap = new Map(macrofaseTotais.map(m => [m.macrofase, m.total]));
  const sorted = [...abandonoMap.entries()]
    .filter(([, ab]) => ab > 0)
    .sort(([, a], [, b]) => b - a);
  const max = sorted.length > 0 ? sorted[0][1] : 1;
  return sorted.map(([macro, ab]) => {
    const total = totalMap.get(macro) ?? 0;
    return {
      key:      macro,
      label:    macro,
      value:    ab.toLocaleString('pt-BR'),
      subvalue: total > 0 ? `${(ab / total * 100).toFixed(1)}% desta etapa` : undefined,
      barPct:   (ab / max) * 100,
      color:    MACROFASE_COLOR[macro] ?? '#94A3B8',
    };
  });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RankingsScreen() {
  const { dataGlobal, loading, lastUpdated, fromCache } = useDashboardScreen();
  const { tokens: t } = useAuth();
  const { dimensao } = useFilters();
  const [scrolled, setScrolled] = useState(false);

  const semDados = !loading && !dataGlobal;

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: t.bg.base }}
      onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
    >
      <PageHeaderBar
        title="Rankings"
        icon={<Trophy size={20} style={{ color: t.accent.primary }} />}
        description={lastUpdated ?? 'Fases e usuários com maior impacto no funil'}
        scrolled={scrolled}
        tokens={t}
        badges={fromCache && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}
          >
            cache local
          </span>
        )}
      />

      <div className="px-6 pb-6">
        {loading ? (
          <LoadingState message="Carregando rankings..." tokens={t} />
        ) : semDados ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              <Layers size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Nenhum dado encontrado</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Acesse Fontes e clique em Atualizar</p>
          </div>
        ) : dataGlobal && (
          <>
            {/* Row 1 — 2 cards principais */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              <RankingCard
                title="Abandono por Fase"
                subtitle="Fases com mais propostas canceladas"
                icon={XCircle}
                accentColor="#EF4444"
                rows={buildAbandonoRows(dataGlobal.operacoesPorFase, dataGlobal.kpis.operacoesIniciadas)}
                tokens={t}
                emptyText="Nenhuma fase com abandono"
              />
              <RankingCard
                title="Fases mais lentas"
                subtitle="Maior tempo médio de permanência"
                icon={Timer}
                accentColor="#8B5CF6"
                rows={buildSlowRows(dataGlobal.tempoMedioPorFase)}
                tokens={t}
                emptyText="Dados de tempo indisponíveis"
              />
            </div>

            {/* Row 2 — 3 cards */}
            <div className="grid grid-cols-3 gap-5">
              {dimensao === 'cpf' ? (
                <RankingCard
                  title="Top Reincidentes"
                  subtitle="CPFs com mais de uma proposta no funil"
                  icon={RefreshCw}
                  accentColor="#F59E0B"
                  rows={buildReincidentesRows(dataGlobal.topCpfs ?? [])}
                  tokens={t}
                  emptyText="Nenhum reincidente encontrado"
                />
              ) : (
                <RankingCard
                  title="Top Usuários"
                  subtitle="Volume de propostas por usuário"
                  icon={Users}
                  accentColor="#3B82F6"
                  rows={buildUsuariosRows(dataGlobal.topUsuarios)}
                  tokens={t}
                  emptyText="Nenhum usuário encontrado"
                />
              )}
              <RankingCard
                title="Abandono por Macrofase"
                subtitle="Etapas com maior perda acumulada"
                icon={TrendingDown}
                accentColor="#F97316"
                rows={buildMacrofaseAbandonoRows(dataGlobal.operacoesPorFase, dataGlobal.macrofaseTotais ?? [])}
                tokens={t}
                emptyText="Nenhum abandono registrado"
              />
              <RankingCard
                title={dimensao === 'cpf' ? 'Fases por CPFs Únicos' : 'Fases por Volume'}
                subtitle={dimensao === 'cpf' ? 'Fases com mais CPFs únicos' : 'Fases com mais propostas únicas'}
                icon={BarChart2}
                accentColor="#10B981"
                rows={buildVolumeRows(dataGlobal.operacoesPorFase, dimensao === 'cpf')}
                tokens={t}
                emptyText="Nenhuma fase encontrada"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
