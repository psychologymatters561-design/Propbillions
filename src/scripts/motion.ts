/**
 * One continuous motion system for every page. All effects are scrubbed by scroll (they never pause
 * and restart), start only when the element is well inside the viewport, and are tuned per screen size.
 * With reduced motion nothing animates and every element sits in its final state.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis: Lenis | null = null;
export const getLenis = () => lenis;

export function startSmoothScroll() {
  if (lenis || reduced() || !matchMedia('(pointer: fine)').matches) return;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** Split a heading into words for line-by-line reveals. Keeps the text readable for screen readers. */
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return [...el.querySelectorAll<HTMLElement>('.sw__i')];
  el.setAttribute('aria-label', el.textContent?.replace(/\s+/g, ' ').trim() || '');
  const walk = (node: Node): Node[] => {
    if (node.nodeType === 3) {
      return (node.textContent || '').split(/(\s+)/).filter(Boolean).map((w) => {
        if (/^\s+$/.test(w)) return document.createTextNode(w);
        const o = document.createElement('span'); o.className = 'sw'; o.setAttribute('aria-hidden', 'true');
        const i = document.createElement('span'); i.className = 'sw__i'; i.textContent = w; o.append(i); return o;
      });
    }
    if (node.nodeType === 1) { const e = node as HTMLElement; const kids = [...e.childNodes].flatMap(walk); e.replaceChildren(...kids); return [e]; }
    return [node];
  };
  el.replaceChildren(...[...el.childNodes].flatMap(walk));
  el.dataset.splitDone = '1';
  return [...el.querySelectorAll<HTMLElement>('.sw__i')];
}

const inView = (el: Element) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.92 && r.bottom > 0; };

export function initMotion(): () => void {
  if (reduced()) return () => {};
  const mm = gsap.matchMedia();
  mm.add({ phone: '(max-width: 767px)', wide: '(min-width: 768px)', fine: '(pointer: fine)' }, (ctx) => {
    const { phone, fine } = ctx.conditions as { phone: boolean; wide: boolean; fine: boolean };
    const S = phone ? 'top 94%' : 'top 88%';     // where an element starts moving
    const E = phone ? 'top 62%' : 'top 52%';     // where it has settled

    // Headings rise word by word, scrubbed by scroll.
    gsap.utils.toArray<HTMLElement>('main h1:not(.j__title), main h2, [data-split]').forEach((h) => {
      if (h.closest('[data-nosplit]')) return;
      const words = splitWords(h);
      const from = { yPercent: 110, rotate: 4, opacity: 0 };
      if (inView(h) && h.getBoundingClientRect().top < innerHeight * 0.75) { gsap.from(words, { ...from, duration: 1.1, ease: 'expo.out', stagger: 0.035, delay: 0.15 }); return; }
      gsap.fromTo(words, from, { yPercent: 0, rotate: 0, opacity: 1, ease: 'none', stagger: 0.04, scrollTrigger: { trigger: h, start: S, end: E, scrub: 0.6 } });
    });

    // Paragraphs, labels, cards: drift up and in.
    gsap.utils.toArray<HTMLElement>('[data-reveal], main .lede, main .label').forEach((el) => {
      if (el.closest('.j')) return;
      const from = { y: phone ? 26 : 40, opacity: 0 };
      if (inView(el) && el.getBoundingClientRect().top < innerHeight * 0.75) { gsap.from(el, { ...from, duration: 1, ease: 'expo.out', delay: 0.25 }); return; }
      gsap.fromTo(el, from, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: S, end: E, scrub: 0.6 } });
    });

    // Zoom parallax on images: they open from a window and settle from 1.2x to 1x.
    gsap.utils.toArray<HTMLElement>('[data-zoom], main .im:not(.im--contain):not(.pc__media .im)').forEach((wrap) => {
      if (wrap.closest('.pc, .zp, .j')) return;
      const img = wrap.querySelector('img'); if (!img) return;
      gsap.fromTo(img, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(wrap, { clipPath: 'inset(10% 8% 10% 8% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)', ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: phone ? 'top 55%' : 'top 40%', scrub: 0.6 } });
    });

    // Window-shaped reveals: an arch that opens.
    gsap.utils.toArray<HTMLElement>('[data-window]').forEach((w) => {
      gsap.fromTo(w, { clipPath: 'inset(18% 26% 0% 26% round 999px 999px 8px 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 8px 8px)', ease: 'none', scrollTrigger: { trigger: w, start: S, end: E, scrub: 0.6 } });
    });

    // Depth: parallax layers.
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const amt = Number(el.dataset.parallax || 12);
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Sections flow into each other: the one you leave sinks and dims as the next slides over it.
    const secs = gsap.utils.toArray<HTMLElement>('main > section, main > [data-flow]');
    secs.forEach((sec, i) => {
      const next = secs[i + 1]; const inner = sec.querySelector<HTMLElement>(':scope > .wrap, :scope > .flow-in') || sec;
      if (!next || sec.hasAttribute('data-noflow') || sec.matches('[data-journey], [data-hscroll], [data-zoomwall]')) return;
      gsap.fromTo(inner, { scale: 1, opacity: 1, y: 0 }, { scale: phone ? 0.98 : 0.96, opacity: 0.55, y: phone ? -16 : -40, ease: 'power1.in', scrollTrigger: { trigger: next, start: 'top 70%', end: 'top top', scrub: true } });
    });

    // Real numbers only: counters run with the scroll.
    gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count); const o = { v: 0 };
      gsap.to(o, { v: to, ease: 'none', onUpdate: () => (el.textContent = Math.round(o.v).toString()), scrollTrigger: { trigger: el, start: S, end: E, scrub: 0.5 } });
    });

    // The plan becomes real: lines draw, then the picture fills in.
    gsap.utils.toArray<SVGSVGElement>('[data-draw]').forEach((svg) => {
      const paths = svg.querySelectorAll<SVGGeometryElement>('path, line, polyline, rect');
      paths.forEach((p) => { const l = p.getTotalLength?.() || 400; p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
      const reveal = svg.parentElement?.querySelector<HTMLElement>('[data-draw-reveal]');
      const tl = gsap.timeline({ scrollTrigger: { trigger: svg.parentElement, start: phone ? 'top 85%' : 'top 75%', end: phone ? 'bottom 70%' : 'bottom 45%', scrub: 0.6 } });
      tl.to(paths, { strokeDashoffset: 0, duration: 1, stagger: 0.04, ease: 'none' });
      if (reveal) tl.fromTo(reveal, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'none' }, '-=0.25');
    });

    // Location truth: routes draw, the map zooms from the region to NCR.
    gsap.utils.toArray<SVGSVGElement>('[data-mapzoom]').forEach((svg) => {
      const routes = svg.querySelectorAll<SVGPathElement>('.route');
      routes.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
      const far = svg.querySelectorAll('.far'), near = svg.querySelectorAll('.near');
      const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: phone ? 'top 80%' : 'top 70%', end: phone ? 'bottom 40%' : 'bottom 25%', scrub: 0.8 } });
      tl.to(routes, { strokeDashoffset: 0, stagger: 0.08, duration: 1 })
        .fromTo(svg, { attr: { viewBox: svg.dataset.from! } }, { attr: { viewBox: svg.dataset.to! }, duration: 1.2, ease: 'power1.inOut' }, '>-0.3')
        .to(far, { opacity: 0, duration: 0.4 }, '<0.2').fromTo(near, { opacity: 0 }, { opacity: 1, duration: 0.5 }, '<0.3');
    });

    // Browse projects without leaving the world: pinned horizontal track on every screen.
    gsap.utils.toArray<HTMLElement>('[data-hscroll]').forEach((wrap) => {
      const track = wrap.querySelector<HTMLElement>('[data-hscroll-track]')!;
      const dist = () => Math.max(0, track.scrollWidth - wrap.clientWidth);
      const bar = wrap.querySelector<HTMLElement>('[data-hbar]');
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${dist() * (phone ? 1.1 : 1)}`, pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (st) => bar && (bar.style.transform = `scaleX(${st.progress})`) } });
      track.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => developCard(card, { containerAnimation: tween, start: 'left 96%', end: phone ? 'left 20%' : 'left 45%' }));
    });
    // Cards outside a horizontal track develop on vertical scroll.
    gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card) => { if (!card.closest('[data-hscroll]')) developCard(card, { start: phone ? 'top 92%' : 'top 88%', end: phone ? 'top 45%' : 'top 40%' }); });

    // Zoom wall: the picture in the middle grows to fill the screen while the others fly past.
    gsap.utils.toArray<HTMLElement>('[data-zoomwall]').forEach((wall) => {
      const tiles = wall.querySelectorAll<HTMLElement>('[data-zw]');
      const tl = gsap.timeline({ scrollTrigger: { trigger: wall, start: 'top top', end: phone ? '+=160%' : '+=220%', pin: true, scrub: 0.6 } });
      tiles.forEach((t) => tl.to(t, { scale: Number(t.dataset.zw), ease: 'none' }, 0));
      const cap = wall.querySelector('[data-zw-cap]');
      if (cap) tl.fromTo(cap, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35 }, 0.62);
    });

    // Hero images on inner pages: develop on arrival, then drift and zoom as you scroll on.
    gsap.utils.toArray<HTMLElement>('[data-hero-develop]').forEach((hero) => {
      const bp = hero.querySelector('.pc__bp'), img = hero.querySelector('.pc__img'), lines = hero.querySelectorAll<SVGGeometryElement>('.pc__lines path'), notes = hero.querySelectorAll('.pc__note');
      lines.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
      gsap.timeline({ delay: 0.25 }).to(lines, { strokeDashoffset: 0, duration: 1.1, stagger: 0.03, ease: 'power2.inOut' })
        .to(bp, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.3')
        .fromTo(img, { scale: 1.18 }, { scale: 1.06, duration: 1.4, ease: 'expo.out' }, '<')
        .fromTo(notes, { opacity: 0, x: 24 }, { opacity: 1, x: 0, stagger: 0.1, duration: 0.7, ease: 'expo.out' }, '-=0.6');
      gsap.to(img, { yPercent: 12, scale: 1.14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    });

    // Fine pointers: cards tilt with depth, brass buttons lean toward the cursor.
    if (fine) {
      gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card) => tilt(card));
      gsap.utils.toArray<HTMLElement>('.btn').forEach((b) => magnet(b));
    }
    return () => {};
  });
  requestAnimationFrame(() => ScrollTrigger.refresh());
  return () => mm.revert();
}

/** Blueprint to photo: lines draw, the drawing wipes away, notes pin on. Driven by scroll. */
function developCard(card: HTMLElement, st: ScrollTrigger.Vars) {
  const bp = card.querySelector('.pc__bp'), img = card.querySelector('.pc__img');
  const lines = card.querySelectorAll<SVGGeometryElement>('.pc__lines path');
  const notes = card.querySelectorAll('.pc__note'), dims = card.querySelectorAll<SVGGeometryElement>('.pc__dims path');
  [...lines, ...dims].forEach((p) => { const l = p.getTotalLength?.() || 200; p.style.strokeDasharray = `${l}`; p.style.strokeDashoffset = `${l}`; });
  const tl = gsap.timeline({ scrollTrigger: { trigger: card, scrub: 0.6, ...st } });
  tl.to(lines, { strokeDashoffset: 0, duration: 0.35, stagger: 0.01, ease: 'none' })
    .fromTo(bp, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.4, ease: 'none' })
    .fromTo(img, { scale: 1.2, filter: 'saturate(0.2)' }, { scale: 1, filter: 'saturate(1)', duration: 0.5, ease: 'none' }, '<')
    .to(dims, { strokeDashoffset: 0, duration: 0.2, ease: 'none' }, '-=0.2')
    .fromTo(notes, { opacity: 0, x: 18 }, { opacity: 1, x: 0, stagger: 0.06, duration: 0.25, ease: 'none' }, '-=0.15');
}

function tilt(card: HTMLElement) {
  const media = card.querySelector<HTMLElement>('.pc__media'); if (!media) return;
  const img = card.querySelector<HTMLElement>('.pc__img'), notes = card.querySelector<HTMLElement>('.pc__notes');
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
  const ix = gsap.quickTo(img, 'x', { duration: 0.8, ease: 'power3' }), iy = gsap.quickTo(img, 'y', { duration: 0.8, ease: 'power3' });
  const nx = notes ? gsap.quickTo(notes, 'x', { duration: 0.8, ease: 'power3' }) : null, ny = notes ? gsap.quickTo(notes, 'y', { duration: 0.8, ease: 'power3' }) : null;
  gsap.set(card, { transformPerspective: 1100, transformStyle: 'preserve-3d' });
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    rx(-y * 6); ry(x * 8); ix(-x * 14); iy(-y * 10); nx?.(x * 10); ny?.(y * 8);
    card.style.setProperty('--gx', `${(x + 0.5) * 100}%`); card.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  });
  card.addEventListener('pointerleave', () => { rx(0); ry(0); ix(0); iy(0); nx?.(0); ny?.(0); });
}

function magnet(btn: HTMLElement) {
  const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' }), y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
  btn.addEventListener('pointermove', (e) => { const r = btn.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.18); y((e.clientY - r.top - r.height / 2) * 0.3); });
  btn.addEventListener('pointerleave', () => { x(0); y(0); });
}

/** Chapter rail: the page's sections as a numbered index with a live progress line. */
export function initRail(): () => void {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  const secs = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
  const triggers: ScrollTrigger[] = [];
  if (bar) triggers.push(ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (bar.style.transform = `scaleX(${s.progress})`) }));
  if (!rail) return () => triggers.forEach((t) => t.kill());
  rail.innerHTML = secs.length > 1 ? secs.map((s, i) => `<li><a href="#${s.id}" data-i="${i}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><span class="rail__t">${s.dataset.chapter}</span></a></li>`).join('') : '';
  rail.hidden = secs.length < 2;
  const links = [...rail.querySelectorAll<HTMLAnchorElement>('a')];
  secs.forEach((s, i) => triggers.push(ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => st.isActive && links.forEach((l, k) => l.classList.toggle('is-on', k === i)) })));
  links.forEach((l) => l.addEventListener('click', (e) => { const t = document.getElementById(l.hash.slice(1)); if (!t) return; e.preventDefault(); lenis ? lenis.scrollTo(t, { offset: 0, duration: 1.4 }) : t.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); }));
  return () => triggers.forEach((t) => t.kill());
}

export { ScrollTrigger, gsap };
