'use client';

import { STRINGS } from '@/constants/strings';
import SectionTitle from '@/components/shared/SectionTitle';
import EmptyState from '@/components/shared/EmptyState';

export default function ComparativoScreen() {
  return (
    <div className="overflow-y-auto bg-[#F8F9FC] p-6 h-screen">
      <SectionTitle title={STRINGS.comparativo.title} subtitle={STRINGS.comparativo.subtitle} />
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
        <EmptyState message="Carregue arquivos AG31 das três instituições para visualizar o comparativo." />
      </div>
    </div>
  );
}
