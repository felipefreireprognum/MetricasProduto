export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;

  const cols = Object.keys(rows[0]);

  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    cols.join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(',')),
  ];

  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
