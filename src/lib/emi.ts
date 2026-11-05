/** EMI and loan eligibility. Pure functions shared by the browser tools and tests. */

/** Monthly instalment for a loan. rate is the annual rate in percent. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Loan amount a given EMI can carry. Inverse of emi(). */
export function principalForEmi(monthly: number, annualRatePct: number, months: number): number {
  if (monthly <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return monthly * months;
  const f = Math.pow(1 + r, months);
  return (monthly * (f - 1)) / (r * f);
}

export interface Schedule { totalPaid: number; totalInterest: number; yearly: { year: number; principal: number; interest: number; balance: number }[] }

export function schedule(principal: number, annualRatePct: number, months: number): Schedule {
  const m = emi(principal, annualRatePct, months);
  const r = annualRatePct / 12 / 100;
  let bal = principal, totalInterest = 0;
  const yearly: Schedule['yearly'] = [];
  let yp = 0, yi = 0;
  for (let i = 1; i <= months; i++) {
    const int = bal * r;
    const pr = Math.min(m - int, bal);
    bal = Math.max(0, bal - pr);
    yp += pr; yi += int; totalInterest += int;
    if (i % 12 === 0 || i === months) { yearly.push({ year: Math.ceil(i / 12), principal: yp, interest: yi, balance: bal }); yp = 0; yi = 0; }
  }
  return { totalPaid: m * months, totalInterest, yearly };
}

/** Outstanding balance after k payments. */
export function balanceAfter(principal: number, annualRatePct: number, months: number, k: number): number {
  const r = annualRatePct / 12 / 100;
  if (k >= months) return 0;
  if (r === 0) return principal * (1 - k / months);
  const f = Math.pow(1 + r, months), fk = Math.pow(1 + r, k);
  return (principal * (f - fk)) / (f - 1);
}

export interface LtvBand { upTo: number | null; maxLtvPct: number }

/**
 * Loan eligibility estimate.
 * foirPct: share of take-home pay a lender lets go to all EMIs. Lenders set this; we only estimate.
 * ltvBands: regulator caps on loan-to-value, read from data/rates.json.
 */
export function eligibility(input: {
  netMonthlyIncome: number; existingEmis: number; annualRatePct: number; years: number; foirPct: number;
  propertyValue?: number; ltvBands?: LtvBand[];
}) {
  const months = Math.round(input.years * 12);
  const maxEmi = Math.max(0, input.netMonthlyIncome * (input.foirPct / 100) - input.existingEmis);
  const byIncome = principalForEmi(maxEmi, input.annualRatePct, months);
  let byValue = Infinity, ltvPct: number | null = null;
  if (input.propertyValue && input.ltvBands?.length) {
    ltvPct = ltvFor(input.propertyValue, input.ltvBands);
    byValue = (input.propertyValue * ltvPct) / 100;
  }
  const maxLoan = Math.min(byIncome, byValue);
  return { maxEmi, byIncome, byValue: Number.isFinite(byValue) ? byValue : null, ltvPct, maxLoan, limitedBy: byValue < byIncome ? 'property value' : 'income' };
}

export function ltvFor(loanBase: number, bands: LtvBand[]): number {
  const sorted = [...bands].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  for (const b of sorted) if (b.upTo === null || loanBase <= b.upTo) return b.maxLtvPct;
  return sorted[sorted.length - 1].maxLtvPct;
}
