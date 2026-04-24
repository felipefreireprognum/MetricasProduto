'use client';

import { useState, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import type { FaseCount, TempoFase } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Milestone definitions ─────────────────────────────────────────────────────

const MILESTONES = [
  { id: 'originacao',   label: 'Originação',         color: '#3B82F6', keywords: ['proposta', 'cadastro', 'checklist'] },
  { id: 'credito',      label: 'Análise de Crédito', color: '#8B5CF6', keywords: ['crédito', 'credito', 'negociação', 'negociacao', 'pendente'] },
  { id: 'documentacao', label: 'Documentação',        color: '#F59E0B', keywords: ['documento', 'pasta', 'compliance', 'comitê', 'comite', 'laudo', 'votos', 'avaliação', 'avaliacao'] },
  { id: 'formalizacao', label: 'Formalização',        color: '#10B981', keywords: ['contrato', 'formaliz', 'assinatura', 'registro', 'técnica', 'tecnica', 'garantia', 'emissão', 'emissao', 'liberação', 'liberacao', 'valores', 'confirma'] },
  { id: 'conclusao',    label: 'Conclusão',           color: '#06B6D4', keywords: ['concluíd', 'concluida', 'concluída', 'arquivad', 'cancelad', 'reprovad'] },
] as const;

type MilestoneId = typeof MILESTONES[number]['id'];

function matchMilestone(nome: string) {
  const lower = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return MILESTONES.find((m) =>
    m.keywords.some((kw) => lower.includes(kw.normalize('NFD').replace(/[̀-ͯ]/g, '')))
  ) ?? null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhaseDetail {
  fase:  number;
  nome:  string;
  total: number;
  tempo: number | null;
}

interface MilestoneRow {
  id:       MilestoneId;
  label:    string;
  color:    string;
  count:    number;
  avgTempo: number | null;
  phases:   PhaseDetail[];
}

interface HoverState {
  milestone: MilestoneRow;
  x: number;
  y: number;
}

interface Props {
  fases:  FaseCount[];
  tempos: TempoFase[];
  tokens: BankTokens;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempoBadge(dias: number | null) {
  if (dias == null) return { bg: '#F1F5F9', text: '#94A3B8', label: '—' };
  if (dias < 7)     return { bg: '#DCFCE7', text: '#16A34A', label: `${dias.toFixed(1)}d` };
  if (dias < 20)    return { bg: '#FEF9C3', text: '#CA8A04', label: `${dias.toFixed(1)}d` };
  if (dias < 40)    return { bg: '#FFEDD5', text: '#EA580C', label: `${dias.toFixed(1)}d` };
  return              { bg: '#FEE2E2', text: '#DC2626', label: `${dias.toFixed(1)}d` };
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────

function HoverCard({ hover, tokens: t }: { hover: HoverState; tokens: BankTokens }) {
  const { milestone: m, x, y } = hover;
  const maxTotal = Math.max(...m.phases.map((p) => p.total), 1);

  // Keep card inside viewport
  const cardW = 280;
  const cardH = 48 + m.phases.length * 36 + 16;
  const left  = Math.min(x + 16, window.innerWidth  - cardW - 12);
  const top   = Math.min(y + 12, window.innerHeight - cardH - 12);

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-xl shadow-xl"
      style={{
        left,
        top,
        width: cardW,
        backgroundColor: '#FFFFFF',
        border: `1px solid ${t.border.default}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: `1px solid ${t.border.default}` }}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ backgroundColor: m.color }}
        >
          {MILESTONES.findIndex((ml) => ml.id === m.id) + 1}
        </span>
        <p className="text-xs font-semibold" style={{ color: t.text.primary }}>{m.label}</p>
        <span className="ml-auto text-[10px] font-medium tabular-nums" style={{ color: t.text.muted }}>
          {m.count.toLocaleString('pt-BR')} ops
        </span>
      </div>

      {/* Phase list */}
      <div className="flex flex-col px-4 py-2">
        {m.phases.length === 0 && (
          <p className="py-2 text-[11px]" style={{ color: t.text.muted }}>Sem fases mapeadas</p>
        )}
        {m.phases.map((p) => {
          const barPct = (p.total / maxTotal) * 100;
          const badge  = tempoBadge(p.tempo);
          return (
            <div key={p.fase} className="flex flex-col gap-1 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-medium" style={{ color: t.text.primary }}>
                  {p.nome}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] tabular-nums font-semibold" style={{ color: t.text.secondary }}>
                    {p.total.toLocaleString('pt-BR')}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
              {/* Mini bar */}
              <div className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: t.bg.elevated }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: m.color, opacity: 0.6 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MacroMilestones({ fases, tempos, tokens: t }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const tempoMap = new Map(tempos.map((tf) => [tf.fase, tf.tempoMedioDias]));

  // Build milestone rows with full phase details
  const buckets = new Map<MilestoneId, { phases: PhaseDetail[] }>(
    MILESTONES.map((m) => [m.id, { phases: [] }])
  );

  for (const fase of fases) {
    const m = matchMilestone(fase.nome);
    if (!m) continue;
    buckets.get(m.id)!.phases.push({
      fase:  fase.fase,
      nome:  fase.nome,
      total: fase.total,
      tempo: tempoMap.get(fase.fase) ?? null,
    });
  }

  const rows: MilestoneRow[] = MILESTONES.map((m) => {
    const { phases } = buckets.get(m.id)!;
    const count      = phases.length > 0 ? Math.max(...phases.map((p) => p.total)) : 0;
    const withTempo  = phases.filter((p) => p.tempo != null);
    const avgTempo   = withTempo.length
      ? withTempo.reduce((s, p) => s + p.tempo!, 0) / withTempo.length
      : null;
    return { ...m, count, avgTempo, phases };
  }).filter((r) => r.count > 0);

  if (!rows.length) return null;

  const baseline = rows[0].count || 1;

  const handleMouseMove = useCallback((e: React.MouseEvent, m: MilestoneRow) => {
    setHover({ milestone: m, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  return (
    <>
      <div
        className="flex h-full flex-col rounded-xl p-5"
        style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
            Funil por marcos
          </h3>
          <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
            Volume e tempo médio por etapa · passe o mouse para ver o detalhe
          </p>
        </div>

        <div className="flex items-stretch gap-2">
          {rows.map((m, i) => {
            const pct    = (m.count / baseline) * 100;
            const badge  = tempoBadge(m.avgTempo);
            const isLast = i === rows.length - 1;

            return (
              <div key={m.id} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="flex flex-1 min-w-0 flex-col gap-2 rounded-xl p-4 cursor-default transition-shadow"
                  style={{
                    backgroundColor: t.bg.base,
                    border:    `1px solid ${t.border.default}`,
                    borderTop: `3px solid ${m.color}`,
                  }}
                  onMouseMove={(e) => handleMouseMove(e, m)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Step + label */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {i + 1}
                    </span>
                    <p className="truncate text-[11px] font-semibold" style={{ color: t.text.secondary }}>
                      {m.label}
                    </p>
                  </div>

                  {/* Count */}
                  <p className="text-2xl font-black tabular-nums leading-none" style={{ color: t.text.primary }}>
                    {m.count.toLocaleString('pt-BR')}
                  </p>

                  {/* % of baseline */}
                  <p className="text-[10px] tabular-nums" style={{ color: t.text.muted }}>
                    {i === 0 ? '100% baseline' : `${pct.toFixed(1)}% do total`}
                  </p>

                  {/* Mini bar */}
                  <div className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: t.border.default }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: m.color, opacity: 0.7 }}
                    />
                  </div>

                  {/* Avg time */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px]" style={{ color: t.text.muted }}>Tempo médio</span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {!isLast && (
                  <ArrowRight className="h-4 w-4 shrink-0" style={{ color: t.text.muted }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hover && <HoverCard hover={hover} tokens={t} />}
    </>
  );
}
