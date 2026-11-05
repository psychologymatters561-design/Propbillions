/** Prefix internal paths with the deploy base (e.g. /Propbillions on GitHub Pages, / on propbillions.com). */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
export const u = (p = '/') => (/^(https?:|mailto:|tel:|#)/.test(p) ? p : BASE + (p.startsWith('/') ? p : '/' + p));
export const asset = (p: string) => u(p);
