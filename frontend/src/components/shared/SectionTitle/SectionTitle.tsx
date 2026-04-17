interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
      {subtitle && <p className="text-sm text-[#475569]">{subtitle}</p>}
    </div>
  );
}
