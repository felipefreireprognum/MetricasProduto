'use client';

import { Users, RefreshCw, TrendingUp, UserPlus } from 'lucide-react';
import type { DashboardKpis } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

interface MiniKpiProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  color: string;
  tokens: BankTokens;
}

function MiniKpi({ icon, value, label, sub, color, tokens: t }: MiniKpiProps) {
  return (
    <div
      className="flex-1 rounded-xl p-4"
      style={{
        backgroundColor: t.bg.surface,
        border: `1px solid ${t.border.default}`,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t.text.muted }}>{label}</p>
      </div>
      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: t.text.primary }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium" style={{ color }}>{sub}</p>}
    </div>
  );
}

interface Row {
  pergunta: string;
  operacoes: string;
  cpf: string;
  cpfHighlight?: boolean;
}

interface Props {
  kpis: DashboardKpis;
  tokens: BankTokens;
}

export function CpfInsightsPanel({ kpis, tokens: t }: Props) {
  const hasCpf = kpis.cpfsUnicos != null;

  if (!hasCpf) {
    return (
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${t.accent.primary}10` }}
        >
          <Users size={20} style={{ color: t.accent.primary }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: t.text.primary }}>
            Dados de CPF ainda não disponíveis
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.text.muted }}>
            Acesse <strong>Fontes</strong> e clique em <strong>Atualizar</strong> para carregar métricas por pessoa.
          </p>
        </div>
      </div>
    );
  }

  const {
    cpfsUnicos = 0, operacoesIniciadas, operacoesConcluidas,
    taxaConversao, taxaConversaoCpf = 0, cpfsReincidentes = 0,
    pctReincidentes = 0, cpfsNovos = 0, cpfsRetorno = 0,
  } = kpis;

  const rows: Row[] = [
    {
      pergunta: 'Quantas pessoas entraram no funil?',
      operacoes: `${fmt(operacoesIniciadas)} operações`,
      cpf: `${fmt(cpfsUnicos)} pessoas`,
      cpfHighlight: true,
    },
    {
      pergunta: 'Taxa de conversão real',
      operacoes: `${taxaConversao.toFixed(1)}% das operações`,
      cpf: `${taxaConversaoCpf.toFixed(1)}% das pessoas`,
      cpfHighlight: taxaConversaoCpf > taxaConversao,
    },
    {
      pergunta: 'Clientes reincidentes (2+ tentativas)',
      operacoes: '—',
      cpf: `${fmt(cpfsReincidentes)} (${pctReincidentes.toFixed(1)}%)`,
      cpfHighlight: true,
    },
    {
      pergunta: 'Captação nova vs retorno',
      operacoes: '—',
      cpf: `${fmt(cpfsNovos)} novos · ${fmt(cpfsRetorno)} retornos`,
      cpfHighlight: true,
    },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: `1px solid ${t.border.subtle}` }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
            Perspectiva por Pessoa (CPF)
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: t.text.muted }}>
            Como os números mudam quando olhamos por pessoa e não por operação
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{ backgroundColor: `${t.accent.primary}12`, color: t.accent.primary }}
        >
          {fmt(cpfsUnicos)} CPFs únicos
        </span>
      </div>

      {/* Mini KPIs */}
      <div className="flex gap-3 p-4" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <MiniKpi
          icon={<Users size={12} />}
          value={fmt(cpfsUnicos)}
          label="Pessoas únicas"
          sub={`vs ${fmt(operacoesIniciadas)} operações`}
          color="#3B82F6"
          tokens={t}
        />
        <MiniKpi
          icon={<TrendingUp size={12} />}
          value={`${taxaConversaoCpf.toFixed(1)}%`}
          label="Conversão por pessoa"
          sub={`${taxaConversao.toFixed(1)}% por operação`}
          color="#10B981"
          tokens={t}
        />
        <MiniKpi
          icon={<RefreshCw size={12} />}
          value={fmt(cpfsReincidentes)}
          label="Reincidentes"
          sub={`${pctReincidentes.toFixed(1)}% tentaram 2x`}
          color="#F59E0B"
          tokens={t}
        />
        <MiniKpi
          icon={<UserPlus size={12} />}
          value={fmt(cpfsNovos)}
          label="Captação nova"
          sub={`${fmt(cpfsRetorno)} retornos`}
          color="#8B5CF6"
          tokens={t}
        />
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden">
        {/* Table header */}
        <div
          className="grid text-[10px] font-bold uppercase tracking-widest px-5 py-2"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr',
            backgroundColor: t.bg.base,
            color: t.text.muted,
            borderBottom: `1px solid ${t.border.subtle}`,
          }}
        >
          <span>Pergunta</span>
          <span>Por operação (hoje)</span>
          <span>Por pessoa (CPF)</span>
        </div>

        {rows.map((row, i) => (
          <div
            key={i}
            className="grid items-center px-5 py-3 text-sm"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr',
              borderBottom: i < rows.length - 1 ? `1px solid ${t.border.subtle}` : 'none',
            }}
          >
            <span className="font-medium text-xs" style={{ color: t.text.secondary }}>
              {row.pergunta}
            </span>
            <span className="text-xs tabular-nums" style={{ color: t.text.muted }}>
              {row.operacoes}
            </span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: row.cpfHighlight ? t.accent.primary : t.text.secondary }}
            >
              {row.cpf}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
