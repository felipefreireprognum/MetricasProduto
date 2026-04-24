'use client';

import type { FaseCount } from '@/types/dashboard';
import type { BankTokens } from '@/theme/tokens';

// ── Milestone definitions ─────────────────────────────────────────────────────

interface MilestoneDef {
  id:          string;
  label:       string;
  description: string;
  color:       string;
  keywords:    string[];
}

const MILESTONES: MilestoneDef[] = [
  {
    id:          'originacao',
    label:       'Originação',
    description: 'Proposta e cadastro inicial',
    color:       '#3B82F6',
    keywords:    ['proposta', 'cadastro', 'checklist'],
  },
  {
    id:          'credito',
    label:       'Análise de Crédito',
    description: 'Avaliação financeira e negociação',
    color:       '#8B5CF6',
    keywords:    ['crédito', 'credito', 'negociação', 'negociacao', 'pendente'],
  },
  {
    id:          'documentacao',
    label:       'Documentação',
    description: 'Validação documental e comitê',
    color:       '#F59E0B',
    keywords:    ['documento', 'pasta', 'compliance', 'comitê', 'comite', 'laudo', 'votos', 'avaliação', 'avaliacao'],
  },
  {
    id:          'formalizacao',
    label:       'Formalização',
    description: 'Contrato, assinatura e registro',
    color:       '#10B981',
    keywords:    ['contrato', 'formaliz', 'assinatura', 'registro', 'técnica', 'tecnica', 'garantia', 'emissão', 'emissao', 'liberação', 'liberacao', 'valores', 'confirma'],
  },
  {
    id:          'conclusao',
    label:       'Conclusão',
    description: 'Operações encerradas',
    color:       '#06B6D4',
    keywords:    ['concluíd', 'concluida', 'concluída', 'arquivad', 'cancelad', 'reprovad'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchMilestone(nomeFase: string): MilestoneDef | null {
  const lower = nomeFase.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const m of MILESTONES) {
    const hit = m.keywords.some((kw) => {
      const kwNorm = kw.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return lower.includes(kwNorm);
    });
    if (hit) return m;
  }
  return null;
}

interface MilestoneResult {
  def:   MilestoneDef;
  count: number;
  phases: FaseCount[];
}

function buildMilestones(phases: FaseCount[]): MilestoneResult[] {
  // Group phases by milestone
  const buckets = new Map<string, { def: MilestoneDef; phases: FaseCount[] }>();
  for (const m of MILESTONES) {
    buckets.set(m.id, { def: m, phases: [] });
  }

  for (const phase of phases) {
    const m = matchMilestone(phase.nome);
    if (m) buckets.get(m.id)!.phases.push(phase);
  }

  return MILESTONES.map((m) => {
    const bucket = buckets.get(m.id)!;
    // Use the phase with the highest total as the milestone's representative count
    // (approximates: how many operations entered this milestone)
    const count = bucket.phases.length > 0
      ? Math.max(...bucket.phases.map((p) => p.total))
      : 0;
    return { def: m, count, phases: bucket.phases };
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  phases: FaseCount[];
  tokens: BankTokens;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MilestoneFunnel({ phases, tokens: t }: Props) {
  const milestones = buildMilestones(phases).filter((m) => m.count > 0);
  if (!milestones.length) return null;

  const baseline = milestones[0].count || 1;

  const DASH = `1px dashed ${t.border.default}`;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>
          Funil por marcos do processo
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: t.text.muted }}>
          Fases agrupadas em etapas-chave do pipeline
        </p>
      </div>

      {/* Five-column milestone grid */}
      <div
        className="gap-3"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}
      >
        {milestones.map((m, i) => {
          const pct      = (m.count / baseline) * 100;
          const prev     = milestones[i - 1];
          const dropPct  = prev && prev.count > 0
            ? ((prev.count - m.count) / prev.count) * 100
            : null;

          return (
            <div key={m.def.id} className="flex flex-col">
              {/* Milestone number + label */}
              <div className="mb-2">
                <div
                  className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: m.def.color }}
                >
                  {i + 1}
                </div>
                <p className="text-xs font-semibold leading-tight" style={{ color: t.text.primary }}>
                  {m.def.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight" style={{ color: t.text.muted }}>
                  {m.def.description}
                </p>
              </div>

              {/* Count */}
              <div className="mb-2 text-2xl font-black tabular-nums leading-none" style={{ color: t.text.primary }}>
                {m.count.toLocaleString('pt-BR')}
              </div>

              {/* Vertical bar */}
              <div className="flex h-16 items-end">
                <div
                  className="relative flex w-full items-start justify-center rounded-t-md pt-1.5 text-[10px] font-bold text-white"
                  style={{
                    height: `${Math.max(pct, 8)}%`,
                    backgroundColor: m.def.color,
                    opacity: 0.3 + (pct / 100) * 0.7,
                  }}
                >
                  {pct >= 18 && `${pct.toFixed(1)}%`}
                </div>
              </div>

              {/* Dropoff indicator */}
              {dropPct != null && dropPct > 0 && (
                <div className="mt-2 text-center text-[10px] tabular-nums">
                  <span className="font-semibold" style={{ color: '#EF4444' }}>
                    −{dropPct.toFixed(1)}%
                  </span>
                  <span className="ml-1" style={{ color: t.text.muted }}>saída</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase breakdown per milestone */}
      <div className="mt-6 pt-4" style={{ borderTop: DASH }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.text.muted }}>
          Detalhamento de fases
        </p>
        <div
          className="gap-3"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}
        >
          {milestones.map((m) => (
            <div key={m.def.id}>
              <div
                className="mb-1.5 h-0.5 rounded-full"
                style={{ backgroundColor: m.def.color, opacity: 0.6 }}
              />
              <div className="flex flex-col gap-0.5">
                {m.phases.map((p) => (
                  <div key={p.fase} className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="truncate leading-relaxed" style={{ color: t.text.secondary }}>
                      {p.nome}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium" style={{ color: t.text.primary }}>
                      {p.total.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
                {m.phases.length === 0 && (
                  <span className="text-[10px]" style={{ color: t.text.muted }}>Sem dados</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
