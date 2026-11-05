/**
 * Ghar ka Raasta: scroll-driven film painted on a canvas from an image sequence.
 * Works the same in every browser (no video seeking), starts moving within the first few frames,
 * and sharpens as more frames arrive (coarse to fine: every 16th frame first, then 8th, 4th, 2nd, all).
 *   d: desktop 1120x630, 280 frames   t: tablet 880x495, 280 frames   m: phone 432x768 portrait, 175 frames
 *   static: reduced motion, Save-Data or 2G/3G. The settle frame and the buttons.
 */
type Set = 'd' | 't' | 'm';
type Mode = Set | 'static';
const N: Record<Set, number> = { d: 280, t: 280, m: 175 };

export function chooseMode(): Mode {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  if (c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType || '')) return 'static';
  const w = innerWidth, h = innerHeight, coarse = matchMedia('(pointer: coarse)').matches;
  if (w < 768 || (coarse && h > w && w < 900)) return 'm';
  if (w < 1200 || coarse) return 't';
  return 'd';
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function initJourney(): () => void {
  const root = document.querySelector<HTMLElement>('section[data-journey]');
  if (!root) return () => {};
  const mode = chooseMode();
  document.documentElement.dataset.jmode = mode;
  root.dataset.mode = mode;
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const settle = root.querySelector<HTMLElement>('[data-settle]')!;
  const scrollHint = root.querySelector<HTMLElement>('.j__scroll');
  if (mode === 'static') { settle.style.opacity = '1'; settle.style.pointerEvents = 'auto'; return () => {}; }

  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const ring = root.querySelector<HTMLElement>('[data-ring]')!;
  const ringArc = ring.querySelector<SVGCircleElement>('.ring__arc')!;
  const ringPct = ring.querySelector<HTMLElement>('[data-ring-pct]')!;
  const base = root.dataset.seqBase!;
  const n = N[mode];
  const frames: (HTMLImageElement | undefined)[] = new Array(n);
  let alive = true, progress = 0, shown = 0, needDraw = true, running = false, loaded = 0;

  // Load plan: coarse to fine. Phones on slow or metered links stop at every 4th frame.
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const finest = mode === 'm' && conn && conn.effectiveType && conn.effectiveType !== '4g' ? 4 : 1;
  const order: number[] = []; const seen = new Set<number>();
  for (const s of [16, 8, 4, 2, 1]) { if (s < finest) break; for (let i = 0; i < n; i += s) if (!seen.has(i)) { seen.add(i); order.push(i); } }
  if (!seen.has(n - 1)) order.splice(1, 0, n - 1);
  const total = order.length;
  const C = 2 * Math.PI * 26;
  const setRing = () => { const f = loaded / total; ringArc.style.strokeDashoffset = String(C * (1 - f)); ringPct.textContent = `${Math.round(f * 100)}%`; ring.hidden = f >= 1; };
  ring.hidden = false; setRing();

  const src = (i: number) => `${base}${mode}/${String(i + 1).padStart(4, '0')}.webp`;
  let q = 0;
  const worker = async () => {
    while (alive && q < order.length) {
      const i = order[q++];
      const img = new Image(); img.decoding = 'async'; img.src = src(i);
      try { await img.decode(); } catch { continue; }
      if (!alive) return;
      frames[i] = img; loaded++; setRing(); needDraw = true; wake();
      if (loaded === 1) root.classList.add('is-ready');
    }
  };
  for (let k = 0; k < (mode === 'm' ? 4 : 6); k++) worker();

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, mode === 'm' ? 2 : 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; needDraw = true; }
  };
  const cover = (img: HTMLImageElement) => {
    const cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let w = cw, h = ch; if (ir > cr) w = ch * ir; else h = cw / ir;
    return [(cw - w) / 2, (ch - h) / 2, w, h] as const;
  };
  const nearest = (f: number, dir: 1 | -1) => { for (let i = Math.round(f); i >= 0 && i < n; i += dir) if (frames[i]) return i; return -1; };
  const draw = () => {
    let a = nearest(Math.floor(shown), -1), b = nearest(Math.ceil(shown), 1);
    if (a < 0) a = b; if (b < 0) b = a; if (a < 0) return;
    const A = frames[a]!, B = frames[b]!;
    ctx.globalAlpha = 1; ctx.drawImage(A, ...cover(A));
    if (b !== a) { const t = (shown - a) / (b - a); if (t > 0.01) { ctx.globalAlpha = t; ctx.drawImage(B, ...cover(B)); ctx.globalAlpha = 1; } }
  };
  const measure = () => {
    const r = root.getBoundingClientRect();
    progress = Math.min(1, Math.max(0, -r.top / Math.max(1, root.offsetHeight - innerHeight)));
  };
  // Words and buttons move with the scroll itself, so nothing ever snaps or pauses.
  const words = () => {
    for (const c of caps) {
      const [a, b] = c.dataset.cap!.split('-').map((x) => Number(x) / 100);
      const vin = smooth(a, a + 0.035, progress), vout = 1 - smooth(b - 0.035, b, progress);
      const o = Math.min(vin, vout);
      c.style.opacity = o.toFixed(3);
      c.style.transform = `translate3d(0, ${((1 - vin) * 40 - (1 - vout) * 40).toFixed(1)}px, 0)`;
      c.style.filter = o < 0.99 ? `blur(${((1 - o) * 6).toFixed(1)}px)` : '';
    }
    const s = smooth(0.9, 0.95, progress);
    settle.style.opacity = s.toFixed(3);
    settle.style.transform = `translate3d(0, ${((1 - s) * 30).toFixed(1)}px, 0)`;
    settle.style.pointerEvents = s > 0.6 ? 'auto' : 'none';
    if (scrollHint) scrollHint.style.opacity = String(1 - smooth(0, 0.03, progress));
    canvas.style.transform = `scale(${(1 + smooth(0.92, 1, progress) * 0.04).toFixed(4)})`;
  };
  const loop = () => {
    if (!alive) return;
    measure(); words();
    const target = progress * (n - 1);
    const prev = shown;
    shown += (target - shown) * 0.18;
    if (Math.abs(target - shown) < 0.01) shown = target;
    if (needDraw || shown !== prev) { size(); draw(); needDraw = false; }
    if (Math.abs(target - shown) > 0.001 || needDraw) requestAnimationFrame(loop); else running = false;
  };
  function wake() { if (!running && alive) { running = true; requestAnimationFrame(loop); } }
  const onResize = () => { needDraw = true; wake(); };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', onResize);
  measure(); shown = progress * (n - 1); wake();
  return () => { alive = false; removeEventListener('scroll', wake); removeEventListener('resize', onResize); };
}
