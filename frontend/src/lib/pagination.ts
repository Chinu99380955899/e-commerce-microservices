/** Page numbers with gaps, for example 1 … 4 5 6 … 20. Pages are 1-based. */
export function buildPageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) result.push('gap');
    result.push(p);
    previous = p;
  }
  return result;
}
