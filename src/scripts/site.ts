// Page lifecycle for the whole site. Works with Astro's ClientRouter: every page change tears down
// the old page's motion and builds the new one, so animations flow from page to page without stalls.
import { initMotion, initRail, startSmoothScroll, getLenis, ScrollTrigger } from './motion';

let cleanups: (() => void)[] = [];
async function boot() {
  document.documentElement.classList.add('js');
  startSmoothScroll();
  getLenis()?.scrollTo(0, { immediate: true, force: true });
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => (getLenis() ? getLenis()!.scrollTo(t, { immediate: true }) : t.scrollIntoView()), 50); }
  if (document.querySelector('section[data-journey]')) { const { initJourney } = await import('./journey'); cleanups.push(initJourney()); }
  cleanups.push(initMotion(), initRail());
  // Images that load late change heights; keep every trigger in the right place.
  document.querySelectorAll('main img').forEach((img) => { if (!(img as HTMLImageElement).complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }); });
}
function teardown() { cleanups.forEach((c) => { try { c(); } catch {} }); cleanups = []; ScrollTrigger.getAll().forEach((t) => t.kill()); }
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', teardown);
document.addEventListener('astro:after-swap', () => document.documentElement.classList.add('js'));
