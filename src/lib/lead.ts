/** Lead validation, shared by the browser form and the server function. */
export type Intent = 'site-visit' | 'neev-check' | 'shortlist' | 'brochure' | 'callback';
export interface LeadInput {
  name?: string; phone?: string; email?: string; intent?: string; project?: string; city?: string;
  budget?: string; slot?: string; message?: string; consent?: boolean | string; marketingConsent?: boolean | string;
  website?: string;        // honeypot: humans never see it
  startedAt?: number | string; // ms timestamp when the form was rendered
  page?: string; utm?: Record<string, string>;
}
export interface Lead {
  name: string; phone: string; email?: string; intent: Intent; project?: string; city?: string; budget?: string;
  slot?: string; message?: string; marketingConsent: boolean; page?: string; utm?: Record<string, string>; receivedAt: string;
}
const INTENTS: Intent[] = ['site-visit', 'neev-check', 'shortlist', 'brochure', 'callback'];

/** Normalise an Indian or international phone number to E.164. Returns null when it cannot be valid. */
export function normalisePhone(raw: string): string | null {
  const s = String(raw || '').trim();
  const plus = s.startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!plus) {
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 10 && /^[6-9]/.test(d)) return '+91' + d;
    return null;
  }
  if (d.startsWith('91')) return /^91[6-9]\d{9}$/.test(d) ? '+' + d : null;
  return d.length >= 8 && d.length <= 15 ? '+' + d : null;
}

export function validateLead(input: LeadInput, now = Date.now()): { ok: true; lead: Lead } | { ok: false; errors: Record<string, string>; spam?: boolean } {
  const errors: Record<string, string> = {};
  if (input.website) return { ok: false, errors: { form: 'Rejected' }, spam: true };
  const name = String(input.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80 || /https?:|www\./i.test(name)) errors.name = 'Please enter your name.';
  const phone = normalisePhone(String(input.phone || ''));
  if (!phone) errors.phone = 'Please enter a valid mobile number. Use +country code if outside India.';
  const email = String(input.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'This email looks incomplete.';
  const intent = (INTENTS.includes(input.intent as Intent) ? input.intent : 'callback') as Intent;
  const consent = input.consent === true || input.consent === 'on' || input.consent === 'true';
  if (!consent) errors.consent = 'We need your permission to contact you about this request.';
  const message = String(input.message || '').trim();
  if (message.length > 1000) errors.message = 'Please keep the note under 1000 characters.';
  if ((message.match(/https?:\/\//g) || []).length > 1) errors.message = 'Please remove links from the note.';
  if (Object.keys(errors).length) return { ok: false, errors };
  // Only a complete form can be a bot-speed submit; a fast human with a gap still sees their errors.
  const started = Number(input.startedAt || 0);
  if (started && now - started < 2500) return { ok: false, errors: { form: 'Too fast. Please try again.' }, spam: true };
  const clip = (v?: string, n = 120) => (v ? String(v).trim().slice(0, n) : undefined);
  return {
    ok: true,
    lead: {
      name, phone: phone!, email: email || undefined, intent,
      project: clip(input.project), city: clip(input.city), budget: clip(input.budget, 40), slot: clip(input.slot, 60),
      message: message || undefined,
      marketingConsent: input.marketingConsent === true || input.marketingConsent === 'on' || input.marketingConsent === 'true',
      page: clip(input.page, 200), utm: input.utm, receivedAt: new Date(now).toISOString(),
    },
  };
}

const INTENT_LABEL: Record<Intent, string> = {
  'site-visit': 'Site visit', 'neev-check': 'Neev Check', shortlist: 'Shortlist on WhatsApp', brochure: 'Brochure', callback: 'Call back',
};

/** The plain text a sales person reads on their phone. */
export function leadSummary(l: Lead): string {
  return [
    `New lead: ${INTENT_LABEL[l.intent]}`,
    `${l.name}, ${l.phone}${l.email ? ', ' + l.email : ''}`,
    l.project && `Project: ${l.project}`, l.city && `City: ${l.city}`, l.budget && `Budget: ${l.budget}`,
    l.slot && `Preferred slot: ${l.slot}`, l.message && `Note: ${l.message}`, l.page && `From page: ${l.page}`,
  ].filter(Boolean).join('\n');
}

/** wa.me link the buyer opens to send the request themselves. Works with no server at all. */
export function whatsappLink(number: string, l: Pick<Lead, 'name' | 'intent' | 'project' | 'slot' | 'budget'>): string {
  const n = number.replace(/\D/g, '');
  const text = [`Hi PropBillions, I am ${l.name}.`, `I would like: ${INTENT_LABEL[l.intent]}.`, l.project && `Project: ${l.project}.`, l.budget && `Budget: ${l.budget}.`, l.slot && `Preferred slot: ${l.slot}.`].filter(Boolean).join(' ');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
