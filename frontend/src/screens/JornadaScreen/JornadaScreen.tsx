'use client';

import { useState, useEffect } from 'react';
import { Route, Users, RefreshCw, AlertCircle, TrendingUp, Clock, Target, Repeat2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService } from '@/services/databaseService';
import { PageHeaderBar } from '@/components/layout/PageHeader/PageHeader';
import LoadingState from '@/components/shared/LoadingState';
import type { JornadaData } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Macrofase colors ──────────────────────────────────────────────────────────

const MACRO_COLOR: Record<string, string> = {
  'Simulação':             '#94A3B8',
  'Cadastro':              '#3B82F6',
  'Crédito':               '#8B5CF6',
  'Negociação':            '#F59E0B',
  'Análise de Documentos': '#EC4899',
  'Análise Técnica':       '#F97316',
  'Formalização':          '#10B981',
  'Liberação':             '#06B6D4',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon, color, label, value, sub, tokens: t,
}: {
  icon: React.ReactNode; color: string; label: string;
  value: string; sub?: string; tokens: BankTokens;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3.5"
      style={{
        backgroundColor: t.bg.surface,
        border:     `1px solid ${t.border.default}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}18` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black tabular-nums leading-tight" style={{ color: t.text.primary }}>
          {value}
        </p>
        <p className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, sub, children, tokens: t }: {
  title: string; sub?: string; children: React.ReactNode; tokens: BankTokens;
}) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${t.border.subtle}` }}>
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>{title}</h3>
        {sub && <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>{sub}</p>}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

// ── Tentativas distribution ───────────────────────────────────────────────────

const GROUP_COLORS = ['#94A3B8', '#3B82F6', '#8B5CF6', '#EF4444'];

function TentativasSection({ data, tokens: t }: { data: JornadaData; tokens: BankTokens }) {
  const base     = data.tentativasDistribuicao[0]?.conversao ?? 0;
  const totalOps = data.tentativasDistribuicao.reduce((s, g) => s + (g.operacoes ?? g.pessoas), 0);
  const totalPess = data.tentativasDistribuicao.reduce((s, g) => s + g.pessoas, 0);

  const pieData = data.tentativasDistribuicao.map((g, i) => ({
    name:  g.grupo,
    value: g.pessoas,
    color: GROUP_COLORS[i] ?? '#64748B',
  }));

  return (
    <SectionCard
      title="Quem são os reincidentes?"
      sub="Distribuição de pessoas por número de tentativas"
      tokens={t}
    >
      <div className="flex gap-4 items-center">
        {/* Donut */}
        <div className="shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={2}
                stroke={t.bg.surface}
                isAnimationActive={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [(Number(value)).toLocaleString('pt-BR'), 'pessoas']}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: `1px solid ${t.border.default}`,
                  backgroundColor: t.bg.surface,
                  color: t.text.primary,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="relative" style={{ marginTop: -92, textAlign: 'center', pointerEvents: 'none' }}>
            <p className="text-base font-black tabular-nums leading-none" style={{ color: t.text.primary }}>
              {fmt(totalPess)}
            </p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: t.text.muted }}>pessoas</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {data.tentativasDistribuicao.map((g, i) => {
            const color  = GROUP_COLORS[i] ?? '#64748B';
            const lift   = i > 0 && base > 0 ? `+${((g.conversao / base - 1) * 100).toFixed(0)}%` : null;
            const ops    = g.operacoes ?? g.pessoas;
            const opsPct = totalOps > 0 ? (ops / totalOps * 100).toFixed(0) : '0';
            const pct    = totalPess > 0 ? (g.pessoas / totalPess * 100).toFixed(1) : '0';
            return (
              <div key={g.grupo} className="flex items-center gap-2.5 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>{g.grupo}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lift && (
                        <span className="text-[9px] font-bold" style={{ color: '#16A34A' }}>{lift} conv.</span>
                      )}
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        {g.conversao.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] tabular-nums font-semibold" style={{ color: t.text.secondary }}>
                      {fmt(g.pessoas)} pess. · {pct}%
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>
                      {fmt(ops)} ops · {opsPct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.tentativasDistribuicao.length > 1 && (
        <div className="mt-4 flex flex-col gap-2">
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-2"
            style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <TrendingUp size={13} style={{ color: '#3B82F6', marginTop: 1, flexShrink: 0 }} />
            <p className="text-[11px] leading-snug" style={{ color: '#1E40AF' }}>
              Reincidentes convertem <strong>{data.convReincidentes.toFixed(1)}%</strong>{' '}
              vs <strong>{data.convPrimeiraTentativa.toFixed(1)}%</strong> na 1ª tentativa —{' '}
              são <strong>leads qualificados</strong>.
            </p>
          </div>
          {(data.totalRetentativas ?? 0) > 0 && (
            <div
              className="rounded-lg px-4 py-3 flex items-start gap-2"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <RefreshCw size={13} style={{ color: '#D97706', marginTop: 1, flexShrink: 0 }} />
              <p className="text-[11px] leading-snug" style={{ color: '#92400E' }}>
                <strong>{fmt(data.totalRetentativas ?? 0)} operações extras</strong> ({data.pctRetentativas?.toFixed(1)}% do total) são retentativas —
                carga que não existiria se a 1ª tentativa convertesse.
              </p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Tempo entre tentativas ────────────────────────────────────────────────────

function TempoSection({ data, tokens: t }: { data: JornadaData; tokens: BankTokens }) {
  const dist = data.tempoEntreAtividades.distribuicao;
  const max  = Math.max(...dist.map(d => d.total), 1);
  const { mediana, media } = data.tempoEntreAtividades;

  const FAIXA_COLORS: Record<string, string> = {
    '< 7 dias':   '#10B981',
    '7–30 dias':  '#3B82F6',
    '30–90 dias': '#F59E0B',
    '90+ dias':   '#EF4444',
  };

  return (
    <SectionCard
      title="Quando voltam?"
      sub="Tempo entre tentativas consecutivas de reincidentes"
      tokens={t}
    >
      {mediana != null && (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.subtle}` }}>
            <p className="text-lg font-black tabular-nums leading-none" style={{ color: t.text.primary }}>
              {Math.round(mediana)}d
            </p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: t.text.muted }}>Mediana</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: t.bg.base, border: `1px solid ${t.border.subtle}` }}>
            <p className="text-lg font-black tabular-nums leading-none" style={{ color: t.text.primary }}>
              {media != null ? Math.round(media) : '—'}d
            </p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: t.text.muted }}>Média</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {dist.map(d => {
          const color = FAIXA_COLORS[d.faixa] ?? '#64748B';
          const barW  = (d.total / max) * 100;
          return (
            <div key={d.faixa}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: t.text.secondary }}>{d.faixa}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: t.text.primary }}>{fmt(d.total)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.bg.elevated }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(barW, 1)}%`, backgroundColor: color, opacity: 0.8 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {dist.length > 0 && (() => {
        const rapidas = dist.find(d => d.faixa === '< 7 dias')?.total ?? 0;
        const totalG  = dist.reduce((s, d) => s + d.total, 0);
        if (totalG === 0) return null;
        const pct = (rapidas / totalG * 100).toFixed(0);
        return (
          <p className="mt-4 text-[10px] leading-snug" style={{ color: t.text.muted }}>
            <strong style={{ color: '#10B981' }}>{pct}%</strong> das retentativas acontecem em menos de 7 dias —{' '}
            {Number(pct) > 40 ? 'sinal de problema de UX ou processo' : 'distribuição equilibrada de retorno'}.
          </p>
        );
      })()}
    </SectionCard>
  );
}

// ── Progresso na 2ª tentativa ─────────────────────────────────────────────────

function ProgressoSection({ data, tokens: t }: { data: JornadaData; tokens: BankTokens }) {
  const p = data.progresso;
  if (!p || p.totalReincidentes === 0) return null;

  const total = p.totalReincidentes;
  const rows = [
    { key: 'melhorou', label: 'Avançaram mais longe', value: p.melhorou, color: '#10B981', icon: <ArrowUpRight size={13} /> },
    { key: 'igual',    label: 'Chegaram ao mesmo ponto', value: p.igual,    color: '#3B82F6', icon: <Minus size={13} /> },
    { key: 'piorou',   label: 'Não chegaram tão longe',  value: p.piorou,   color: '#EF4444', icon: <ArrowDownRight size={13} /> },
  ];
  const max = Math.max(p.melhorou, p.igual, p.piorou, 1);

  return (
    <SectionCard
      title="Progresso na 2ª tentativa"
      sub={`Comparação entre 1ª e 2ª operação · ${fmt(total)} reincidentes analisados`}
      tokens={t}
    >
      <div className="flex flex-col gap-3 mb-4">
        {rows.map(r => {
          const barW = (r.value / max) * 100;
          const pct  = total > 0 ? (r.value / total * 100).toFixed(1) : '0';
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-1.5" style={{ color: r.color }}>
                  {r.icon}
                  <span className="text-xs font-semibold" style={{ color: t.text.primary }}>{r.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>{pct}%</span>
                  <span className="text-xs font-bold tabular-nums w-14 text-right" style={{ color: t.text.primary }}>
                    {fmt(r.value)}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: t.bg.elevated }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(barW, 1)}%`, backgroundColor: r.color, opacity: 0.75 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {p.converteuNa2a > 0 && (
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-2"
          style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <Target size={13} style={{ color: '#16A34A', marginTop: 1, flexShrink: 0 }} />
          <p className="text-[11px] leading-snug" style={{ color: '#14532D' }}>
            <strong>{fmt(p.converteuNa2a)} pessoas</strong> que falharam na 1ª tentativa{' '}
            <strong>converteram na 2ª</strong> —{' '}
            {total > 0 ? `${(p.converteuNa2a / total * 100).toFixed(1)}%` : '—'} dos reincidentes recuperados.
          </p>
        </div>
      )}

      {p.melhorou > p.piorou ? (
        <p className="mt-3 text-[10px] leading-snug" style={{ color: t.text.muted }}>
          Maioria avança mais longe na 2ª tentativa — o processo melhora com a experiência.
        </p>
      ) : p.piorou > p.melhorou ? (
        <p className="mt-3 text-[10px] leading-snug" style={{ color: t.text.muted }}>
          Maioria não chega tão longe na 2ª tentativa — pode indicar desistência progressiva ou mudança de perfil.
        </p>
      ) : null}
    </SectionCard>
  );
}

// ── Onde a 1ª tentativa quebra ────────────────────────────────────────────────

function QuebraSection({ data, tokens: t }: { data: JornadaData; tokens: BankTokens }) {
  const max = Math.max(...data.primeiraQuebra.map(q => q.pessoas), 1);

  return (
    <SectionCard
      title="Onde a 1ª tentativa trava"
      sub={`${fmt(data.totalQuebrou)} pessoas com 1ª operação cancelada`}
      tokens={t}
    >
      {data.primeiraQuebra.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: t.text.muted }}>Sem dados suficientes</p>
      ) : (
        <div className="grid gap-2">
          {data.primeiraQuebra.map((q, i) => {
            const color = MACRO_COLOR[q.macrofase] ?? '#64748B';
            const barW  = (q.pessoas / max) * 100;
            return (
              <div key={q.fase} className="flex items-center gap-3">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-black text-white"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold truncate" style={{ color: t.text.primary }}>
                      {q.nome}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>
                        {q.pct.toFixed(1)}%
                      </span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: t.text.primary }}>
                        {fmt(q.pessoas)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: t.bg.elevated }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barW, 1)}%`, backgroundColor: color, opacity: 0.65 }}
                    />
                  </div>
                </div>
                <span
                  className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {q.macrofase}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function JornadaScreen() {
  const { tokens: t, bancosConectados } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [data, setData]         = useState<JornadaData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const banco = bancosConectados[0]?.id ?? 'c6';

  useEffect(() => {
    setLoading(true);
    setError(null);
    databaseService.getJornada(banco)
      .then(setData)
      .catch(e => setError(e?.response?.data?.detail ?? 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [banco]);

  const semDados = !loading && (!data || data.semDados);
  const hasProgresso = data?.progresso && data.progresso.totalReincidentes > 0;

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ backgroundColor: t.bg.base }}
      onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
    >
      <PageHeaderBar
        title="Jornada da Pessoa"
        icon={<Route size={20} style={{ color: t.accent.primary }} />}
        description="Reincidência, pontos de abandono e comportamento de retorno por CPF"
        scrolled={scrolled}
        tokens={t}
      />

      <div className="px-6 pb-6">
        {loading ? (
          <LoadingState message="Analisando jornadas..." tokens={t} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}
            >
              <AlertCircle size={28} style={{ color: '#EF4444' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>{error}</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Verifique se os dados foram atualizados com NU_CPF</p>
          </div>
        ) : semDados ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
            >
              <Users size={28} style={{ color: t.text.muted }} />
            </div>
            <p className="text-base font-semibold" style={{ color: t.text.primary }}>Dados de CPF não disponíveis</p>
            <p className="mt-1 text-sm" style={{ color: t.text.muted }}>Atualize os dados na tela Fontes para incluir NU_CPF</p>
          </div>
        ) : data && (
          <>
            {/* KPI row */}
            <div className="mb-5 grid grid-cols-4 gap-4">
              <KpiCard
                icon={<Users size={16} style={{ color: '#3B82F6' }} />}
                color="#3B82F6"
                label="Pessoas no funil"
                value={fmt(data.totalCpfs)}
                sub={`${data.totalCpfs.toLocaleString('pt-BR')} CPFs únicos`}
                tokens={t}
              />
              <KpiCard
                icon={<Repeat2 size={16} style={{ color: '#8B5CF6' }} />}
                color="#8B5CF6"
                label="Reincidentes"
                value={`${data.pctReincidentes.toFixed(1)}%`}
                sub={`${fmt(data.reincidentes)} tentaram 2x ou mais`}
                tokens={t}
              />
              <KpiCard
                icon={<Target size={16} style={{ color: '#10B981' }} />}
                color="#10B981"
                label="Conversão — 1ª tentativa"
                value={`${data.convPrimeiraTentativa.toFixed(1)}%`}
                sub={`vs ${data.convReincidentes.toFixed(1)}% reincidentes`}
                tokens={t}
              />
              <KpiCard
                icon={<Clock size={16} style={{ color: '#F59E0B' }} />}
                color="#F59E0B"
                label="Mediana entre tentativas"
                value={data.tempoEntreAtividades.mediana != null
                  ? `${Math.round(data.tempoEntreAtividades.mediana)} dias`
                  : '—'}
                sub={data.tempoEntreAtividades.media != null
                  ? `média ${Math.round(data.tempoEntreAtividades.media)} dias`
                  : undefined}
                tokens={t}
              />
            </div>

            {/* Middle row: tentativas (60%) + tempo (40%) */}
            <div className="mb-5 grid grid-cols-5 gap-4">
              <div className="col-span-3">
                <TentativasSection data={data} tokens={t} />
              </div>
              <div className="col-span-2">
                <TempoSection data={data} tokens={t} />
              </div>
            </div>

            {/* Bottom row: progresso (60%) + quebra (40%) */}
            {hasProgresso ? (
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3">
                  <ProgressoSection data={data} tokens={t} />
                </div>
                <div className="col-span-2">
                  <QuebraSection data={data} tokens={t} />
                </div>
              </div>
            ) : (
              <QuebraSection data={data} tokens={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
