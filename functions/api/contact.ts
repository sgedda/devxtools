import type { PagesFunction } from '@cloudflare/workers-types';
import { checkHoneypot, checkMinimumFillTime, parseRequestBody } from '../lib/submission-utils';
import { validateContact, checkContactRateLimit, buildContactEmail } from '../lib/contact-utils';

interface Env {
  RESEND_API_KEY?: string;
  NEWSLETTER_KV?: KVNamespace;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
}

const DEFAULT_TO = 'sebastian.gedda@gmail.com';
const DEFAULT_FROM = 'DevXTools Contact <contact@devxtools.dev>';
const OK_MESSAGE = "Thanks, your message has been sent. We'll reply by email if it needs an answer.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/**
 * Contact form. Nothing about the message is persisted: the only KV write is the per-IP
 * rate-limit counter (TTL 1h). The message is forwarded once via Resend with reply_to = sender.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.RESEND_API_KEY) return json({ error: 'The contact form is not configured yet.' }, 503);

    const body = await parseRequestBody(request);
    if (!body) return json({ error: 'Invalid request body' }, 400);
    const { website: honeypot, startTime, turnstileToken, ...fields } = body as Record<string, unknown>;

    // Honeypot: pretend success, send nothing.
    if (checkHoneypot(honeypot)) return json({ message: OK_MESSAGE });

    const start = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;
    if (typeof start !== 'number' || Number.isNaN(start) || !checkMinimumFillTime(start, Date.now())) {
      return json({ error: 'Please take a moment to write your message, then try again.' }, 400);
    }

    const validation = validateContact(fields);
    if (!validation.valid || !validation.data) return json({ error: validation.error }, 400);

    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Turnstile is enforced only when BOTH TURNSTILE_SECRET and PUBLIC_TURNSTILE_SITE_KEY are set.
    // With only the secret, the page renders no widget, so requiring a token would block every message.
    if (env.TURNSTILE_SECRET && env.PUBLIC_TURNSTILE_SITE_KEY) {
      if (typeof turnstileToken !== 'string' || !turnstileToken) {
        return json({ error: 'Please complete the verification.' }, 400);
      }
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: turnstileToken, remoteip: clientIP }),
      });
      const result = (await verify.json()) as { success: boolean };
      if (!result.success) return json({ error: 'Verification failed. Please try again.' }, 400);
    }

    const rate = await checkContactRateLimit(env.NEWSLETTER_KV, clientIP);
    if (!rate.allowed) return json({ error: rate.error }, 429);

    const email = buildContactEmail(validation.data, {
      from: env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to: env.CONTACT_TO_EMAIL || DEFAULT_TO,
    });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });
    if (!res.ok) {
      console.error('Contact send failed', res.status);
      return json({ error: "Sorry, we couldn't send your message. Please try again later." }, 502);
    }
    return json({ message: OK_MESSAGE });
  } catch {
    console.error('Contact handler error');
    return json({ error: 'An unexpected error occurred' }, 500);
  }
};
