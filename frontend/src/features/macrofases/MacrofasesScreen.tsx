'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  PauseCircle,
  Percent,
  RotateCcw,
  Stamp,
  TrendingDown,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import LoadingState from '@/components/shared/LoadingState';
import { databaseService } from '@/services/databaseService';
import type { MacroEvolucaoData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

type MetricKey = 'volume' | 'pctAvanco' | 'abandono' | 'emAndamento' | 'creditoReprovado' | 'tempoMedio';

const COLORS: Record<string, string> = {
  simulacao: '#64748B',
  cadastro: '#2563EB',
  credito: '#7C3AED',
  negociacao: '#D97706',
  analise_documental: '#DB2777',
  analise_tecnica: '#EA580C',
  emissao_contrato: '#059669',
  registro_contrato: '#06B6D4',
};

const METRICS: Record<MetricKey, { label: string; suffix: string; description: string; valueSuffix?: string }> = {
  volume: {
    label: 'Volume',
    suffix: '',
    description: 'Propostas unicas que passaram pela macrofase no mes.',
  },
  pctAvanco: {
    label: 'Avanco %',
    suffix: '_pctAvanco',
    description: 'Percentual da macrofase anterior que tambem chegou nesta macrofase no mesmo mes.',
    valueSuffix: '%',
  },
  abandono: {
    label: 'Abandono',
    suffix: '_abandono',
    description: 'Canceladas cujo ultimo ponto antes do cancelamento foi a macrofase.',
  },
  emAndamento: {
    label: 'Paradas',
    suffix: '_emAndamento',
    description: 'Propostas cuja ultima fase registrada ficou nessa macrofase.',
  },
  creditoReprovado: {
    label: 'Reprovado (Credito)',
    suffix: '_creditoReprovado',
    description: 'Propostas em Credito Reprovado.',
  },
  tempoMedio: {
    label: 'Tempo medio',
    suffix: '_tempoMedio',
    description: 'Media de dias ate a proxima fase, usando registros do mes.',
    valueSuffix: 'd',
  },
};

const SUB_METRICS: Exclude<MetricKey, 'volume'>[] = ['pctAvanco', 'abandono', 'creditoReprovado', 'emAndamento', 'tempoMedio'];

function metricKey(stageId: string, metric: MetricKey) {
  return `${stageId}${METRICS[metric].suffix}`;
}

function formatNumber(value: number | null, suffix = '') {
  if (value == null) return '-';
  const formatted = suffix === 'd' || suffix === '%'
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : value.toLocaleString('pt-BR');
  return `${formatted}${suffix}`;
}

function KpiCard({
  icon,
  label,
  value,
  color,
  tokens: t,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  tokens: BankTokens;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3.5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>{value}</p>
        <p className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>{label}</p>
      </div>
    </div>
  );
}

function CheckToggle({
  checked,
  label,
  onClick,
  tokens: t,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  tokens: BankTokens;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
      style={{ color: checked ? t.accent.primary : t.text.secondary, border: `1px solid ${checked ? `${t.accent.primary}55` : t.border.default}` }}
    >
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded"
        style={{ backgroundColor: checked ? t.accent.primary : '#FFFFFF', border: `1px solid ${checked ? t.accent.primary : t.border.default}` }}
      >
        {checked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function MonthToggle({
  checked,
  label,
  onClick,
  tokens: t,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  tokens: BankTokens;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
      style={{
        backgroundColor: checked ? `${t.accent.primary}12` : t.bg.surface,
        border: `1px solid ${checked ? `${t.accent.primary}55` : t.border.default}`,
        color: checked ? t.accent.primary : t.text.muted,
      }}
    >
      {label}
    </button>
  );
}

function MonthSelectionModal({
  rows,
  selectedMonths,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
  tokens: t,
}: {
  rows: { mes: string; label: string }[];
  selectedMonths: Set<string>;
  onToggle: (mes: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
  tokens: BankTokens;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(15,23,42,0.45)' }} onClick={onClose} />
      <div
        className="relative w-[520px] max-w-full overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>Meses exibidos</h3>
            <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
              Escolha quais meses entram no grafico, totais e tabela.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: t.text.muted, backgroundColor: t.bg.base }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-4 gap-2">
            {rows.map((row) => (
              <MonthToggle
                key={row.mes}
                checked={selectedMonths.has(row.mes)}
                label={row.label}
                onClick={() => onToggle(row.mes)}
                tokens={t}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${t.border.subtle}` }}>
          <span className="text-xs font-medium" style={{ color: t.text.muted }}>
            {selectedMonths.size} de {rows.length} meses selecionados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ color: t.text.secondary, border: `1px solid ${t.border.default}` }}
            >
              Limpar
            </button>
            <button
              onClick={onSelectAll}
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ color: t.text.secondary, border: `1px solid ${t.border.default}` }}
            >
              Todos
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: t.accent.primary }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', minWidth: 210 }}>
      <p className="mb-2 font-bold text-[#0F172A]">{label}</p>
      {(payload as any[]).map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
          <span className="flex-1 text-[#475569]">{item.name}</span>
          <span className="font-semibold tabular-nums text-[#0F172A]">
            {formatNumber(item.value == null ? null : Number(item.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tokens: t, title, subtitle }: { tokens: BankTokens; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
        <BarChart3 size={28} style={{ color: t.text.muted }} />
      </div>
      <p className="text-base font-semibold" style={{ color: t.text.primary }}>{title}</p>
      <p className="mt-1 text-sm" style={{ color: t.text.muted }}>{subtitle}</p>
    </div>
  );
}

function DetailLine({
  children,
  color,
  icon,
  title,
}: {
  children: React.ReactNode;
  color: string;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <div
      className="flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium leading-tight tabular-nums"
      style={{ color, opacity: 0.86 }}
      title={title}
    >
      <span className="inline-flex h-3 w-3 items-center justify-center shrink-0">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

const DETAIL_ICONS = {
  avanco: <Percent size={10} strokeWidth={2.4} />,
  abandono: <RotateCcw size={10} strokeWidth={2.4} />,
  reprovado: <X size={10} strokeWidth={3} />,
  fila: <PauseCircle size={10} strokeWidth={2.4} />,
  tempo: <Clock size={10} strokeWidth={2.4} />,
};

function DetailLegend({ tokens: t }: { tokens: BankTokens }) {
  const items = [
    { label: 'Volume: propostas unicas na macrofase', color: '#0F172A', icon: <BarChart3 size={10} strokeWidth={2.4} /> },
    { label: 'Avanco sobre etapa anterior', color: '#2563EB', icon: DETAIL_ICONS.avanco },
    { label: 'Abandono/cancelamento', color: '#DC2626', icon: DETAIL_ICONS.abandono },
    { label: 'Credito reprovado', color: '#DC2626', icon: DETAIL_ICONS.reprovado },
    { label: 'Em fila/parado', color: '#D97706', icon: DETAIL_ICONS.fila },
    { label: 'Tempo medio', color: '#64748B', icon: DETAIL_ICONS.tempo },
  ];

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2"
      style={{ backgroundColor: '#F8FAFC', border: `1px solid ${t.border.subtle}` }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
        Legenda
      </span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: t.text.secondary }}>
          <span className="inline-flex h-3 w-3 items-center justify-center" style={{ color: item.color }}>
            {item.icon}
          </span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function StageHeader({ label }: { label: string }) {
  return (
    <span>{label}</span>
  );
}

export default function MacrofasesScreen() {
  const { tokens: t } = useAuth();
  const { activeBank, loading: dashboardLoading } = useDashboardScreen();
  const { periodoInicio, periodoFim } = useFilters();
  const [data, setData] = useState<MacroEvolucaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<Exclude<MetricKey, 'volume'>, boolean>>({
    pctAvanco: true,
    abandono: false,
    creditoReprovado: true,
    emAndamento: false,
    tempoMedio: false,
  });
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [showMonthModal, setShowMonthModal] = useState(false);

  useEffect(() => {
    if (!activeBank?.id) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    databaseService
      .getMacroEvolucao(activeBank.id, activeBank.ambiente, periodoInicio ?? undefined, periodoFim ?? undefined, 12)
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err?.response?.data?.detail ?? 'Nao foi possivel carregar a evolucao mensal.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBank?.id, activeBank?.ambiente, periodoInicio, periodoFim]);

  const rows = data?.rows ?? [];
  const stages = data?.stages ?? [];
  const monthsKey = rows.map((row) => row.mes).join('|');

  useEffect(() => {
    setSelectedMonths(new Set(rows.map((row) => row.mes)));
  }, [monthsKey]);

  const visibleRows = useMemo(
    () => rows.filter((row) => selectedMonths.has(row.mes)),
    [rows, selectedMonths],
  );

  const visibleTotals = useMemo(() => {
    return stages.map((stage) => {
      let total = 0;
      let abandono = 0;
      let emAndamento = 0;
      let creditoReprovado = 0;
      let tempoSoma = 0;
      let tempoCount = 0;

      for (const row of visibleRows) {
        total += Number(row[stage.id] ?? 0);
        abandono += Number(row[metricKey(stage.id, 'abandono')] ?? 0);
        emAndamento += Number(row[metricKey(stage.id, 'emAndamento')] ?? 0);
        creditoReprovado += Number(row[metricKey(stage.id, 'creditoReprovado')] ?? 0);
        const tempo = row[metricKey(stage.id, 'tempoMedio')];
        if (tempo != null) {
          tempoSoma += Number(tempo);
          tempoCount += 1;
        }
      }

      return {
        id: stage.id,
        label: stage.label,
        total,
        abandono,
        emAndamento,
        creditoReprovado,
        tempoMedio: tempoCount ? tempoSoma / tempoCount : null,
        pctAvanco: 0,
      };
    }).map((item, index, arr) => ({
      ...item,
      pctAvanco: index === 0
        ? (item.total > 0 ? 100 : 0)
        : (arr[index - 1].total > 0 ? (item.total / arr[index - 1].total) * 100 : 0),
    }));
  }, [stages, visibleRows]);

  const totalAbandono = useMemo(() => visibleTotals.reduce((sum, item) => sum + item.abandono, 0), [visibleTotals]);
  const registroTotal = visibleTotals.find((item) => item.id === 'registro_contrato')?.total ?? 0;
  const registroMediaMes = visibleRows.length ? Math.round(registroTotal / visibleRows.length) : 0;

  const isLoading = dashboardLoading || loading;
  const toggleMonth = (mes: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });
  };
  const selectAllMonths = () => setSelectedMonths(new Set(rows.map((row) => row.mes)));
  const clearMonths = () => setSelectedMonths(new Set());

  return (
    <div className="px-6 pb-6">
      {isLoading ? (
        <LoadingState message="Carregando macro mensal..." tokens={t} />
      ) : error ? (
        <EmptyState tokens={t} title="Erro ao carregar dados" subtitle={error} />
      ) : !data || rows.length === 0 ? (
        <EmptyState tokens={t} title="Sem dados mensais" subtitle="Atualize ou expanda o historico em Fontes." />
      ) : visibleRows.length === 0 ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMonthModal(true)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ color: t.text.secondary, border: `1px solid ${t.border.default}` }}
            >
              Selecionar meses ({selectedMonths.size}/{rows.length})
            </button>
          </div>
          <EmptyState tokens={t} title="Nenhum mes selecionado" subtitle="Selecione ao menos um mes para exibir a analise." />
          {showMonthModal && (
            <MonthSelectionModal
              rows={rows}
              selectedMonths={selectedMonths}
              onToggle={toggleMonth}
              onSelectAll={selectAllMonths}
              onClear={clearMonths}
              onClose={() => setShowMonthModal(false)}
              tokens={t}
            />
          )}
        </>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-4 gap-3">
            <KpiCard icon={<CalendarDays size={16} style={{ color: '#2563EB' }} />} color="#2563EB" value={`${visibleRows.length}`} label="Meses exibidos" tokens={t} />
            <KpiCard icon={<Stamp size={16} style={{ color: '#06B6D4' }} />} color="#06B6D4" value={formatNumber(registroTotal)} label="Registro de Contrato total" tokens={t} />
            <KpiCard icon={<BarChart3 size={16} style={{ color: '#0F766E' }} />} color="#0F766E" value={formatNumber(registroMediaMes)} label="Registro de Contrato medio/mes" tokens={t} />
            <KpiCard icon={<TrendingDown size={16} style={{ color: '#EF4444' }} />} color="#EF4444" value={formatNumber(totalAbandono)} label="Abandonos mapeados" tokens={t} />
          </div>

          <div className="mb-5 rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
                  Evolucao mensal por macrofase
                </h3>
                <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
                  Volume mensal como numero principal; detalhes ficam abaixo de cada etapa na tabela.
                </p>
              </div>
            </div>

            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleRows} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={t.border.default} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.text.muted as string }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: t.text.muted as string }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)}
                  />
                  <Tooltip content={<MacroTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {stages.map((stage) => (
                    <Bar
                      key={stage.id}
                      dataKey={stage.id}
                      name={stage.label}
                      fill={COLORS[stage.id] ?? '#64748B'}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={30}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold" style={{ color: t.text.muted }}>Mostrar abaixo do volume:</span>
            {SUB_METRICS.map((metric) => (
              <CheckToggle
                key={metric}
                checked={visibleMetrics[metric]}
                label={METRICS[metric].label}
                onClick={() => setVisibleMetrics((prev) => ({ ...prev, [metric]: !prev[metric] }))}
                tokens={t}
              />
            ))}
            <button
              onClick={() => setShowMonthModal(true)}
              className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ color: t.text.secondary, border: `1px solid ${t.border.default}` }}
            >
              Meses ({selectedMonths.size}/{rows.length})
            </button>
          </div>

          <DetailLegend tokens={t} />

          <div className="w-full overflow-hidden rounded-xl" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  <th className="w-[82px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.muted, backgroundColor: '#F8FAFC' }}>Mes</th>
                  {stages.map((stage) => (
                    <th key={stage.id} className="break-words px-2 py-3 text-right text-[9px] font-bold uppercase tracking-wider leading-tight" style={{ color: t.text.muted }}>
                      <StageHeader label={stage.label} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: `1px solid ${t.border.default}`, backgroundColor: '#FBFDFF' }}>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: t.text.muted, backgroundColor: '#FBFDFF' }}>
                    Total
                  </td>
                  {stages.map((stage) => {
                    const total = visibleTotals.find((item) => item.id === stage.id);
                    return (
                      <td key={`total-${stage.id}`} className="px-2 py-3 text-right align-top">
                        <div className="text-base font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>
                          {formatNumber(total?.total ?? 0)}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {visibleMetrics.pctAvanco && <DetailLine color="#2563EB" icon={DETAIL_ICONS.avanco} title="Avanco sobre etapa anterior">{formatNumber(total?.pctAvanco ?? null, '%')}</DetailLine>}
                          {visibleMetrics.abandono && <DetailLine color="#DC2626" icon={DETAIL_ICONS.abandono} title="Abandono/cancelamento">{formatNumber(total?.abandono ?? 0)}</DetailLine>}
                          {visibleMetrics.creditoReprovado && stage.id === 'credito' && (
                            <DetailLine color="#DC2626" icon={DETAIL_ICONS.reprovado} title="Credito reprovado">{formatNumber(total?.creditoReprovado ?? 0)}</DetailLine>
                          )}
                          {visibleMetrics.emAndamento && <DetailLine color="#D97706" icon={DETAIL_ICONS.fila} title="Em fila/parado">{formatNumber(total?.emAndamento ?? 0)}</DetailLine>}
                          {visibleMetrics.tempoMedio && <DetailLine color="#64748B" icon={DETAIL_ICONS.tempo} title="Tempo medio">{formatNumber(total?.tempoMedio ?? null, 'd')}</DetailLine>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {visibleRows.map((row) => (
                  <tr key={row.mes} style={{ borderTop: `1px solid ${t.border.default}` }}>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold" style={{ color: t.text.primary, backgroundColor: t.bg.surface }}>{row.label}</td>
                    {stages.map((stage) => (
                      <td key={`${row.mes}-${stage.id}`} className="px-2 py-3 text-right align-top">
                        <div className="text-base font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>
                          {formatNumber(Number(row[stage.id] ?? 0))}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {visibleMetrics.pctAvanco && <DetailLine color="#2563EB" icon={DETAIL_ICONS.avanco} title="Avanco sobre etapa anterior">{formatNumber(Number(row[metricKey(stage.id, 'pctAvanco')] ?? 0), '%')}</DetailLine>}
                          {visibleMetrics.abandono && <DetailLine color="#DC2626" icon={DETAIL_ICONS.abandono} title="Abandono/cancelamento">{formatNumber(Number(row[metricKey(stage.id, 'abandono')] ?? 0))}</DetailLine>}
                          {visibleMetrics.creditoReprovado && stage.id === 'credito' && (
                            <DetailLine color="#DC2626" icon={DETAIL_ICONS.reprovado} title="Credito reprovado">
                              {formatNumber(Number(row[metricKey(stage.id, 'creditoReprovado')] ?? 0))}
                            </DetailLine>
                          )}
                          {visibleMetrics.emAndamento && <DetailLine color="#D97706" icon={DETAIL_ICONS.fila} title="Em fila/parado">{formatNumber(Number(row[metricKey(stage.id, 'emAndamento')] ?? 0))}</DetailLine>}
                          {visibleMetrics.tempoMedio && <DetailLine color="#64748B" icon={DETAIL_ICONS.tempo} title="Tempo medio">{formatNumber(row[metricKey(stage.id, 'tempoMedio')] == null ? null : Number(row[metricKey(stage.id, 'tempoMedio')]), 'd')}</DetailLine>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showMonthModal && (
            <MonthSelectionModal
              rows={rows}
              selectedMonths={selectedMonths}
              onToggle={toggleMonth}
              onSelectAll={selectAllMonths}
              onClear={clearMonths}
              onClose={() => setShowMonthModal(false)}
              tokens={t}
            />
          )}
        </>
      )}
    </div>
  );
}
