/**
 * Rent vs buy over a chosen number of years.
 * We never assume prices will rise. Instead we solve for the yearly price growth at which buying
 * and renting cost the same, and let the buyer judge whether that is realistic.
 */
import { emi, balanceAfter } from './emi';

export interface RvbInput {
  price: number;               // all-in price of the home
  downPct: number;             // down payment as percent of price
  oneTimeCosts: number;        // stamp duty, registration, fees not covered by the loan
  loanRatePct: number;
  loanYears: number;
  monthlyMaintenance: number;
  rent: number;                // current monthly rent for a similar home
  rentGrowthPct: number;       // yearly rent increase, buyer's assumption
  investReturnPct: number;     // what the down payment could earn elsewhere, buyer's assumption
  years: number;               // how long they plan to stay
  maintGrowthPct?: number;
  sellingCostPct?: number;     // brokerage and fees when selling
}

/** Net worth position after `years` for buying at a given yearly price growth, minus renting. */
export function buyMinusRent(i: RvbInput, priceGrowthPct: number): number {
  const months = i.years * 12;
  const loan = i.price * (1 - i.downPct / 100);
  const n = i.loanYears * 12;
  const m = emi(loan, i.loanRatePct, n);
  const rMonthInvest = Math.pow(1 + i.investReturnPct / 100, 1 / 12) - 1;
  // Each month, the cheaper option's saving is invested. Track both portfolios.
  let buyerPot = 0;
  let renterPot = i.price * (i.downPct / 100) + i.oneTimeCosts; // renter invests what the buyer paid upfront
  for (let k = 0; k < months; k++) {
    const yr = Math.floor(k / 12);
    const rent = i.rent * Math.pow(1 + i.rentGrowthPct / 100, yr);
    const maint = i.monthlyMaintenance * Math.pow(1 + (i.maintGrowthPct ?? 5) / 100, yr);
    const buyOut = (k < n ? m : 0) + maint;
    const diff = buyOut - rent;
    buyerPot *= 1 + rMonthInvest; renterPot *= 1 + rMonthInvest;
    if (diff > 0) renterPot += diff; else buyerPot += -diff;
  }
  const value = i.price * Math.pow(1 + priceGrowthPct / 100, i.years);
  const equity = value * (1 - (i.sellingCostPct ?? 1) / 100) - balanceAfter(loan, i.loanRatePct, n, Math.min(months, n));
  return equity + buyerPot - renterPot;
}

/** Yearly price growth at which buying and renting end level. Returns null if outside -10..30%. */
export function breakEvenGrowth(i: RvbInput): number | null {
  let lo = -10, hi = 30;
  const f = (g: number) => buyMinusRent(i, g);
  if (f(lo) > 0) return lo; if (f(hi) < 0) return null;
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

export function rentVsBuy(i: RvbInput) {
  const loan = i.price * (1 - i.downPct / 100);
  return {
    emi: emi(loan, i.loanRatePct, i.loanYears * 12),
    upfront: i.price * (i.downPct / 100) + i.oneTimeCosts,
    breakEvenGrowthPct: breakEvenGrowth(i),
    atZeroGrowth: buyMinusRent(i, 0),
  };
}
