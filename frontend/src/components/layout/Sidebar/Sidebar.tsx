'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileSpreadsheet, GitCompare, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

const navItems = [
  { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: STRINGS.nav.dashboard },
  { href: ROUTES.AG31, icon: FileSpreadsheet, label: STRINGS.nav.ag31 },
  { href: ROUTES.AG31_COMPARATIVO, icon: GitCompare, label: STRINGS.nav.comparativo },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { credentials, disconnect } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[#E2E8F0] bg-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[#E2E8F0]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A5FFF]">
          <span className="text-xs font-bold text-white">AG</span>
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F172A]">{STRINGS.app.name}</p>
          <p className="text-xs text-[#94A3B8]">{STRINGS.app.subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-[#EFF2F9] text-[#1A5FFF] font-medium'
                  : 'text-[#475569] hover:bg-[#F8F9FC]'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#E2E8F0] px-3 py-3">
        {credentials && (
          <p className="px-3 mb-2 text-xs text-[#94A3B8] truncate">{credentials.login}</p>
        )}
        <button
          onClick={disconnect}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#475569] hover:bg-[#FEE2E2] hover:text-[#EF4444] transition-colors"
        >
          <LogOut size={16} />
          {STRINGS.nav.logout}
        </button>
      </div>
    </aside>
  );
}
