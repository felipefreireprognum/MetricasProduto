'use client';

import { STRINGS } from '@/constants/strings';
import SectionTitle from '@/components/shared/SectionTitle';
import Card from '@/components/ui/Card';
import { colors } from '@/theme/colors';

const SECTIONS = [
  { key: 'basePrincipal', label: STRINGS.ag31.basePrincipal, color: colors.primary },
  { key: 'baseFinalizados', label: STRINGS.ag31.baseFinalizados, color: colors.accent },
  { key: 'imoveis', label: STRINGS.ag31.imoveis, color: colors.success },
  { key: 'originacao', label: STRINGS.ag31.originacao, color: colors.info },
];

export default function Ag31Screen() {
  return (
    <div className="overflow-y-auto bg-[#F8F9FC] p-6 h-screen">
      <SectionTitle title={STRINGS.ag31.title} subtitle={STRINGS.ag31.subtitle} />
      <div className="grid grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.key} accent={s.color}>
            <p className="text-sm font-semibold text-[#0F172A]">{s.label}</p>
            <p className="mt-2 text-xs text-[#94A3B8]">Carregue um arquivo AG31 para visualizar.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
