'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GitCompareArrows, ListChecks, TrendingDown,
  Table2, LineChart, FileBarChart2, ChevronDown, Plus, X,
  Info, LogOut, Calendar, Check, Database, Sheet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters, PERIODO_PRESETS, type PeriodoPreset } from '@/contexts/FiltersContext';
import { ROUTES } from '@/constants/routes';
import type { BankConfig } from '@/constants/banks';
import type { BankTokens } from '@/theme/tokens';

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV = [
  { href: ROUTES.DASHBOARD,   label: 'Visão Geral',  icon: LayoutDashboard,  soon: false },
  { href: ROUTES.FASES,       label: 'Por Fase',     icon: ListChecks,       soon: false },
  { href: ROUTES.EXPLORER,    label: 'BD Métricas',  icon: Sheet,            soon: false },
  { href: ROUTES.DADOS,       label: 'Fontes',       icon: Database,         soon: false },
  { href: ROUTES.TABELAS,     label: 'Consulta BD',  icon: Table2,           soon: false },
  { href: ROUTES.COMPARATIVO, label: 'Comparativo',  icon: GitCompareArrows, soon: true  },
  { href: ROUTES.ABANDONO,    label: 'Abandono',     icon: TrendingDown,     soon: true  },
  { href: ROUTES.TENDENCIAS,  label: 'Tendências',   icon: LineChart,        soon: true  },
  { href: ROUTES.RELATORIOS,  label: 'Relatórios',   icon: FileBarChart2,    soon: true  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
      {children}
    </p>
  );
}

function FilterLabel({ children, info }: { children: React.ReactNode; info?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center gap-1 text-xs text-[#94A3B8]">
      {children}
      {info && <Info className="h-3 w-3 cursor-help opacity-60" />}
    </div>
  );
}

const CHIP_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  c6:    { bg: '#111827', fg: '#FFFFFF', label: 'C6' },
  inter: { bg: '#FF8700', fg: '#FFFFFF', label: 'IN' },
};

function BankChip({ banco, onRemove }: { banco: BankConfig; onRemove: () => void }) {
  const c = CHIP_COLORS[banco.id] ?? {
    bg: banco.colors.bg,
    fg: banco.colors.text,
    label: banco.name.slice(0, 2).toUpperCase(),
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          {c.label}
        </span>
        <span className="truncate text-sm font-medium text-[#0F172A]">{banco.name}</span>
        <span className="text-[10px] text-[#94A3B8] shrink-0">{banco.dbType}</span>
      </div>
      <button
        onClick={onRemove}
        className="text-[#CBD5E1] transition-colors hover:text-[#64748B]"
        aria-label={`Remover ${banco.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function NavItem({
  href, label, icon: Icon, active, soon, t,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  soon: boolean;
  t: BankTokens;
}) {
  const content = (
    <>
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1">{label}</span>
      {soon && (
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }}
        >
          Em breve
        </span>
      )}
    </>
  );

  const style = {
    borderLeft: active ? `2px solid ${t.sidebar.activeBorder}` : '2px solid transparent',
    backgroundColor: active ? t.sidebar.activeBg : 'transparent',
    color: active ? t.sidebar.activeText : soon ? '#CBD5E1' : t.sidebar.text,
    fontWeight: active ? 600 : 400,
    marginLeft: '-1px',
  } as React.CSSProperties;

  if (soon) {
    return (
      <span
        className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
        style={style}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
      style={style}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = t.sidebar.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {content}
    </Link>
  );
}

// ── Period picker ─────────────────────────────────────────────────────────────

function PeriodPicker({ t }: { t: BankTokens }) {
  const { periodoLabel, setPeriodo } = useFilters();
  const [open, setOpen] = useState(false);

  const select = (preset: PeriodoPreset) => {
    setPeriodo(preset);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A] transition-colors hover:border-[#CBD5E1]"
      >
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
          {periodoLabel}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div
            className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg py-1 shadow-lg"
            style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
          >
            {PERIODO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => select(preset)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-[#F8F9FC]"
                style={{ color: t.text.primary }}
              >
                {preset.label}
                {preset.label === periodoLabel && (
                  <Check className="h-3 w-3" style={{ color: t.accent.primary }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { credentials, disconnect, bancosConectados, tokens: t } = useAuth();
  const { removedBancoIds, toggleBanco } = useFilters();

  const [consolidacao, setConsolidacao] = useState<'consolidado' | 'empresa'>('consolidado');

  const visibleBanks = bancosConectados.filter((b) => !removedBancoIds.includes(b.id));
  const hiddenBanks  = bancosConectados.filter((b) =>  removedBancoIds.includes(b.id));

  return (
    <aside
      className="flex h-screen w-[260px] shrink-0 flex-col"
      style={{ backgroundColor: t.bg.sidebar, borderRight: `1px solid ${t.border.subtle}` }}
    >
      {/* ── Logo */}
      <div
        className="flex items-center gap-2.5 px-5 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${t.border.subtle}` }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-[13px] text-white"
          style={{ background: 'linear-gradient(135deg,#1A5FFF 0%,#0A2E8A 100%)' }}
        >
          P
        </div>
        <span className="text-base font-black tracking-tight" style={{ color: t.text.primary }}>
          Prognum
        </span>
      </div>

      {/* ── Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Filtros gerais */}
        <section>
          <SectionLabel>Filtros gerais</SectionLabel>

          {/* Empresas */}
          <div className="mb-3">
            <FilterLabel>Empresas</FilterLabel>
            <div className="space-y-1.5">
              {visibleBanks.map((banco) => (
                <BankChip
                  key={banco.id}
                  banco={banco}
                  onRemove={() => toggleBanco(banco.id)}
                />
              ))}

              {hiddenBanks.map((banco) => (
                <button
                  key={banco.id}
                  onClick={() => toggleBanco(banco.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#94A3B8] transition-colors hover:border-[#CBD5E1] hover:text-[#475569]"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Adicionar {banco.name}
                </button>
              ))}

              {bancosConectados.length === 0 && (
                <p className="px-1 text-xs text-[#CBD5E1]">Nenhum banco conectado</p>
              )}
            </div>
          </div>

          {/* Consolidação */}
          <div className="mb-3">
            <FilterLabel info>Consolidação</FilterLabel>
            <div
              className="grid grid-cols-2 gap-1 rounded-lg p-1"
              style={{ backgroundColor: t.bg.base }}
            >
              {([['consolidado', 'Consolidado'], ['empresa', 'Por empresa']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setConsolidacao(val)}
                  className="rounded-md px-2 py-1.5 text-xs transition-all"
                  style={{
                    backgroundColor: consolidacao === val ? '#FFFFFF' : 'transparent',
                    color: consolidacao === val ? t.text.primary : t.text.muted,
                    fontWeight: consolidacao === val ? 600 : 400,
                    boxShadow: consolidacao === val ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div className="mb-3">
            <FilterLabel>Período</FilterLabel>
            <PeriodPicker t={t} />
          </div>

          {/* Comparar com */}
          <div className="mb-3">
            <FilterLabel>Comparar com</FilterLabel>
            <button className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A] transition-colors hover:border-[#CBD5E1]">
              Período anterior
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
            </button>
          </div>

          {/* Mais filtros */}
          <button
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors"
            style={{ borderColor: t.border.default, color: t.text.muted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
              (e.currentTarget as HTMLElement).style.color = t.text.secondary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = t.border.default;
              (e.currentTarget as HTMLElement).style.color = t.text.muted;
            }}
          >
            ⛛ Mais filtros
          </button>
        </section>

        {/* Navegação */}
        <nav>
          <SectionLabel>Navegação</SectionLabel>
          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon, soon }) => {
              const active = !soon && (pathname === href || pathname.startsWith(href + '/'));
              return (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={active}
                  soon={soon}
                  t={t}
                />
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── Footer */}
      <div
        className="px-3 pb-4 pt-3"
        style={{ borderTop: `1px solid ${t.border.subtle}` }}
      >
        {credentials && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 mb-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: `${t.accent.primary}18`, color: t.accent.primary }}
            >
              {credentials.login[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>
                {credentials.login}
              </p>
              <p className="text-[10px]" style={{ color: t.text.muted }}>
                {visibleBanks.map((b) => b.name).join(' · ') || 'Sem banco ativo'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={disconnect}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all"
          style={{ color: t.sidebar.text }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2';
            (e.currentTarget as HTMLElement).style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = t.sidebar.text;
          }}
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </aside>
  );
}
