'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Table, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

const navItems = [
  { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: STRINGS.nav.dashboard },
  { href: ROUTES.TABELAS, icon: Table, label: STRINGS.nav.tabelas },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { credentials, disconnect, bancosConectados, tokens } = useAuth();

  const t = tokens;

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col"
      style={{ backgroundColor: t.bg.sidebar, borderRight: `1px solid ${t.border.subtle}` }}
    >
      {/* Topo: Prognum + banco */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        {/* Prognum */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1A5FFF] to-[#0A2E8A]">
            <span className="text-xs font-black text-white">P</span>
          </div>
          <span className="text-sm font-black tracking-tight" style={{ color: t.text.primary }}>
            Prognum
          </span>
        </div>

        {/* Ambientes conectados */}
        {bancosConectados.length > 0 && (
          <div className="space-y-1">
            {bancosConectados.map((banco) => (
              <div
                key={banco.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: t.accent.yellowSubtle, border: `1px solid ${t.accent.yellow}25` }}
              >
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: banco.colors.bg }}
                >
                  <span className="text-[8px] font-black text-white">
                    {banco.id === 'c6' ? 'C6' : banco.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate" style={{ color: t.accent.yellow }}>
                    {banco.name}
                  </p>
                  <p className="text-[9px]" style={{ color: t.text.muted }}>
                    {banco.dbType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtítulo do sistema */}
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: t.text.muted }}>
          Métricas AG31
        </p>
        <p className="text-[9px] mt-0.5" style={{ color: t.text.muted }}>
          SCCI / FCVS
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: active ? t.sidebar.activeBg : 'transparent',
                color: active ? t.sidebar.activeText : t.sidebar.text,
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = t.sidebar.hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-2 pb-4" style={{ borderTop: `1px solid ${t.border.subtle}`, paddingTop: '12px' }}>
        {credentials && (
          <p className="px-3 mb-2 text-[11px] truncate" style={{ color: t.text.muted }}>
            {credentials.login}
          </p>
        )}
        <button
          onClick={disconnect}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          style={{ color: t.sidebar.text }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#EF444415';
            (e.currentTarget as HTMLElement).style.color = '#EF4444';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = t.sidebar.text;
          }}
        >
          <LogOut size={16} />
          {STRINGS.nav.logout}
        </button>
      </div>
    </aside>
  );
}
