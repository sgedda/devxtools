import { escapeHtml } from './submission-utils';

export const CONTACT_TOPICS = {
  general: 'General',
  correction: 'Tool correction',
  listing: 'Listing / claim',
  press: 'Sponsorship / press',
  other: 'Other',
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;

export interface ContactData {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

export const CONTACT_LIMITS = { name: 100, email: 254, messageMin: 10, messageMax: 5000 };
export const CONTACT_RATE_LIMIT_WINDOW_S = 60 * 60; // 1 hour
export const CONTACT_RATE_LIMIT_MAX = 3; // messages per IP per hour
export const CONTACT_MIN_FILL_MS = 3000;

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
// Header-injection guard: no CR/LF or other control characters in single-line fields.
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export function validateContact(input: unknown): { valid: boolean; error?: string; data?: ContactData } {
  if (!input || typeof input !== 'object') return { valid: false, error: 'Invalid request data' };
  const d = input as Record<string, unknown>;

  const name = typeof d.name === 'string' ? d.name.trim() : '';
  if (!name) return { valid: false, error: 'Name is required' };
  if (name.length > CONTACT_LIMITS.name) return { valid: false, error: `Name must be ${CONTACT_LIMITS.name} characters or less` };
  if (CONTROL_RE.test(name)) return { valid: false, error: 'Name contains invalid characters' };

  const email = typeof d.email === 'string' ? d.email.trim() : '';
  if (!email) return { valid: false, error: 'Email is required' };
  if (email.length > CONTACT_LIMITS.email || CONTROL_RE.test(email) || !EMAIL_RE.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  const topic = typeof d.topic === 'string' ? d.topic : '';
  if (!(topic in CONTACT_TOPICS)) return { valid: false, error: 'Please choose a topic' };

  const message = typeof d.message === 'string' ? d.message.replace(/\r\n/g, '\n').trim() : '';
  if (message.length < CONTACT_LIMITS.messageMin) {
    return { valid: false, error: `Message must be at least ${CONTACT_LIMITS.messageMin} characters` };
  }
  if (message.length > CONTACT_LIMITS.messageMax) {
    return { valid: false, error: `Message must be ${CONTACT_LIMITS.messageMax} characters or less` };
  }

  return { valid: true, data: { name, email, topic: topic as ContactTopic, message } };
}

/**
 * KV rate limit (same fixed-window pattern as submit/newsletter). Stores only a counter per IP
 * with a TTL; never message content. Fails open if KV is unavailable.
 */
export async function checkContactRateLimit(
  kv: KVNamespace | undefined,
  clientIP: string,
  now: number = Date.now(),
): Promise<{ allowed: boolean; error?: string }> {
  if (!kv) return { allowed: true };
  const key = `contact-rate:${clientIP}`;
  try {
    const raw = await kv.get(key);
    const entry = raw ? (JSON.parse(raw) as { count: number; resetAt: number }) : null;
    if (!entry || now >= entry.resetAt) {
      await kv.put(key, JSON.stringify({ count: 1, resetAt: now + CONTACT_RATE_LIMIT_WINDOW_S * 1000 }), {
        expirationTtl: CONTACT_RATE_LIMIT_WINDOW_S,
      });
      return { allowed: true };
    }
    if (entry.count >= CONTACT_RATE_LIMIT_MAX) {
      return { allowed: false, error: 'Too many messages. Please try again in an hour.' };
    }
    await kv.put(key, JSON.stringify({ count: entry.count + 1, resetAt: entry.resetAt }), {
      expirationTtl: Math.max(60, Math.ceil((entry.resetAt - now) / 1000)),
    });
    return { allowed: true };
  } catch (error) {
    console.error('Contact rate limit error');
    return { allowed: true };
  }
}

export function buildContactEmail(data: ContactData, opts: { from: string; to: string; ip?: string }) {
  const topicLabel = CONTACT_TOPICS[data.topic];
  const subject = `[DevXTools contact] ${topicLabel}: ${data.name}`.slice(0, 180);
  const text = [
    `Topic: ${topicLabel}`,
    `From: ${data.name} <${data.email}>`,
    '',
    data.message,
    '',
    '—',
    'Sent from the devxtools.dev/contact/ form. Reply to this email to answer the sender.',
  ].join('\n');
  const html = `<p><strong>Topic:</strong> ${escapeHtml(topicLabel)}<br><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>
<p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
<hr><p style="color:#71717a;font-size:12px">Sent from the devxtools.dev/contact/ form. Reply to this email to answer the sender.</p>`;
  return { from: opts.from, to: [opts.to], reply_to: data.email, subject, text, html };
}
