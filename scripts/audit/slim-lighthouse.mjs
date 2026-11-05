import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const summary = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('summary'))) {
  const p = path.join(dir, f);
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  const a = r.audits || {};
  const v = (k) => a[k]?.numericValue;
  const reqs = (a['network-requests']?.details?.items || []).map((i) => ({ url: i.url, type: i.resourceType, bytes: i.transferSize }));
  summary[f.replace('.json', '')] = {
    url: r.finalDisplayedUrl || r.finalUrl,
    scores: Object.fromEntries(Object.entries(r.categories || {}).map(([k, c]) => [k, Math.round((c.score || 0) * 100)])),
    lcp_ms: v('largest-contentful-paint'), cls: v('cumulative-layout-shift'), fcp_ms: v('first-contentful-paint'), tbt_ms: v('total-blocking-time'), si_ms: v('speed-index'),
    total_bytes: v('total-byte-weight'), requests: reqs.length,
    lcp_element: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || null,
    heaviest: reqs.sort((x, y) => (y.bytes || 0) - (x.bytes || 0)).slice(0, 25),
    failing: Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'informative').map((x) => `${x.id}: ${x.title}${x.displayValue ? ' (' + x.displayValue + ')' : ''}`).slice(0, 60),
    screenshot: a['final-screenshot']?.details?.data ? 'saved' : null,
  };
  if (a['final-screenshot']?.details?.data) fs.writeFileSync(p.replace('.json', '_final.jpg'), Buffer.from(a['final-screenshot'].details.data.split(',')[1], 'base64'));
  fs.unlinkSync(p);
}
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 1));
