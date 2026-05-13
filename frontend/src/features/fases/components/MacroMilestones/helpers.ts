export function tempoBadge(dias: number | null) {
  if (dias == null) return { bg: '#F1F5F9', text: '#94A3B8', label: 'Ã¢â‚¬â€' };
  if (dias < 7)     return { bg: '#DCFCE7', text: '#16A34A', label: `${dias.toFixed(1)}d` };
  if (dias < 20)    return { bg: '#FEF9C3', text: '#CA8A04', label: `${dias.toFixed(1)}d` };
  if (dias < 40)    return { bg: '#FFEDD5', text: '#EA580C', label: `${dias.toFixed(1)}d` };
  return              { bg: '#FEE2E2', text: '#DC2626', label: `${dias.toFixed(1)}d` };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pt-BR');
}