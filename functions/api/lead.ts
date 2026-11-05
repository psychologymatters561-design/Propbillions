/**
 * Lead API. Runs as a Cloudflare Pages Function (also portable to Vercel/Netlify with a thin wrapper).
 * POST /api/lead with JSON. Validates, blocks spam, stores, alerts sales, replies to the buyer,
 * and sends conversion events only when the buyer gave marketing consent.
 *
 * Every channel is switched on by setting its environment variables. Nothing is hard-coded.
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID        instant alert to the sales phone (free)
 *   RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM   email alert + buyer auto-reply
 *   WA_TOKEN, WA_PHONE_ID, WA_SALES_TO, WA_TEMPLATE  WhatsApp Cloud API alert (template approved by Meta)
 *   CRM_WEBHOOK_URL                             POST the lead JSON to any CRM
 *   META_PIXEL_ID, META_CAPI_TOKEN              Meta Conversions API (consent only)
 *   GA4_MEASUREMENT_ID, GA4_API_SECRET          Google Analytics 4 Measurement Protocol (consent only)
 *   LEADS (KV binding)                          storage and rate limiting
 */
import { validateLead, leadSummary, type Lead } from '../../src/lib/lead';

export interface Env {
  LEADS?: { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };
  [k: string]: unknown;
}
type Fetch = typeof fetch;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** In-memory fallback when no KV is bound. Good enough to stop a burst from one address. */
const memory = new Map<string, { n: number; t: number }>();
export async function rateLimited(env: Env, ip: string, limit = 5, windowS = 600, now = Date.now()): Promise<boolean> {
  const key = `rl:${ip}`;
  if (env.LEADS) {
    const n = Number((await env.LEADS.get(key)) || 0) + 1;
    await env.LEADS.put(key, String(n), { expirationTtl: windowS });
    return n > limit;
  }
  const e = memory.get(key);
  if (!e || now - e.t > windowS * 1000) { memory.set(key, { n: 1, t: now }); return false; }
  e.n++; return e.n > limit;
}

export async function deliver(lead: Lead, env: Env, f: Fetch = fetch) {
  const text = leadSummary(lead);
  const s = (k: string) => (env[k] ? String(env[k]) : '');
  const jobs: Record<string, Promise<Response>> = {};
  if (s('TELEGRAM_BOT_TOKEN') && s('TELEGRAM_CHAT_ID'))
    jobs.telegram = f(`https://api.telegram.org/bot${s('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: s('TELEGRAM_CHAT_ID'), text }) });
  if (s('WA_TOKEN') && s('WA_PHONE_ID') && s('WA_SALES_TO'))
    jobs.whatsapp = f(`https://graph.facebook.com/v21.0/${s('WA_PHONE_ID')}/messages`, {
      method: 'POST', headers: { authorization: `Bearer ${s('WA_TOKEN')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: s('WA_SALES_TO'), type: 'template', template: { name: s('WA_TEMPLATE') || 'new_lead', language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 900) }] }] } }),
    });
  if (s('RESEND_API_KEY') && s('LEAD_EMAIL_TO')) {
    const from = s('LEAD_EMAIL_FROM') || 'PropBillions <leads@propbillions.com>';
    jobs.email = f('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${s('RESEND_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [s('LEAD_EMAIL_TO')], subject: text.split('\n')[0], text }) });
    if (lead.email)
      jobs.autoreply = f('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${s('RESEND_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: [lead.email], subject: 'We got your request', text: `Hi ${lead.name},\n\nThanks for writing to PropBillions. A person from our team will call you on ${lead.phone}. If you do not hear from us within one working hour, reply to this email.\n\nPropBillions` }) });
  }
  if (s('CRM_WEBHOOK_URL')) jobs.crm = f(s('CRM_WEBHOOK_URL'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
  if (lead.marketingConsent) {
    if (s('META_PIXEL_ID') && s('META_CAPI_TOKEN'))
      jobs.meta = f(`https://graph.facebook.com/v21.0/${s('META_PIXEL_ID')}/events?access_token=${s('META_CAPI_TOKEN')}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: [{ event_name: 'Lead', event_time: Math.floor(Date.parse(lead.receivedAt) / 1000), action_source: 'website', event_source_url: lead.page, user_data: { ph: [await sha256(lead.phone.replace('+', ''))], ...(lead.email ? { em: [await sha256(lead.email)] } : {}) }, custom_data: { content_name: lead.intent, content_category: lead.project } }] }),
      });
    if (s('GA4_MEASUREMENT_ID') && s('GA4_API_SECRET'))
      jobs.ga4 = f(`https://www.google-analytics.com/mp/collect?measurement_id=${s('GA4_MEASUREMENT_ID')}&api_secret=${s('GA4_API_SECRET')}`, { method: 'POST', body: JSON.stringify({ client_id: (await sha256(lead.phone)).slice(0, 20), events: [{ name: 'generate_lead', params: { intent: lead.intent, project: lead.project || '' } }] }) });
  }
  const names = Object.keys(jobs);
  const settled = await Promise.allSettled(Object.values(jobs));
  const result: Record<string, boolean> = {};
  settled.forEach((r, i) => (result[names[i]] = r.status === 'fulfilled' && r.value.ok));
  return result;
}

export async function handle(request: Request, env: Env, f: Fetch = fetch): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  let body: Record<string, unknown>;
  try {
    const ct = request.headers.get('content-type') || '';
    body = ct.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries());
  } catch { return json({ ok: false, errors: { form: 'Could not read the form.' } }, 400); }
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  if (await rateLimited(env, ip)) return json({ ok: false, errors: { form: 'Too many requests. Please call or WhatsApp us instead.' } }, 429);
  const v = validateLead(body as never);
  if (!v.ok) return json({ ok: false, errors: v.errors }, v.spam ? 200 : 422); // spam gets a quiet 200
  const id = `lead:${v.lead.receivedAt}:${v.lead.phone}`;
  if (env.LEADS) await env.LEADS.put(id, JSON.stringify(v.lead));
  const delivered = await deliver(v.lead, env, f);
  const anyAlert = delivered.telegram || delivered.whatsapp || delivered.email || delivered.crm;
  return json({ ok: true, id, delivered, stored: Boolean(env.LEADS), alerted: Boolean(anyAlert) });
}

export const onRequest = (ctx: { request: Request; env: Env }) => handle(ctx.request, ctx.env);
