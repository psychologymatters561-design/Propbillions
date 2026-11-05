import projectsRaw from '../data/projects.json';
import images from '../data/images.json';
import rates from '../data/rates.json';
import sources from '../data/sources.json';
import locations from '../data/locations.json';
import { allInCost, type StampRule } from './cost';
import { inr } from './money';

export type Check = { k: string; s: 'ok' | 'warn' | 'bad' | 'tbc'; t: string; n: string; src?: string };
export type Project = (typeof projectsRaw)[number] & { checks: Check[] };
export const projects = projectsRaw as Project[];
export const projectUrl = (p: Project) => `/projects/${p.city}/${p.slug}`;
export const stateRates = (s: string) => (rates.states as Record<string, { label: string; stamp: StampRule; summary: string; sources: { title: string; url: string }[]; official: string }>)[s];

export function projectAllIn(p: Project, holder: 'male' | 'female' | 'joint' = 'male') {
  if (!p.allIn) return null;
  const r = stateRates(p.state);
  return allInCost({ basePrice: p.allIn.basePrice, gstPct: p.allIn.gstPct, holder, stamp: r.stamp });
}
export const allInLabel = (p: Project) => { const a = projectAllIn(p); return a ? `${inr(a.total, { compact: true })} all-in` : null; };

type Size = { src: string; width: number; height: number; bytes: number };
export function img(key: string) {
  const e = (images as Record<string, { kind: string; note: string; sizes: Size[] }>)[key];
  if (!e) return null;
  const sizes = [...e.sizes].sort((a, b) => a.width - b.width);
  return { kind: e.kind, note: e.note, sizes, largest: sizes[sizes.length - 1], smallest: sizes[0] };
}
export const STATE_LABEL: Record<string, string> = { ok: 'Clear', warn: 'Ask about this', bad: 'Stop', tbc: 'Not checked yet' };
export const source = (k?: string) => (k ? (sources as Record<string, { claim: string; sources: { title: string; url: string }[]; checked: string }>)[k] : undefined);
export { rates, sources, locations };
export const reraPortal: Record<string, { name: string; url: string }> = {
  UP: { name: 'UP RERA', url: 'https://www.up-rera.in' },
  DL: { name: 'Delhi RERA', url: 'https://rera.delhi.gov.in' },
  UK: { name: 'Uttarakhand RERA', url: 'https://ukrera.uk.gov.in' },
};
