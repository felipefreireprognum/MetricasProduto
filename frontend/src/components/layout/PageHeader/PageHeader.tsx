'use client';

import { Layers, Users } from 'lucide-react';
import { useFilters } from '@/contexts/FiltersContext';
import type { BankTokens } from '@/theme/tokens';

interface PageHeaderBarProps {
  title:        string;
  icon?:        React.ReactNode;
  description?: string;
  badges?:      React.ReactNode;
  right?:       React.ReactNode;
  scrolled:     boolean;
  tokens:       BankTokens;
}

export function PageHeaderBar({
  title,
  icon,
  description,
  badges,
  right,
  scrolled,
  tokens: t,
}: PageHeaderBarProps) {
  const { dimensao, setDimensao } = useFilters();

  return (
    <div
      className="sticky top-0 z-20 px-6"
      style={{
        backgroundColor: t.bg.base,
        borderBottom: `1px solid ${scrolled ? t.border.subtle : 'transparent'}`,
        transition: 'border-color 0.2s ease',
        paddingTop: 28,
        paddingBottom: 20,
      }}
    >
      {/* Row 1: icon + title + right slot */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${t.accent.primary}12` }}
            >
              {icon}
            </div>
          )}
          <h1 className="text-2xl font-bold leading-tight" style={{ color: t.text.primary }}>
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Global dimensao toggle */}
          <div
            className="flex gap-0.5 p-0.5 rounded-lg"
            style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
          >
            {([
              { id: 'operacoes', label: 'Operação', icon: Layers },
              { id: 'cpf',       label: 'Pessoa',   icon: Users  },
            ] as const).map(({ id, label, icon: Icon }) => {
              const active = dimensao === id;
              return (
                <button
                  key={id}
                  onClick={() => setDimensao(id)}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: active ? t.accent.primary : 'transparent',
                    color: active ? '#fff' : t.text.secondary,
                  }}
                >
                  <Icon size={11} />
                  {label}
                </button>
              );
            })}
          </div>

          {right}
        </div>
      </div>

      {/* Row 2: description + badges */}
      {(description || badges) && (
        <div
          className="flex flex-wrap items-center gap-2 mt-2"
          style={{ paddingLeft: icon ? 52 : 0 }}
        >
          {description && (
            <p className="text-sm" style={{ color: t.text.muted }}>
              {description}
            </p>
          )}
          {badges}
        </div>
      )}
    </div>
  );
}
