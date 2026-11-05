/** Indian number formatting: lakh and crore. */
export function inr(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '–';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (opts.compact) {
    if (a >= 1e7) return `${sign}₹${trim(a / 1e7)} Cr`;
    if (a >= 1e5) return `${sign}₹${trim(a / 1e5)} L`;
  }
  return sign + '₹' + Math.round(a).toLocaleString('en-IN');
}
function trim(x: number): string {
  return (Math.round(x * 100) / 100).toString();
}
export const round = (n: number) => Math.round(n);
