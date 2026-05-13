'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GitCompareArrows, ListChecks, TrendingDown,
  Table2, LineChart, FileBarChart2, Plus, X,
  Info, LogOut, Database, Sheet, Trophy, Route, Activity, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import prognumLogo from '@/assets/prognumlogo.webp';
import { useFilters } from '@/contexts/FiltersContext';
import { ROUTES } from '@/constants/routes';
import type { BankConfig } from '@/constants/banks';
import type { BankTokens } from '@/theme/tokens';

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV = [
  { href: ROUTES.DASHBOARD,   label: 'Visão Geral',  icon: LayoutDashboard,  soon: false },
  { href: ROUTES.FASES,       label: 'Por Fase',     icon: ListChecks,       soon: false },
  { href: ROUTES.TENDENCIAS,  label: 'Tendências',   icon: LineChart,        soon: false },
  { href: ROUTES.MACROFASES,  label: 'Macro Mensal', icon: BarChart3,        soon: false },
  { href: ROUTES.EXPORTACOES, label: 'Exportações',  icon: FileBarChart2,    soon: false },
  { href: ROUTES.RANKINGS,    label: 'Rankings',     icon: Trophy,           soon: false },
  { href: ROUTES.DIAGNOSTICO, label: 'Diagnóstico',  icon: Activity,         soon: false },
  { href: ROUTES.JORNADA,     label: 'Jornada',      icon: Route,            soon: false },
  { href: ROUTES.EXPLORER,    label: 'BD Métricas',  icon: Sheet,            soon: false },
  { href: ROUTES.DADOS,       label: 'Fontes',       icon: Database,         soon: false },
  { href: ROUTES.TABELAS,     label: 'Consulta BD',  icon: Table2,           soon: false },
  { href: ROUTES.COMPARATIVO, label: 'Comparativo',  icon: GitCompareArrows, soon: true  },
  { href: ROUTES.ABANDONO,    label: 'Cancelamentos', icon: TrendingDown,    soon: true  },
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


// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { credentials, disconnect, bancosConectados, tokens: t } = useAuth();
  const { removedBancoIds, toggleBanco } = useFilters();

  const visibleBanks = bancosConectados.filter((b) => !removedBancoIds.includes(b.id));
  const hiddenBanks  = bancosConectados.filter((b) =>  removedBancoIds.includes(b.id));

  return (
    <aside
      className="flex h-screen w-[260px] shrink-0 flex-col"
      style={{ backgroundColor: t.bg.sidebar, borderRight: `1px solid ${t.border.subtle}` }}
    >
      {/* ── Logo */}
      <div
        className="flex items-center px-5 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${t.border.subtle}` }}
      >
        <img
          src={prognumLogo.src}
          alt="Prognum"
          className="h-7 w-auto object-contain"
          style={{ maxWidth: 160 }}
        />
      </div>

      {/* ── Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Filtros */}
        <section>
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
