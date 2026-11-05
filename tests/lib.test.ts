import { describe, it, expect } from 'vitest';
import { emi, principalForEmi, balanceAfter, eligibility, schedule, ltvFor } from '../src/lib/emi';
import { allInCost, registrationFee } from '../src/lib/cost';
import { buyMinusRent, breakEvenGrowth } from '../src/lib/rentVsBuy';
import { normalisePhone, validateLead, whatsappLink, leadSummary } from '../src/lib/lead';
import { inr } from '../src/lib/money';

describe('emi', () => {
  it('matches the standard formula (₹50 L, 8.5%, 20 years ≈ ₹43,391)', () => {
    expect(Math.round(emi(5_000_000, 8.5, 240))).toBe(43391);
  });
  it('handles zero interest and zero loan', () => {
    expect(emi(120_000, 0, 12)).toBe(10_000);
    expect(emi(0, 9, 12)).toBe(0);
  });
  it('principalForEmi inverts emi', () => {
    const m = emi(7_500_000, 9.1, 300);
    expect(principalForEmi(m, 9.1, 300)).toBeCloseTo(7_500_000, 0);
  });
  it('balance goes to zero at the end and matches the schedule', () => {
    expect(balanceAfter(5_000_000, 8.5, 240, 240)).toBe(0);
    const s = schedule(5_000_000, 8.5, 240);
    expect(s.yearly.length).toBe(20);
    expect(s.yearly[4].balance).toBeCloseTo(balanceAfter(5_000_000, 8.5, 240, 60), 0);
    expect(s.totalInterest).toBeCloseTo(s.totalPaid - 5_000_000, 0);
  });
});

describe('eligibility', () => {
  const bands = [{ upTo: 3_000_000, maxLtvPct: 90 }, { upTo: 7_500_000, maxLtvPct: 80 }, { upTo: null, maxLtvPct: 75 }];
  it('picks the right LTV band', () => {
    expect(ltvFor(2_500_000, bands)).toBe(90);
    expect(ltvFor(5_000_000, bands)).toBe(80);
    expect(ltvFor(20_000_000, bands)).toBe(75);
  });
  it('limits by income or by value, whichever is lower', () => {
    const r = eligibility({ netMonthlyIncome: 200_000, existingEmis: 20_000, annualRatePct: 8.5, years: 20, foirPct: 50 });
    expect(r.maxEmi).toBe(80_000);
    expect(r.limitedBy).toBe('income');
    const v = eligibility({ netMonthlyIncome: 1_000_000, existingEmis: 0, annualRatePct: 8.5, years: 20, foirPct: 50, propertyValue: 10_000_000, ltvBands: bands });
    expect(v.maxLoan).toBe(7_500_000);
    expect(v.limitedBy).toBe('property value');
  });
  it('never returns a negative EMI', () => {
    expect(eligibility({ netMonthlyIncome: 50_000, existingEmis: 40_000, annualRatePct: 9, years: 20, foirPct: 50 }).maxEmi).toBe(0);
  });
});

describe('all-in cost', () => {
  const stamp = { malePct: 7, femalePct: 5, jointPct: 6, registration: { slabs: [{ upTo: 50_000, fee: 100 }, { upTo: null, fee: 50_000 }] } };
  it('adds GST, stamp duty and registration on top of the brochure price', () => {
    const r = allInCost({ basePrice: 10_000_000, parking: 500_000, gstPct: 5, holder: 'male', stamp });
    // agreement 1.05 Cr, GST 5% = 5.25 L, stamp 7% = 7.35 L, registration 50k
    expect(r.agreement).toBe(10_500_000);
    expect(r.total).toBe(10_500_000 + 525_000 + 735_000 + 50_000);
    expect(r.hidden).toBe(r.total - 10_000_000);
  });
  it('uses the circle value when it is higher', () => {
    const r = allInCost({ basePrice: 5_000_000, gstPct: 0, holder: 'female', stamp, circleValue: 6_000_000 });
    expect(r.lines.find((l) => l.key === 'stamp')!.amount).toBe(300_000);
  });
  it('GST only on base when gstOnAll is false; no GST after completion', () => {
    expect(allInCost({ basePrice: 1_000_000, plc: 100_000, gstPct: 5, gstOnAll: false, holder: 'joint', stamp }).lines.find((l) => l.key === 'gst')!.amount).toBe(50_000);
    expect(allInCost({ basePrice: 1_000_000, gstPct: 0, holder: 'joint', stamp }).lines.find((l) => l.key === 'gst')).toBeUndefined();
  });
  it('drops the women\'s concession above the cap (UP: up to ₹1 Cr)', () => {
    const up = { malePct: 7, femalePct: 6, jointPct: 6.5, concessionUpTo: 10_000_000, registration: { pct: 1 } };
    expect(allInCost({ basePrice: 9_000_000, gstPct: 0, holder: 'female', stamp: up }).lines.find((l) => l.key === 'stamp')!.amount).toBe(540_000);
    expect(allInCost({ basePrice: 20_000_000, gstPct: 0, holder: 'female', stamp: up }).lines.find((l) => l.key === 'stamp')!.amount).toBe(1_400_000);
  });
  it('reports loading between super and carpet area', () => {
    const r = allInCost({ basePrice: 1, superArea: 1300, carpetArea: 1000, gstPct: 0, holder: 'male', stamp });
    expect(r.loading).toBeCloseTo(30);
  });
  it('registration supports percent with cap', () => {
    expect(registrationFee(10_000_000, { pct: 1 })).toBe(100_000);
    expect(registrationFee(10_000_000, { pct: 1, cap: 30_000 })).toBe(30_000);
  });
});

describe('rent vs buy', () => {
  const base = { price: 10_000_000, downPct: 20, oneTimeCosts: 800_000, loanRatePct: 8.5, loanYears: 20, monthlyMaintenance: 5_000, rent: 30_000, rentGrowthPct: 5, investReturnPct: 7, years: 10 };
  it('buying gets better as price growth rises', () => {
    expect(buyMinusRent(base, 8)).toBeGreaterThan(buyMinusRent(base, 2));
  });
  it('break-even growth is where the difference is zero', () => {
    const g = breakEvenGrowth(base)!;
    expect(g).not.toBeNull();
    expect(Math.abs(buyMinusRent(base, g))).toBeLessThan(5_000);
  });
});

describe('lead validation', () => {
  it('normalises Indian numbers', () => {
    expect(normalisePhone('98100 12345')).toBe('+919810012345');
    expect(normalisePhone('09810012345')).toBe('+919810012345');
    expect(normalisePhone('+91 98100-12345')).toBe('+919810012345');
    expect(normalisePhone('919810012345')).toBe('+919810012345');
    expect(normalisePhone('12345')).toBeNull();
    expect(normalisePhone('5810012345')).toBeNull();
    expect(normalisePhone('+1 415 555 0100')).toBe('+14155550100');
  });
  const good = { name: 'Asha Verma', phone: '9810012345', consent: true, intent: 'site-visit', startedAt: 0 };
  it('accepts a real lead', () => {
    const v = validateLead(good);
    expect(v.ok).toBe(true);
  });
  it('shows field errors even when submitted very fast', () => {
    const now = 1_000_000;
    const v = validateLead({ name: '', phone: '', startedAt: now - 300 }, now);
    expect(v.ok).toBe(false);
    if (!v.ok) { expect(v.spam).toBeFalsy(); expect(v.errors.phone).toBeTruthy(); }
  });
  it('requires consent', () => {
    const v = validateLead({ ...good, consent: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors.consent).toBeTruthy();
  });
  it('flags the honeypot and bot-speed submits as spam', () => {
    const a = validateLead({ ...good, website: 'http://spam' });
    expect(!a.ok && a.spam).toBe(true);
    const now = 1_000_000;
    const b = validateLead({ ...good, startedAt: now - 500 }, now);
    expect(!b.ok && b.spam).toBe(true);
  });
  it('rejects links in names and too many links in notes', () => {
    expect(validateLead({ ...good, name: 'www.cheap.biz' }).ok).toBe(false);
    expect(validateLead({ ...good, message: 'http://a http://b' }).ok).toBe(false);
  });
  it('builds a WhatsApp link and a readable summary', () => {
    const v = validateLead({ ...good, project: 'Test Project', slot: 'Sat 11:00' });
    if (!v.ok) throw new Error('should be ok');
    expect(whatsappLink('+91 98100 00000', v.lead)).toMatch(/^https:\/\/wa\.me\/919810000000\?text=/);
    expect(leadSummary(v.lead)).toContain('Site visit');
  });
});

describe('money', () => {
  it('formats lakh and crore', () => {
    expect(inr(12_500_000, { compact: true })).toBe('₹1.25 Cr');
    expect(inr(4_500_000, { compact: true })).toBe('₹45 L');
    expect(inr(123456)).toBe('₹1,23,456');
  });
});
