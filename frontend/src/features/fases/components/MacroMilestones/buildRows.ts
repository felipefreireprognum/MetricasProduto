import type { FaseCount, TempoFase, FaseTransicao, MacrofaseTotal } from '@/types/dashboard';
import type { Entrada, MacrofaseRow, PhaseDetail, Saida } from '@/types/fases/macroMilestones';

import { MACROFASES, POS_EMISSAO_IDS } from './constants';

export function buildRows(
  fases:           FaseCount[],
  tempos:          TempoFase[],
  transicoes:      FaseTransicao[] = [],
  macrofaseTotais: MacrofaseTotal[] = [],
) {
  const tempoMap        = new Map(tempos.map((tf) => [tf.fase, tf.tempoMedioDias]));
  const macroTotalMap   = new Map(macrofaseTotais.map((m) => [m.macrofase, m.total]));
  const macroReprovMap  = new Map(macrofaseTotais.map((m) => [m.macrofase, m.reprovados ?? 0]));
  const faseNomeMap     = new Map(fases.map((f) => [f.fase, f.nome]));
  const saidasMap       = new Map<number, Saida[]>();
  const entradasMap     = new Map<number, Entrada[]>();
  for (const tr of transicoes) {
    const saList = saidasMap.get(tr.de) ?? [];
    saList.push({ para: tr.para, nome: tr.paraNome, qtd: tr.qtd });
    saidasMap.set(tr.de, saList);

    const enList = entradasMap.get(tr.para) ?? [];
    enList.push({ de: tr.de, nome: faseNomeMap.get(tr.de) ?? `Fase ${tr.de}`, qtd: tr.qtd });
    entradasMap.set(tr.para, enList);
  }

  const buckets = new Map<string, PhaseDetail[]>(MACROFASES.map((m) => [m.id, []]));

  for (const fase of fases) {
    const key = fase.macrofase ?? 'Desconhecida';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({
      fase:        fase.fase,
      nome:        fase.nome,
      total:       fase.total,
      tempo:       tempoMap.get(fase.fase) ?? null,
      abandono:    fase.abandono ?? 0,
      emAndamento: fase.emAndamento ?? 0,
      saidas:      saidasMap.get(fase.fase) ?? [],
      entradas:    entradasMap.get(fase.fase) ?? [],
    });
  }

  const funnelRows:     MacrofaseRow[] = [];
  const posEmissaoRows: MacrofaseRow[] = [];
  let concluidoRow:     MacrofaseRow | null = null;
  let canceladaRow:     MacrofaseRow | null = null;

  for (const mf of MACROFASES) {
    const phases = (buckets.get(mf.id) ?? []).sort((a, b) => a.fase - b.fase);
    if (phases.length === 0 && mf.id !== 'EmissÃ£o de Contrato') continue;

    const reprovados  = macroReprovMap.get(mf.id) ?? 0;
    const emissaoPrincipal = mf.id === 'EmissÃ£o de Contrato' ? phases.find(p => p.fase === 501) : null;
    const count       = (emissaoPrincipal?.total ?? macroTotalMap.get(mf.id) ?? phases.reduce((s, p) => s + p.total, 0)) + reprovados;
    // fase 101 nÃ£o entra no abandono nem no emAndamento do macrofase â€” sÃ£o reprovados, jÃ¡ contabilizados em âœ— reprov.
    const abandono    = emissaoPrincipal?.abandono ?? phases.filter(p => p.fase !== 101).reduce((s, p) => s + p.abandono, 0);
    const emAndamento = emissaoPrincipal?.emAndamento ?? phases.filter(p => p.fase !== 101).reduce((s, p) => s + p.emAndamento, 0);
    const withTempo   = phases.filter((p) => p.tempo != null);
    const avgTempo    = emissaoPrincipal?.tempo ?? (withTempo.length
      ? withTempo.reduce((s, p) => s + p.tempo!, 0) / withTempo.length
      : null);

    const row: MacrofaseRow = { id: mf.id, label: mf.id, color: mf.color, count, avgTempo, abandono, emAndamento, phases, reprovados };

    if      (mf.id === 'ConcluÃ­do')        concluidoRow = row;
    else if (mf.id === 'Cancelada')        canceladaRow = row;
    else if (POS_EMISSAO_IDS.has(mf.id))  posEmissaoRows.push(row);
    else                                   funnelRows.push(row);
  }

  // Sobe fase 600 (Registro do Contrato) para a seÃ§Ã£o de EmissÃ£o de Contrato
  // e cria um chevron visual separado no funil com cor mais clara
  const emissaoRow = funnelRows.find(r => r.id === 'EmissÃ£o de Contrato');
  const formRow    = posEmissaoRows.find(r => r.id === 'FormalizaÃ§Ã£o');
  if (emissaoRow) {
    const registroSourceRow = posEmissaoRows.find(r => r.phases.some(p => p.fase === 600)) ?? formRow;
    const idx = registroSourceRow?.phases.findIndex(p => p.fase === 600) ?? -1;
    const fase600 = idx !== -1 && registroSourceRow ? registroSourceRow.phases.splice(idx, 1)[0] : null;
    if (fase600) {
      funnelRows.push({
        id: 'Registro de Contrato',
        label: 'Registro de Contrato',
        color: '#34D399',
        count: fase600.total,
        avgTempo: fase600.tempo,
        abandono: fase600.abandono,
        emAndamento: fase600.emAndamento,
        phases: [fase600],
        reprovados: 0,
      });
    }
  }

  return { funnelRows, posEmissaoRows, concluidoRow, canceladaRow };
}
