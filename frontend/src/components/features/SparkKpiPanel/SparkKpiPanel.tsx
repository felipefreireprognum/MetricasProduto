'use client';

import { ArrowDown, ArrowUp, type LucideIcon, TrendingUp, Clock, Users, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { EvolucaoMensal } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardDef {
  icon:      LucideIcon;
  label:     string;
  getValue:  (d: EvolucaoMensal[]) => string;
  getSpark:  (d: EvolucaoMensal[]) => number[];
  getDelta:  (d: EvolucaoMensal[]) => { raw: number; pct: number };
  stroke:    string;
  fill:      string;
  higherGood: boolean;
}

interface Props {
  data:   EvolucaoMensal[];
  tokens: BankTokens;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDelta(raw: number, pct: number, higherGood: boolean, tokens: BankTokens) {
  const isGood = higherGood ? raw >= 0 : raw <= 0;
  const color  = isGood ? '#10B981' : '#EF4444';
  const up     = raw >= 0;
  return { color, up };
}

function lastDelta(vals: number[]): { raw: number; pct: number } {
  const last = vals[vals.length - 1] ?? 0;
  const prev = vals[vals.length - 2] ?? 0;
  const raw  = last - prev;
  const pct  = prev !== 0 ? (raw / Math.abs(prev)) * 100 : 0;
  return { raw, pct };
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

// ── Card definitions (bound to evolucaoMensal shape) ─────────────────────────

const CARDS: CardDef[] = [
  {
    icon:       TrendingUp,
    label:      'Iniciadas',
    getValue:   (d) => fmtNum(d[d.length - 1]?.iniciadas ?? 0),
    getSpark:   (d) => d.map((m) => m.iniciadas),
    getDelta:   (d) => lastDelta(d.map((m) => m.iniciadas)),
    stroke:     '#3B82F6',
    fill:       '#3B82F6',
    higherGood: true,
  },
  {
    icon:       CheckCircle2,
    label:      'Taxa de Conversão',
    getValue:   (d) => `${(d[d.length - 1]?.taxaConversao ?? 0).toFixed(1)}%`,
    getSpark:   (d) => d.map((m) => m.taxaConversao),
    getDelta:   (d) => lastDelta(d.map((m) => m.taxaConversao)),
    stroke:     '#10B981',
    fill:       '#10B981',
    higherGood: true,
  },
  {
    icon:       Clock,
    label:      'Tempo Médio (dias)',
    getValue:   (d) => {
      const v = d[d.length - 1]?.tempoMedio;
      return v != null ? `${v.toFixed(1)}d` : '—';
    },
    getSpark:   (d) => d.map((m) => m.tempoMedio ?? 0),
    getDelta:   (d) => lastDelta(d.map((m) => m.tempoMedio ?? 0)),
    stroke:     '#8B5CF6',
    fill:       '#8B5CF6',
    higherGood: false,
  },
  {
    icon:       Users,
    label:      'Em Fila',
    getValue:   (d) => fmtNum(d[d.length - 1]?.emFila ?? 0),
    getSpark:   (d) => d.map((m) => m.emFila),
    getDelta:   (d) => lastDelta(d.map((m) => m.emFila)),
    stroke:     '#F59E0B',
    fill:       '#F59E0B',
    higherGood: false,
  },
];

// ── Single card ───────────────────────────────────────────────────────────────

function SparkCard({
  def,
  data,
  tokens: t,
  isLast,
}: {
  def:    CardDef;
  data:   EvolucaoMensal[];
  tokens: BankTokens;
  isLast: boolean;
}) {
  if (!data.length) return null;

  const spark  = def.getSpark(data);
  const value  = def.getValue(data);
  const delta  = def.getDelta(data);
  const { color, up } = fmtDelta(delta.raw, delta.pct, def.higherGood, t);
  const chartData = spark.map((v, i) => ({ i, v }));
  const gradId    = `spark-${def.label.replace(/\s/g, '')}`;

  const absRaw = Math.abs(delta.raw);
  const rawStr = Number.isInteger(delta.raw)
    ? fmtNum(absRaw)
    : absRaw.toFixed(1);
  const pctStr = `${Math.abs(delta.pct).toFixed(1)}%`;

  return (
    <div
      className="flex flex-col p-3.5"
      style={{
        borderBottom: isLast ? 'none' : `1px solid ${t.border.default}`,
      }}
    >
      {/* Top row: icon + label */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: `${def.stroke}18`, color: def.stroke }}
        >
          <def.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-[11px] font-medium leading-tight" style={{ color: t.text.muted }}>
          {def.label}
        </span>
      </div>

      {/* Value */}
      <div className="text-xl font-bold leading-none tracking-tight tabular-nums" style={{ color: t.text.primary }}>
        {value}
      </div>

      {/* Delta */}
      <div className="mt-1 flex items-center gap-1 text-[10px]">
        <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color }}>
          {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {rawStr} ({pctStr})
        </span>
        <span style={{ color: t.text.muted }}>vs mês anterior</span>
      </div>

      {/* Sparkline */}
      <div className="mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 1, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={def.fill} stopOpacity={0.3} />
                <stop offset="100%" stopColor={def.fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={def.stroke}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function SparkKpiPanel({ data, tokens: t }: Props) {
  if (!data.length) return null;

  return (
    <div
      className="flex h-full flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="px-4 pt-4 pb-2" style={{ borderBottom: `1px solid ${t.border.default}` }}>
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          KPIs mensais
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          Último mês registrado
        </p>
      </div>

      <div className="flex flex-col flex-1">
        {CARDS.map((def, i) => (
          <SparkCard
            key={def.label}
            def={def}
            data={data}
            tokens={t}
            isLast={i === CARDS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
