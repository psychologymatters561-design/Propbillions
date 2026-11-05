// Crawls a site with a real browser and records what a visitor and Google see.
// Usage: node scripts/audit/crawl.mjs https://propbillions.com out-dir [maxPages]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const start = process.argv[2];
const out = process.argv[3] || 'audit-raw';
const MAX = Number(process.argv[4] || 80);
const origin = new URL(start).origin.replace('://www.', '://');
const sameSite = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return h === new URL(origin).hostname; } catch { return false; } };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

await fs.mkdir(path.join(out, 'shots'), { recursive: true });
await fs.mkdir(path.join(out, 'html'), { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });
const pages = [], queue = [start], seen = new Set(), images = new Map(), media = new Map();
const slug = (u) => (new URL(u).pathname.replace(/\/+$/, '').replace(/[^a-z0-9]+/gi, '_') || 'home').slice(0, 80);

while (queue.length && pages.length < MAX) {
  const url = queue.shift().split('#')[0];
  if (seen.has(url)) continue; seen.add(url);
  const page = await ctx.newPage();
  const consoleErrors = [], failed = [], responses = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 300)));
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', async (r) => {
    const ct = r.headers()['content-type'] || '';
    const len = Number(r.headers()['content-length'] || 0);
    responses.push({ url: r.url(), status: r.status(), ct, len });
    if (/^image\//.test(ct)) images.set(r.url(), { url: r.url(), ct, page: url });
    if (/^video\//.test(ct)) media.set(r.url(), { url: r.url(), ct, page: url });
  });
  let status = 0, rawHtml = '';
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : 0;
    rawHtml = resp ? await resp.text().catch(() => '') : '';
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // scroll to trigger lazy content
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(1500);
  } catch (e) { consoleErrors.push('NAV ' + e.message.slice(0, 200)); }
  const data = await page.evaluate(() => {
    const q = (s) => [...document.querySelectorAll(s)];
    const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
    const imgs = q('img').map((i) => ({ src: abs(i.currentSrc || i.src || i.dataset.src || ''), srcset: i.srcset || i.dataset.srcset || '', alt: i.alt, w: i.naturalWidth, h: i.naturalHeight, loading: i.loading }));
    const bgs = q('*').map((el) => getComputedStyle(el).backgroundImage).filter((b) => b && b !== 'none' && b.includes('url(')).flatMap((b) => [...b.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => abs(m[1])));
    return {
      title: document.title,
      meta: Object.fromEntries(q('meta[name],meta[property]').map((m) => [m.getAttribute('name') || m.getAttribute('property'), m.content])),
      canonical: document.querySelector('link[rel=canonical]')?.href || null,
      lang: document.documentElement.lang,
      headings: q('h1,h2,h3,h4').map((h) => `${h.tagName}: ${h.innerText.trim().replace(/\s+/g, ' ')}`).filter((s) => s.length > 4),
      text: document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 40000),
      links: [...new Set(q('a[href]').map((a) => abs(a.getAttribute('href'))))],
      linkTexts: q('a[href]').map((a) => ({ t: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 80), h: abs(a.getAttribute('href')) })).filter((l) => l.t),
      imgs, bgs: [...new Set(bgs)],
      videos: q('video, video source, iframe').map((v) => ({ tag: v.tagName, src: abs(v.currentSrc || v.src || v.getAttribute('src') || ''), poster: v.poster || '' })),
      forms: q('form').map((f) => ({ action: f.action, method: f.method, fields: [...f.elements].map((e) => `${e.tagName.toLowerCase()}:${e.type || ''}:${e.name || e.id || ''}:${e.placeholder || ''}`) })),
      ldjson: q('script[type="application/ld+json"]').map((s) => s.textContent.slice(0, 5000)),
      tel: [...new Set(q('a[href^="tel:"],a[href*="wa.me"],a[href*="whatsapp"],a[href^="mailto:"]').map((a) => a.href))],
      scripts: q('script[src]').map((s) => s.src),
      docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, vw: innerWidth,
    };
  }).catch((e) => ({ error: String(e) }));
  const s = slug(url);
  await page.screenshot({ path: path.join(out, 'shots', `desktop_${s}.jpg`), fullPage: true, quality: 60, type: 'jpeg' }).catch(() => {});
  await fs.writeFile(path.join(out, 'html', `${s}.html`), rawHtml);
  for (const im of data.imgs || []) if (im.src && !im.src.startsWith('data:')) images.set(im.src, { ...(images.get(im.src) || {}), url: im.src, alt: im.alt, w: im.w, h: im.h, page: url });
  for (const b of data.bgs || []) if (!b.startsWith('data:')) images.set(b, { ...(images.get(b) || {}), url: b, page: url, bg: true });
  const rawText = rawHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  pages.push({ url, finalUrl: page.url(), status, consoleErrors, failed: failed.slice(0, 40), requestCount: responses.length, rawHtmlBytes: rawHtml.length, rawHtmlTextSample: rawText.slice(0, 3000), rawHtmlTextLength: rawText.length, ...data });
  for (const l of data.links || []) { const c = l.split('#')[0]; if (sameSite(c) && !seen.has(c) && !/\.(pdf|jpe?g|png|webp|zip|mp4)$/i.test(c) && !c.includes('wp-json') && !c.includes('/feed')) queue.push(c); }
  console.log(pages.length, status, url);
  await page.close();
}

// Phone: first five seconds of the homepage
const phone = await browser.newContext({ ...devices['iPhone 13'] });
const pp = await phone.newPage();
const t0 = Date.now();
const firstFive = [];
pp.goto(start, { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
for (const ms of [500, 1000, 2000, 3000, 5000, 8000]) {
  await new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - t0))));
  const f = path.join(out, 'shots', `phone_t${ms}.jpg`);
  await pp.screenshot({ path: f, type: 'jpeg', quality: 70 }).catch(() => {});
  const txt = await pp.evaluate(() => document.body ? document.body.innerText.slice(0, 600) : '').catch(() => '');
  firstFive.push({ ms, text: txt });
}
await pp.waitForTimeout(4000);
await pp.screenshot({ path: path.join(out, 'shots', 'phone_full.jpg'), fullPage: true, type: 'jpeg', quality: 55 }).catch(() => {});
const phoneOverflow = await pp.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth })).catch(() => null);
await browser.close();

// Download images
await fs.mkdir(path.join(out, 'images'), { recursive: true });
const manifest = [];
for (const im of images.values()) {
  try {
    const r = await fetch(im.url, { headers: { 'user-agent': UA, referer: origin } });
    if (!r.ok) { manifest.push({ ...im, error: r.status }); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = (im.url.split('?')[0].match(/\.(jpe?g|png|webp|gif|svg|avif)$/i)?.[1] || (r.headers.get('content-type') || '').split('/')[1] || 'bin').toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
    const base = decodeURIComponent(im.url.split('?')[0].split('/').pop()).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60);
    const file = `${base}-${hash}.${ext}`;
    await fs.writeFile(path.join(out, 'images', file), buf);
    manifest.push({ ...im, file, bytes: buf.length, contentType: r.headers.get('content-type') });
  } catch (e) { manifest.push({ ...im, error: String(e).slice(0, 120) }); }
}
await fs.writeFile(path.join(out, 'pages.json'), JSON.stringify(pages, null, 1));
await fs.writeFile(path.join(out, 'images.json'), JSON.stringify(manifest, null, 1));
await fs.writeFile(path.join(out, 'media.json'), JSON.stringify([...media.values()], null, 1));
await fs.writeFile(path.join(out, 'phone-first-seconds.json'), JSON.stringify({ firstFive, phoneOverflow }, null, 1));
console.log('pages', pages.length, 'images', manifest.length);
