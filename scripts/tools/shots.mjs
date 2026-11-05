// Screenshot pages at given scroll fractions on desktop and phone. Usage: node scripts/tools/shots.mjs <url> <outdir> [fractions]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('@playwright/test'); }
const { chromium, devices } = pw;
import fs from 'node:fs';
const [url, out, fr = '0,0.2,0.45,0.7,0.97'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const report = {};
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['iPhone 13']]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(4000);
  const j = await p.evaluate(() => { const el = document.querySelector('section[data-journey]'); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight, mode: document.documentElement.dataset.jmode }; });
  for (const f of fr.split(',').map(Number)) {
    const y = j ? j.top + (j.h - j.vh) * f : f * (await p.evaluate(() => document.body.scrollHeight));
    await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${name}-${f}.jpg`, type: 'jpeg', quality: 60 });
  }
  report[name] = { journey: j, errors: errs, overflow: await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
  await ctx.close();
}
function innerHeightGuess(o) { return o.viewport ? o.viewport.height : 664; }
console.log(JSON.stringify(report, null, 1));
await b.close();
