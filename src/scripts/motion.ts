// Motion helpers. Loaded only on pages that need motion. Every effect has a job; with reduced motion none run.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export let lenis: Lenis | null = null;

export function initMotion() {
  if (reduced()) return;
  gsap.registerPlugin(ScrollTrigger);
  // Smooth scroll on precise pointers only: it makes the film scrub feel continuous. Touch keeps native scroll.
  if (matchMedia('(pointer: fine)').matches) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Depth: parallax layers
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amt = Number(el.dataset.parallax || 15);
    gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // The plan becomes real: SVG lines draw, then the image fills in
  document.querySelectorAll<SVGSVGElement>('[data-draw]').forEach((svg) => {
    const paths = svg.querySelectorAll<SVGGeometryElement>('path, line, polyline, rect');
    paths.forEach((p) => { const l = p.getTotalLength?.() || 400; p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
    const reveal = svg.parentElement?.querySelector<HTMLElement>('[data-draw-reveal]');
    const tl = gsap.timeline({ scrollTrigger: { trigger: svg.parentElement, start: 'top 75%', end: 'bottom 40%', scrub: 0.6 } });
    tl.to(paths, { strokeDashoffset: 0, duration: 1, stagger: 0.04, ease: 'none' });
    if (reveal) tl.fromTo(reveal, { opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 0.8 }, '-=0.2');
  });
  // Real numbers only: count up once
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count); const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')) }) });
  });
  // Browse projects without leaving the world: pinned horizontal gallery (wide screens only)
  ScrollTrigger.matchMedia({
    '(min-width: 900px)': () => {
      document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((wrap) => {
        const track = wrap.querySelector<HTMLElement>('[data-hscroll-track]')!;
        const dist = () => track.scrollWidth - wrap.clientWidth + 48;
        gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
      });
    },
  });
  // Location truth: map zooms from the region to the NCR cluster, routes draw
  document.querySelectorAll<SVGSVGElement>('[data-mapzoom]').forEach((svg) => {
    const [a, b] = [svg.dataset.from!, svg.dataset.to!];
    const routes = svg.querySelectorAll<SVGPathElement>('.route');
    routes.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
    const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 70%', end: 'bottom 30%', scrub: 0.8 } });
    tl.to(routes, { strokeDashoffset: 0, stagger: 0.08, duration: 1 }).fromTo(svg, { attr: { viewBox: a } }, { attr: { viewBox: b }, duration: 1.2, ease: 'power1.inOut' }, '>-0.3');
  });
}
