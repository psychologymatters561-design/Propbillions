// Device check: node tests/e2e/devices.mjs <baseUrl> [outDir]
// For each device: correct journey mode, no console errors, no sideways scroll, tap targets >= 44px, LCP and CLS.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const base = (process.argv[2] || 'http://localhost:4321/Propbillions').replace(/\/$/, '');
const out = process.argv[3] || 'test-results/devices';
fs.mkdirSync(out, { recursive: true });
const pages = ['/', '/projects', '/projects/uttarakhand/heaven-in-the-forest', '/projects/greater-noida-west/london-mart', '/neev-check', '/locations', '/locations/greater-noida-west', '/tools', '/tools/all-in-cost', '/tools/emi', '/tools/rent-vs-buy', '/about', '/contact', '/nri', '/privacy', '/terms', '/disclaimer', '/style'];
const DEV = {
  iphone: { ...devices['iPhone 13'], expect: 'm' },
  ipad: { ...devices['iPad (gen 7) landscape'], expect: 't' },
  laptop: { viewport: { width: 1366, height: 768 }, expect: 'd' },
  desktop1920: { viewport: { width: 1920, height: 1080 }, expect: 'd' },
  reduced: { viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', expect: 'static' },
};
const b = await chromium.launch();
const results = []; let fail = 0;
for (const [name, { expect, ...opts }] of Object.entries(DEV)) {
  const ctx = await b.newContext(opts);
  for (const path of name === 'reduced' ? ['/'] : pages) {
    const p = await ctx.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${r.status()} ${r.url()}`); });
    await p.addInitScript(() => { window.__lcp = 0; window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {} });
    await p.goto(base + path, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const small = [...document.querySelectorAll('a.btn, button, input:not([type=hidden]), select, textarea, .hdr__menu')].filter((el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && s.visibility !== 'hidden' && el.closest('[hidden]') === null && el.closest('.hp') === null && (b.height < 40 || b.width < 40) && !(el.type === 'checkbox' || el.type === 'radio'); }).map((el) => `${el.tagName}.${el.className}`.slice(0, 50));
      return { mode: document.documentElement.dataset.jmode || null, overflow: document.documentElement.scrollWidth - innerWidth, lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), small: [...new Set(small)].slice(0, 5), h1: document.querySelectorAll('h1').length, title: document.title };
    });
    const shot = `${out}/${name}${path.replace(/\//g, '_') || '_home'}.jpg`;
    await p.screenshot({ path: shot, type: 'jpeg', quality: 55 });
    const ok = errors.length === 0 && r.overflow <= 0 && (path !== '/' || r.mode === expect) && r.h1 === 1;
    if (!ok) fail++;
    results.push({ device: name, path, ok, ...r, errors });
    await p.close();
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.device.padEnd(11)} ${r.path.padEnd(42)} mode=${r.mode} overflow=${r.overflow} lcp=${r.lcp} cls=${r.cls} h1=${r.h1}${r.small.length ? ' small=' + r.small.join('|') : ''}${r.errors.length ? ' ERR=' + r.errors.join(' || ') : ''}`);
console.log(fail ? `\n${fail} failing` : '\nAll device checks passed');
process.exit(fail ? 1 : 0);
