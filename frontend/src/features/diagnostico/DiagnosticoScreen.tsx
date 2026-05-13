'use client';

import { useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2,
  Clock3, Gauge, HelpCircle, Route, Timer, TrendingDown, Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { MACROFASE_BADGE, MACROFASE_COLOR } from '@/theme/phaseColors';
import type { DashboardData, EvolucaoMensal, FaseCount, TempoFase } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

type Severity = 'critical' | 'warning' | 'good' | 'neutral';

interface DiagnosticItem {
  title: string;
  value: string;
  detail: string;
  action: string;
  severity: Severity;
  icon: LucideIcon;
}

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function sevColor(severity: Severity): string {
  return {
    critical: '#DC2626',
    warning:  '#F59E0B',
    good:     '#16A34A',
    neutral:  '#3B82F6',
  }[severity];
}

function trendRecent(data: EvolucaoMensal[]): { label: string; detail: string; severity: Severity; icon: LucideIcon } {
  const vals = data.map(d => d.taxaConversao).filter(v => Number.isFinite(v));
  if (vals.length < 6) {
    return {
      label: 'Histórico curto',
      detail: 'Ainda faltam meses suficientes para comparar tendência recente.',
      severity: 'neutral',
      icon: HelpCircle,
    };
  }

  const recent = vals.slice(-3).reduce((s, v) => s + v, 0) / 3;
  const before = vals.slice(-6, -3).reduce((s, v) => s + v, 0) / 3;
  const diff = recent - before;

  if (diff > 1) {
    return {
      label: `+${diff.toFixed(1)} p.p.`,
      detail: `A conversão média dos últimos 3 meses está acima dos 3 meses anteriores.`,
      severity: 'good',
      icon: ArrowUpRight,
    };
  }
  if (diff < -1) {
    return {
      label: `${diff.toFixed(1)} p.p.`,
      detail: `A conversão média dos últimos 3 meses está abaixo dos 3 meses anteriores.`,
      severity: 'critical',
      icon: ArrowDownRight,
    };
  }
  return {
    label: 'Estável',
    detail: 'A conversão recente está praticamente no mesmo patamar.',
    severity: 'neutral',
    icon: Activity,
  };
}

function byMacro<T extends { macrofase: string }>(rows: T[], value: (row: T) => number): Map<string, number> {
  const result = new Map<string, number>();
  rows.forEach(row => {
    result.set(row.macrofase, (result.get(row.macrofase) ?? 0) + value(row));
  });
  return result;
}

function topTempo(tempos: TempoFase[]): TempoFase | null {
  return tempos
    .filter(t => t.tempoMedioDias > 0)
    .sort((a, b) => b.tempoMedioDias - a.tempoMedioDias)[0] ?? null;
}

function topAbandono(fases: FaseCount[]): (FaseCount & { taxa: number }) | null {
  return fases
    .map(f => ({ ...f, taxa: f.total > 0 ? ((f.abandono ?? 0) / f.total) * 100 : 0 }))
    .filter(f => (f.abandono ?? 0) > 0)
    .sort((a, b) => b.taxa - a.taxa || (b.abandono ?? 0) - (a.abandono ?? 0))[0] ?? null;
}

function buildDiagnostics(data: DashboardData): DiagnosticItem[] {
  const fases = data.operacoesPorFase ?? [];
  const kpis = data.kpis;
  const emAndamentoPorMacro = byMacro(fases, f => f.emAndamento ?? 0);
  const maiorFila = [...emAndamentoPorMacro.entries()].sort((a, b) => b[1] - a[1])[0];
  const lento = topTempo(data.tempoMedioPorFase ?? []);
  const abandono = topAbandono(fases);
  const trend = trendRecent(data.evolucaoMensal ?? []);

  const retorno = kpis.cpfsReincidentes ?? 0;
  const pctRetorno = kpis.pctReincidentes ?? 0;
  const convCpf = kpis.taxaConversaoCpf;
  const convOps = kpis.taxaConversao;
  const cpfDelta = convCpf != null ? convCpf - convOps : null;

  return [
    {
      title: 'Onde está parado agora?',
      value: maiorFila && maiorFila[1] > 0 ? `${fmt(maiorFila[1])} em ${maiorFila[0]}` : `${fmt(kpis.operacoesEmFila)} em andamento`,
      detail: maiorFila && maiorFila[1] > 0
        ? 'Esta macrofase concentra o maior estoque de propostas abertas.'
        : 'Há propostas abertas, mas a concentração por fase ainda está baixa ou indisponível.',
      action: 'Priorizar a fila dessa macrofase antes de olhar apenas volume total.',
      severity: maiorFila && maiorFila[1] > 0 ? 'warning' : 'neutral',
      icon: Gauge,
    },
    {
      title: 'Onde mais demora?',
      value: lento ? `${lento.tempoMedioDias.toFixed(1)} dias` : 'Sem tempo calculado',
      detail: lento ? `${lento.nome} é a fase com maior tempo médio entre transições.` : 'Ainda não há transições suficientes para tempo médio.',
      action: 'Depois, trocar média por P75/P90 para achar gargalo real sem distorção.',
      severity: lento && lento.tempoMedioDias >= 30 ? 'critical' : lento && lento.tempoMedioDias >= 15 ? 'warning' : 'neutral',
      icon: Timer,
    },
    {
      title: 'Onde mais cancela?',
      value: abandono ? `${pct(abandono.taxa)} em ${abandono.nome}` : 'Sem abandono',
      detail: abandono ? `${fmt(abandono.abandono)} propostas cancelaram após passar por essa fase.` : 'Não há abandono pré-cancelamento calculado.',
      action: 'Agrupar motivos de cancelamento para separar comercial, documentação, laudo, jurídico e demora.',
      severity: abandono && abandono.taxa >= 30 ? 'critical' : abandono && abandono.taxa >= 15 ? 'warning' : 'neutral',
      icon: TrendingDown,
    },
    {
      title: 'A safra recente melhorou?',
      value: trend.label,
      detail: trend.detail,
      action: 'Evoluir para cohort por mês de entrada para comparar safras de forma justa.',
      severity: trend.severity,
      icon: trend.icon,
    },
    {
      title: 'Reincidente é oportunidade?',
      value: retorno > 0 ? `${fmt(retorno)} CPFs` : 'Sem CPF suficiente',
      detail: retorno > 0
        ? `${pctRetorno.toFixed(1)}% dos CPFs têm mais de uma proposta${cpfDelta != null ? `; conversão por CPF está ${cpfDelta >= 0 ? 'acima' : 'abaixo'} da proposta.` : '.'}`
        : 'A análise depende de NU_CPF preenchido no Parquet.',
      action: 'Separar quem voltou e avançou de quem voltou e gerou retrabalho.',
      severity: retorno > 0 && (cpfDelta ?? 0) >= 0 ? 'good' : retorno > 0 ? 'warning' : 'neutral',
      icon: Users,
    },
  ];
}

function DiagnosticCard({ item, tokens: t }: { item: DiagnosticItem; tokens: BankTokens }) {
  const color = sevColor(item.severity);
  const Icon = item.icon;

  return (
    <div
      className="flex flex-col rounded-xl p-4"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, borderLeft: `3px solid ${color}` }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}14` }}>
          <Icon size={17} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: t.text.muted }}>{item.title}</p>
          <p className="mt-1 text-xl font-black leading-tight" style={{ color: t.text.primary }}>{item.value}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>{item.detail}</p>
      <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: `${color}0F`, border: `1px solid ${color}22` }}>
        <p className="text-[11px] font-semibold leading-relaxed" style={{ color }}>{item.action}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, tokens: t }: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: React.ReactNode;
  tokens: BankTokens;
}) {
  return (
    <section className="rounded-xl" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.accent.primary}12` }}>
          <Icon size={16} style={{ color: t.accent.primary }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: t.text.primary }}>{title}</h2>
          <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FaseRow({ fase, max, tokens: t, metric }: { fase: FaseCount; max: number; tokens: BankTokens; metric: 'emAndamento' | 'abandono' }) {
  const value = metric === 'emAndamento' ? (fase.emAndamento ?? 0) : (fase.abandono ?? 0);
  const color = MACROFASE_COLOR[fase.macrofase] ?? t.accent.primary;
  const badge = MACROFASE_BADGE[fase.macrofase] ?? { bg: t.bg.base, color };

  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-xs font-semibold" style={{ color: t.text.primary }}>{fase.nome}</p>
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: badge.bg, color: badge.color }}>
            {fase.macrofase}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
          <div className="h-full rounded-full" style={{ width: `${Math.max((value / Math.max(max, 1)) * 100, 2)}%`, backgroundColor: color }} />
        </div>
      </div>
      <p className="w-16 text-right text-sm font-black tabular-nums" style={{ color }}>{fmt(value)}</p>
    </div>
  );
}

function GapCard({ title, text, tokens: t }: { title: string; text: string; tokens: BankTokens }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.default}` }}>
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
        <p className="text-xs font-bold" style={{ color: t.text.primary }}>{title}</p>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: t.text.secondary }}>{text}</p>
    </div>
  );
}

export default function DiagnosticoScreen() {
  const { tokens: t } = useAuth();
  const { dataGlobal, loading, hasData } = useDashboardScreen();

  const diagnostics = useMemo(() => dataGlobal ? buildDiagnostics(dataGlobal) : [], [dataGlobal]);
  const fasesEmFila = useMemo(
    () => [...(dataGlobal?.operacoesPorFase ?? [])]
      .filter(f => (f.emAndamento ?? 0) > 0)
      .sort((a, b) => (b.emAndamento ?? 0) - (a.emAndamento ?? 0))
      .slice(0, 8),
    [dataGlobal],
  );
  const fasesAbandono = useMemo(
    () => [...(dataGlobal?.operacoesPorFase ?? [])]
      .filter(f => (f.abandono ?? 0) > 0)
      .sort((a, b) => (b.abandono ?? 0) - (a.abandono ?? 0))
      .slice(0, 8),
    [dataGlobal],
  );
  const maxFila = Math.max(...fasesEmFila.map(f => f.emAndamento ?? 0), 1);
  const maxAbandono = Math.max(...fasesAbandono.map(f => f.abandono ?? 0), 1);

  if (loading) {
    return <LoadingState message="Carregando diagnóstico..." tokens={t} />;
  }

  if (!hasData || !dataGlobal) {
    return (
      <EmptyState
        message="Sem dados para diagnóstico"
        description="Atualize ou expanda uma fonte para gerar os indicadores operacionais."
        tokens={t}
      />
    );
  }

  const kpis = dataGlobal.kpis;

  return (
    <div className="space-y-5 px-6 pb-8">
        <div className="grid gap-3 md:grid-cols-4">
          <DiagnosticCard
            item={{
              title: 'Propostas abertas',
              value: fmt(kpis.operacoesEmFila),
              detail: `${fmt(kpis.operacoesConcluidas)} concluídas e ${fmt(kpis.operacoesCanceladas)} canceladas.`,
              action: 'Use como estoque total; a prioridade aparece por fase abaixo.',
              severity: kpis.operacoesEmFila > kpis.operacoesConcluidas ? 'warning' : 'neutral',
              icon: Clock3,
            }}
            tokens={t}
          />
          <DiagnosticCard
            item={{
              title: 'Conversão geral',
              value: pct(kpis.taxaConversao),
              detail: 'Percentual de propostas iniciadas que chegaram ao final.',
              action: 'Comparar com conversão por CPF e com safra recente.',
              severity: kpis.taxaConversao >= 20 ? 'good' : kpis.taxaConversao >= 10 ? 'warning' : 'critical',
              icon: CheckCircle2,
            }}
            tokens={t}
          />
          <DiagnosticCard
            item={{
              title: 'Tempo médio total',
              value: kpis.tempoMedioTotal != null ? `${kpis.tempoMedioTotal.toFixed(1)} dias` : '—',
              detail: 'Média entre início e conclusão das propostas concluídas.',
              action: 'Próximo passo: medir mediana e P90 por fase.',
              severity: (kpis.tempoMedioTotal ?? 0) > 60 ? 'critical' : (kpis.tempoMedioTotal ?? 0) > 30 ? 'warning' : 'neutral',
              icon: Timer,
            }}
            tokens={t}
          />
          <DiagnosticCard
            item={{
              title: 'CPFs únicos',
              value: fmt(kpis.cpfsUnicos),
              detail: `${fmt(kpis.cpfsReincidentes)} CPFs reincidentes na base atual.`,
              action: 'Usar Jornada para separar oportunidade de retrabalho.',
              severity: (kpis.cpfsReincidentes ?? 0) > 0 ? 'good' : 'neutral',
              icon: Users,
            }}
            tokens={t}
          />
        </div>

        <section className="grid gap-3 lg:grid-cols-5">
          {diagnostics.map(item => (
            <DiagnosticCard key={item.title} item={item} tokens={t} />
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Fila Atual Por Fase"
            subtitle="Fases onde a última posição da proposta ainda não é terminal"
            icon={Route}
            tokens={t}
          >
            {fasesEmFila.length > 0 ? (
              <div>
                {fasesEmFila.map(fase => (
                  <FaseRow key={fase.fase} fase={fase} max={maxFila} metric="emAndamento" tokens={t} />
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: t.text.muted }}>Sem fila por fase calculada.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Abandono Mais Relevante"
            subtitle="Última fase não cancelada antes da proposta cancelar"
            icon={TrendingDown}
            tokens={t}
          >
            {fasesAbandono.length > 0 ? (
              <div>
                {fasesAbandono.map(fase => (
                  <FaseRow key={fase.fase} fase={fase} max={maxAbandono} metric="abandono" tokens={t} />
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: t.text.muted }}>Sem abandono calculado.</p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Próximas Lacunas De Dados"
          subtitle="O que falta para o diagnóstico ficar mais preciso"
          icon={AlertTriangle}
          tokens={t}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <GapCard
              title="Aging real"
              text="Criar faixas 0-7, 8-15, 16-30 e 30+ dias usando a data da última fase aberta."
              tokens={t}
            />
            <GapCard
              title="SLA e P90"
              text="Trocar leitura por média simples para mediana, P75, P90 e quantidade fora do SLA."
              tokens={t}
            />
            <GapCard
              title="Motivo de cancelamento"
              text="Agrupar códigos de cancelamento em comercial, concorrência, documentação, imóvel, jurídico e demora."
              tokens={t}
            />
          </div>
        </SectionCard>
    </div>
  );
}
