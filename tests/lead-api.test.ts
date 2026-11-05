import { describe, it, expect, vi } from 'vitest';
import { handle, deliver, rateLimited } from '../functions/api/lead';

const req = (body: unknown, ip = '1.2.3.4') => new Request('https://x/api/lead', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const lead = { name: 'Asha Verma', phone: '9810012345', consent: true, intent: 'site-visit', project: 'Test' };
const okFetch = () => vi.fn(async () => new Response('{}', { status: 200 }));

describe('lead API', () => {
  it('rejects GET', async () => {
    const r = await handle(new Request('https://x/api/lead'), {});
    expect(r.status).toBe(405);
  });
  it('returns 422 with field errors for bad input', async () => {
    const r = await handle(req({ name: '', phone: '1' }, '9.9.9.1'), {});
    expect(r.status).toBe(422);
    const j = await r.json();
    expect(j.errors.phone).toBeTruthy();
    expect(j.errors.consent).toBeTruthy();
  });
  it('quietly accepts and drops honeypot spam', async () => {
    const f = okFetch();
    const r = await handle(req({ ...lead, website: 'x' }, '9.9.9.2'), { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' }, f);
    expect(r.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });
  it('stores the lead and alerts every configured channel', async () => {
    const store = new Map<string, string>();
    const env = {
      LEADS: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => void store.set(k, v) },
      TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c', CRM_WEBHOOK_URL: 'https://crm.example/hook', RESEND_API_KEY: 'k', LEAD_EMAIL_TO: 'sales@example.com',
    };
    const f = okFetch();
    const r = await handle(req({ ...lead, email: 'asha@example.com' }, '9.9.9.3'), env, f);
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.alerted).toBe(true);
    expect(j.delivered).toEqual({ telegram: true, email: true, autoreply: true, crm: true });
    expect([...store.keys()].some((k) => k.startsWith('lead:'))).toBe(true);
  });
  it('sends conversion events only with marketing consent', async () => {
    const env = { META_PIXEL_ID: 'p', META_CAPI_TOKEN: 't', GA4_MEASUREMENT_ID: 'g', GA4_API_SECRET: 's' };
    const base = { name: 'A B', phone: '+919810012345', intent: 'callback' as const, receivedAt: new Date().toISOString(), marketingConsent: false };
    const f1 = okFetch();
    expect(await deliver(base, env, f1)).toEqual({});
    const f2 = okFetch();
    expect(await deliver({ ...base, marketingConsent: true }, env, f2)).toEqual({ meta: true, ga4: true });
    const metaBody = JSON.parse((f2.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(metaBody.data[0].user_data.ph[0]).toMatch(/^[a-f0-9]{64}$/); // hashed, never raw
  });
  it('rate limits bursts from one address', async () => {
    const env = {};
    let blocked = false;
    for (let i = 0; i < 7; i++) blocked = await rateLimited(env, '7.7.7.7', 5, 600, 1000 + i);
    expect(blocked).toBe(true);
  });
});
