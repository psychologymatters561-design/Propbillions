/**
 * Ghar ka Raasta: the scroll-driven journey.
 * film   : desktop and tablet. Video preloaded as a Blob behind an honest progress ring, then scrubbed.
 * stills : phones. Six tall stills cross-fade and push in. A tenth of the weight.
 * static : reduced motion, Save-Data or slow networks. The settle frame and the buttons, nothing else.
 */
type Mode = 'film' | 'stills' | 'static';

export function chooseMode(): Mode {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  if (nav.connection?.saveData || /(^|-)2g|3g/.test(nav.connection?.effectiveType || '')) return 'static';
  const w = innerWidth, coarse = matchMedia('(pointer: coarse)').matches;
  if (w < 768 || (coarse && w < 900 && innerHeight > innerWidth)) return 'stills';
  return 'film';
}

export function initJourney() {
  const root = document.querySelector<HTMLElement>('section[data-journey]');
  if (!root) return;
  const mode = chooseMode();
  root.dataset.mode = mode;
  document.documentElement.dataset.jmode = mode;
  const stage = root.querySelector<HTMLElement>('.j__stage')!;
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const settle = root.querySelector<HTMLElement>('[data-settle]')!;
  if (mode === 'static') { root.classList.add('is-static'); return; }

  let progress = 0, ticking = false;
  const measure = () => {
    const r = root.getBoundingClientRect();
    const total = root.offsetHeight - innerHeight;
    progress = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
  };
  const caption = (p: number) => {
    for (const c of caps) {
      const [a, b] = c.dataset.cap!.split('-').map(Number);
      const on = p >= a / 100 && p < b / 100;
      if (c.classList.contains('is-on') !== on) c.classList.toggle('is-on', on);
    }
    const s = p > 0.93;
    if (settle.classList.contains('is-on') !== s) settle.classList.toggle('is-on', s);
    document.body.toggleAttribute('data-film-active', p > 0 && p < 0.98);
  };

  const runStills = () => {
    const stills = [...root.querySelectorAll<HTMLElement>('[data-still]')];
    stills.forEach((s) => s.querySelector('img')?.setAttribute('loading', 'eager'));
    const render = () => {
      ticking = false; measure();
      const n = stills.length, f = progress * (n - 0.001), i = Math.floor(f), t = f - i;
      const active = t > 0.85 ? Math.min(n - 1, i + 1) : i;      // captions follow the still you are looking at
      for (const c of caps) { const on = c.dataset.stillCap !== '' && Number(c.dataset.stillCap) === active; if (c.classList.contains('is-on') !== on) c.classList.toggle('is-on', on); }
      const s = active === n - 1; if (settle.classList.contains('is-on') !== s) settle.classList.toggle('is-on', s);
      document.body.toggleAttribute('data-film-active', progress > 0 && progress < 0.98);
      stills.forEach((s, k) => {
        const op = k === i ? 1 - Math.max(0, (t - 0.7) / 0.3) : k === i + 1 ? Math.max(0, (t - 0.7) / 0.3) : 0;
        const scale = 1 + 0.08 * (k === i ? t : 0);
        s.style.opacity = op.toFixed(3);
        s.style.transform = `scale(${scale.toFixed(4)})`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } }, { passive: true });
    addEventListener('resize', render); render();
  };
  if (mode === 'stills') { runStills(); return; }

  // Film mode
  const video = root.querySelector<HTMLVideoElement>('video')!;
  const ring = root.querySelector<HTMLElement>('[data-ring]')!;
  const ringArc = ring.querySelector<SVGCircleElement>('.ring__arc')!;
  const ringPct = ring.querySelector<HTMLElement>('[data-ring-pct]')!;
  const C = 2 * Math.PI * 26;
  ring.hidden = false;
  const src = innerWidth >= 1200 && !matchMedia('(pointer: coarse)').matches ? video.dataset.srcDesktop! : video.dataset.srcTablet!;
  let duration = 0, shown = 0, target = 0, seeking = false, ready = false, failed = false;
  video.addEventListener('seeking', () => (seeking = true));
  video.addEventListener('seeked', () => (seeking = false));

  const setRing = (f: number | null) => {
    if (f === null) { ring.classList.add('is-indet'); ringPct.textContent = 'Loading'; return; }
    ringArc.style.strokeDashoffset = String(C * (1 - f));
    ringPct.textContent = `${Math.round(f * 100)}%`;
  };
  setRing(0);
  (async () => {
    try {
      const res = await fetch(src);
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const len = Number(res.headers.get('content-length')) || 0;
      const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let got = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; setRing(len ? got / len : null); }
      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      video.preload = 'auto';
      const loaded = new Promise<void>((ok, bad) => { video.addEventListener('loadeddata', () => ok(), { once: true }); video.addEventListener('error', () => bad(new Error('decode')), { once: true }); });
      video.src = URL.createObjectURL(blob);
      video.load();
      await loaded;
      duration = video.duration; ready = true; root.classList.add('is-ready'); ring.hidden = true;
      video.currentTime = Math.max(0.001, progress * duration);
    } catch {
      // Nothing breaks: the stills take over and the page stays complete.
      ring.hidden = true; root.dataset.mode = 'stills'; root.classList.add('is-fallback'); ready = false; failed = true; runStills();
    }
  })();

  let running = false;
  const loop = () => {
    measure(); caption(progress);
    let busy = false;
    if (ready) {
      target = progress * (duration - 0.05);
      shown += (target - shown) * 0.14;               // lerp: smooth even with jumpy wheels
      if (Math.abs(target - shown) < 0.002) shown = target; else busy = true;
      if (!seeking && Math.abs(video.currentTime - shown) > 1 / 48) { video.currentTime = shown; busy = true; }
    }
    // Rest when nothing moves; wake on scroll.
    if (!failed && (busy || !ready)) requestAnimationFrame(loop); else running = false;
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);
  wake();
  void stage;
}
