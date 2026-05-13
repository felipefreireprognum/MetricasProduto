'use client';

import { useMemo, useState } from 'react';
import { Check, Clipboard, Database, Download, FileSpreadsheet, Link2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FiltersContext';
import { useDashboardScreen } from '@/hooks/dashboard/useDashboardScreen';
import type { BankTokens } from '@/theme/tokens';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function Card({
  title,
  description,
  icon,
  children,
  tokens: t,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tokens: BankTokens;
}) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: t.bg.surface, border: `1px solid ${t.border.default}` }}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.accent.primary}12`, color: t.accent.primary }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: t.text.primary }}>{title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: t.text.muted }}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function UrlBox({
  url,
  copied,
  onCopy,
  tokens: t,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
  tokens: BankTokens;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#F8FAFC', border: `1px solid ${t.border.subtle}` }}>
      <code className="min-w-0 flex-1 truncate text-[11px]" style={{ color: t.text.secondary }}>{url}</code>
      <button
        onClick={onCopy}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold"
        style={{ color: copied ? '#16A34A' : t.accent.primary, border: `1px solid ${copied ? '#BBF7D0' : `${t.accent.primary}35`}` }}
      >
        {copied ? <Check size={12} /> : <Clipboard size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function DownloadButton({ href, children, tokens: t }: { href: string; children: React.ReactNode; tokens: BankTokens }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: t.accent.primary }}
    >
      <Download size={13} />
      {children}
    </a>
  );
}

export default function ExportacoesScreen() {
  const { tokens: t } = useAuth();
  const { activeBank } = useDashboardScreen();
  const { periodoInicio, periodoFim } = useFilters();
  const [copied, setCopied] = useState<string | null>(null);

  const banco = activeBank?.id ?? 'c6';
  const ambiente = activeBank?.ambiente;

  const urls = useMemo(() => {
    const common = {
      banco,
      ambiente,
      inicio: periodoInicio ?? undefined,
      fim: periodoFim ?? undefined,
    };

    return {
      macroPowerBi: buildUrl('/exports/macro-evolucao', { ...common, meses: 12, formato: 'json' }),
      macroCsv: buildUrl('/exports/macro-evolucao', { ...common, meses: 12, formato: 'csv' }),
      parquetCsv: buildUrl('/parquet/export', { banco, ambiente, limit: 1000000 }),
    };
  }, [banco, ambiente, periodoInicio, periodoFim]);

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 1600);
  }

  return (
    <div className="px-6 pb-6">
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card
          title="Power BI"
          description="URLs tabulares para usar em Obter Dados > Web."
          icon={<Link2 size={18} />}
          tokens={t}
        >
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>Macro Mensal JSON</p>
              <UrlBox url={urls.macroPowerBi} copied={copied === 'macroPowerBi'} onCopy={() => copy('macroPowerBi', urls.macroPowerBi)} tokens={t} />
            </div>
          </div>
        </Card>

        <Card
          title="CSV Macro Mensal"
          description="Arquivo tabular por mes e macrofase."
          icon={<FileSpreadsheet size={18} />}
          tokens={t}
        >
          <div className="space-y-3">
            <UrlBox url={urls.macroCsv} copied={copied === 'macroCsv'} onCopy={() => copy('macroCsv', urls.macroCsv)} tokens={t} />
            <DownloadButton href={urls.macroCsv} tokens={t}>Baixar CSV Macro Mensal</DownloadButton>
          </div>
        </Card>

        <Card
          title="CSV Base Completa"
          description="Exporta a tabela inteira do Parquet local."
          icon={<Database size={18} />}
          tokens={t}
        >
          <div className="space-y-3">
            <UrlBox url={urls.parquetCsv} copied={copied === 'parquetCsv'} onCopy={() => copy('parquetCsv', urls.parquetCsv)} tokens={t} />
            <DownloadButton href={urls.parquetCsv} tokens={t}>Baixar CSV do Parquet</DownloadButton>
          </div>
        </Card>
      </div>

      <div className="rounded-xl p-4" style={{ backgroundColor: '#F8FAFC', border: `1px solid ${t.border.subtle}` }}>
        <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>
          Para Power BI, use a URL JSON da Macro Mensal em <strong>Obter Dados &gt; Web</strong>.
          Para Excel ou validacao operacional, use os CSVs. A base completa respeita o banco e ambiente ativos.
        </p>
      </div>
    </div>
  );
}
