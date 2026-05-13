'use client';

import type { MacroMilestonesProps } from '@/types/fases/macroMilestones';

import { buildRows } from './buildRows';
import { ChevronFunnelMode } from './components/ChevronFunnelMode';
import { DetailMode } from './components/DetailMode';
import { ExpandFunnelMode } from './components/ExpandFunnelMode';
import { FunnelMode } from './components/FunnelMode';

export function MacroMilestones({ fases, tempos, tokens: t, mode = 'funnel', transicoes = [], macrofaseTotais = [], dimensao = 'operacoes' }: MacroMilestonesProps) {
  const { funnelRows, posEmissaoRows, concluidoRow, canceladaRow } = buildRows(fases, tempos, transicoes, macrofaseTotais);

  if (mode === 'detail') {
    return (
      <DetailMode funnelRows={funnelRows} concluidoRow={concluidoRow} canceladaRow={canceladaRow} tokens={t} />
    );
  }

  if (mode === 'expand') {
    return (
      <ExpandFunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} concluidoRow={concluidoRow} canceladaRow={canceladaRow} tokens={t} />
    );
  }

  if (mode === 'chevron') {
    return <ChevronFunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} canceladaRow={canceladaRow} concluidoRow={concluidoRow} tokens={t} dimensao={dimensao} />;
  }

  return (
    <FunnelMode funnelRows={funnelRows} posEmissaoRows={posEmissaoRows} concluidoRow={concluidoRow} canceladaRow={canceladaRow} tokens={t} />
  );
}