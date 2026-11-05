/**
 * All-in cost of a home: what the brochure price leaves out.
 * Every rate comes from data/rates.json, which records the source and the date checked.
 */
export interface StampRule {
  /** Percent of the agreement value, by who holds the title. */
  malePct: number; femalePct: number; jointPct: number;
  /** Women's and joint concessions apply only up to this value (rupees). Above it, the male rate applies. */
  concessionUpTo?: number | null;
  /** Registration fee: percent with optional cap, or slabs of fixed amounts. */
  registration: { pct?: number; cap?: number; fixed?: number; slabs?: { upTo: number | null; fee: number }[] };
  /** Extra flat fees (pasting fee, scanning, etc.). */
  extraFixed?: number;
}

export interface CostInput {
  superArea?: number;            // sq ft, what most brochures price on
  carpetArea?: number;           // sq ft, RERA-defined usable area
  basePrice: number;             // brochure base price in rupees (all units)
  plc?: number;                  // preferential location charges
  floorRise?: number;            // floor rise total
  parking?: number;
  clubAndOther?: number;         // club membership, power backup, etc.
  edcIdc?: number;               // external and internal development charges, if charged separately
  gstPct: number;                // 5 for under construction homes, 0 when bought after the completion certificate
  gstOnAll?: boolean;            // GST on PLC, parking, club and EDC/IDC too (usual case)
  maintenanceDeposit?: number;   // IFMS or advance maintenance
  maintenanceGstPct?: number;    // GST on maintenance deposit when charged (often 18)
  holder: 'male' | 'female' | 'joint';
  stamp: StampRule;
  /** Optional: a circle-rate floor for the stamp base. Stamp duty is charged on the higher value. */
  circleValue?: number;
  legalAndLoanFees?: number;     // lawyer, loan processing, etc.
}

export interface CostLine { key: string; label: string; amount: number; note?: string }

export function allInCost(i: CostInput) {
  const agreement = i.basePrice + (i.plc || 0) + (i.floorRise || 0) + (i.parking || 0) + (i.clubAndOther || 0) + (i.edcIdc || 0);
  const gstBase = i.gstOnAll === false ? i.basePrice : agreement;
  const gst = (gstBase * i.gstPct) / 100;
  const stampBase = Math.max(agreement, i.circleValue || 0);
  const concession = i.stamp.concessionUpTo == null || stampBase <= i.stamp.concessionUpTo;
  const pct = !concession ? i.stamp.malePct : i.holder === 'female' ? i.stamp.femalePct : i.holder === 'joint' ? i.stamp.jointPct : i.stamp.malePct;
  const stampDuty = (stampBase * pct) / 100;
  const registration = registrationFee(stampBase, i.stamp.registration) + (i.stamp.extraFixed || 0);
  const maint = (i.maintenanceDeposit || 0) * (1 + (i.maintenanceGstPct || 0) / 100);
  const lines: CostLine[] = [
    { key: 'base', label: 'Base price (brochure)', amount: i.basePrice },
    { key: 'plc', label: 'Preferential location charges', amount: i.plc || 0 },
    { key: 'floorRise', label: 'Floor rise', amount: i.floorRise || 0 },
    { key: 'parking', label: 'Parking', amount: i.parking || 0 },
    { key: 'clubAndOther', label: 'Club, power backup and other charges', amount: i.clubAndOther || 0 },
    { key: 'edcIdc', label: 'EDC and IDC (if charged separately)', amount: i.edcIdc || 0 },
    { key: 'gst', label: `GST at ${i.gstPct}%`, amount: gst, note: i.gstPct === 0 ? 'No GST on a home bought after its completion certificate' : undefined },
    { key: 'stamp', label: `Stamp duty at ${pct}%`, amount: stampDuty, note: stampBase > agreement ? 'Charged on the circle value, which is higher than your agreement value' : undefined },
    { key: 'registration', label: 'Registration and fixed fees', amount: registration },
    { key: 'maintenance', label: 'Maintenance deposit', amount: maint },
    { key: 'legal', label: 'Legal and loan fees', amount: i.legalAndLoanFees || 0 },
  ].filter((l) => l.amount > 0 || l.key === 'base');
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const hidden = total - i.basePrice;
  return {
    lines, total, agreement, hidden,
    hiddenPct: i.basePrice > 0 ? (hidden / i.basePrice) * 100 : 0,
    perSqftSuper: i.superArea ? total / i.superArea : null,
    perSqftCarpet: i.carpetArea ? total / i.carpetArea : null,
    loading: i.superArea && i.carpetArea ? ((i.superArea - i.carpetArea) / i.carpetArea) * 100 : null,
  };
}

export function registrationFee(value: number, r: StampRule['registration']): number {
  if (r.slabs?.length) {
    const s = [...r.slabs].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    for (const x of s) if (x.upTo === null || value <= x.upTo) return x.fee;
    return s[s.length - 1].fee;
  }
  if (r.fixed) return r.fixed;
  const f = ((r.pct || 0) * value) / 100;
  return r.cap ? Math.min(f, r.cap) : f;
}
