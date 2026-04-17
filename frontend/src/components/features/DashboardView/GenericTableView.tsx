import type { TabelaRow } from '@/types/dashboard';
import EmptyState from '@/components/shared/EmptyState';

interface Props {
  rows: TabelaRow[];
}

export default function GenericTableView({ rows }: Props) {
  if (!rows.length) return <EmptyState />;
  const cols = Object.keys(rows[0]);

  return (
    <div className="overflow-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full text-sm">
        <thead className="bg-[#F8F9FC] text-left">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 font-medium text-[#475569] whitespace-nowrap border-b border-[#E2E8F0]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((row, i) => (
            <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8F9FC] transition-colors">
              {cols.map((c) => (
                <td key={c} className="px-4 py-2.5 text-[#0F172A] whitespace-nowrap max-w-[200px] truncate">
                  {row[c] == null ? <span className="text-[#94A3B8]">null</span> : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
