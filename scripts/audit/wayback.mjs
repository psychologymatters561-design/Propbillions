// Pulls the Internet Archive's copies of a site: every archived URL, the latest HTML of each page,
// and every archived image. Used when the live site blocks automated visitors.
import fs from 'node:fs/promises';
import path from 'node:path';
const host = process.argv[2] || 'propbillions.com';
const out = process.argv[3] || 'audit-raw/wayback';
await fs.mkdir(path.join(out, 'html'), { recursive: true });
await fs.mkdir(path.join(out, 'images'), { recursive: true });
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const get = async (u, tries = 3) => { for (let i = 0; i < tries; i++) { try { const r = await fetch(u, { headers: { 'user-agent': UA } }); if (r.ok) return r; if (r.status === 404) return r; } catch {} await new Promise((r) => setTimeout(r, 2000 * (i + 1))); } return null; };
const rows = [];
for (const q of [`${host}/*`, `www.${host}/*`, host]) {
  const r = await get(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(q)}&output=json&fl=timestamp,original,mimetype,statuscode,length&filter=statuscode:200&limit=5000`);
  if (!r) continue; const j = await r.json().catch(() => []); rows.push(...j.slice(1));
}
await fs.writeFile(path.join(out, 'cdx.json'), JSON.stringify(rows));
// latest capture per URL
const latest = new Map();
for (const [ts, orig, mime, st, len] of rows) {
  const key = orig.replace(/^https?:\/\/(www\.)?/, '').replace(/:80\//, '/').split('#')[0];
  const cur = latest.get(key); if (!cur || ts > cur.ts) latest.set(key, { ts, orig, mime, len: Number(len) });
}
const list = [...latest.values()];
console.log('archived urls', list.length);
const manifest = [];
const safe = (s) => s.replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 120);
for (const x of list) {
  const isHtml = /html/.test(x.mime); const isImg = /^image\//.test(x.mime); const isVid = /^video\//.test(x.mime); const isPdf = /pdf/.test(x.mime);
  if (!isHtml && !isImg && !isVid && !isPdf) { manifest.push({ ...x, skipped: true }); continue; }
  if ((isVid || isPdf) && x.len > 40e6) { manifest.push({ ...x, skipped: 'too big' }); continue; }
  const r = await get(`https://web.archive.org/web/${x.ts}id_/${x.orig}`);
  if (!r || !r.ok) { manifest.push({ ...x, error: r ? r.status : 'fail' }); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  const dir = isHtml ? 'html' : isImg ? 'images' : 'files';
  await fs.mkdir(path.join(out, dir), { recursive: true });
  let name = safe(x.orig); if (isHtml && !name.endsWith('.html')) name += '.html';
  await fs.writeFile(path.join(out, dir, name), buf);
  manifest.push({ ...x, file: `${dir}/${name}`, bytes: buf.length });
}
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('saved', manifest.filter((m) => m.file).length);
