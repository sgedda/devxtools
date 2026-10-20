import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateContact,
  checkContactRateLimit,
  buildContactEmail,
  CONTACT_RATE_LIMIT_MAX,
} from '../functions/lib/contact-utils';

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', topic: 'correction', message: 'The license on the Nock page is wrong.' };

function memoryKV() {
  const store = new Map<string, string>();
  const puts: Array<{ key: string; value: string; opts?: any }> = [];
  return {
    store, puts,
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string, opts?: any) => { store.set(k, v); puts.push({ key: k, value: v, opts }); }),
  } as any;
}

describe('validateContact', () => {
  it('accepts a valid message and trims fields', () => {
    const r = validateContact({ ...valid, name: '  Ada  ' });
    expect(r.valid).toBe(true);
    expect(r.data?.name).toBe('Ada');
  });
  it.each([
    [{ name: '' }, 'Name is required'],
    [{ email: 'nope' }, 'valid email'],
    [{ email: 'a@b.co\r\nBcc: x@y.z' }, 'valid email'],
    [{ name: 'Ada\nBcc: x@y.z' }, 'invalid characters'],
    [{ topic: 'spam' }, 'topic'],
    [{ message: 'short' }, 'at least'],
    [{ message: 'x'.repeat(5001) }, 'or less'],
  ])('rejects %o', (patch, msg) => {
    const r = validateContact({ ...valid, ...patch });
    expect(r.valid).toBe(false);
    expect(r.error).toContain(msg);
  });
});

describe('checkContactRateLimit', () => {
  it('allows up to the limit, then blocks, and stores only a counter with a TTL', async () => {
    const kv = memoryKV();
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i++) {
      expect((await checkContactRateLimit(kv, '1.2.3.4', 1000)).allowed).toBe(true);
    }
    expect((await checkContactRateLimit(kv, '1.2.3.4', 1000)).allowed).toBe(false);
    expect((await checkContactRateLimit(kv, '5.6.7.8', 1000)).allowed).toBe(true);
    for (const p of kv.puts) {
      expect(p.key.startsWith('contact-rate:')).toBe(true);
      expect(Object.keys(JSON.parse(p.value)).sort()).toEqual(['count', 'resetAt']);
      expect(p.opts.expirationTtl).toBeGreaterThan(0);
    }
  });
  it('resets after the window', async () => {
    const kv = memoryKV();
    for (let i = 0; i <= CONTACT_RATE_LIMIT_MAX; i++) await checkContactRateLimit(kv, 'ip', 0);
    expect((await checkContactRateLimit(kv, 'ip', 3600_001)).allowed).toBe(true);
  });
});

describe('buildContactEmail', () => {
  it('sets reply_to to the sender and escapes HTML', () => {
    const e = buildContactEmail({ ...valid, topic: 'general', message: '<script>x</script>' } as any, { from: 'f@devxtools.dev', to: 'to@example.com' });
    expect(e.reply_to).toBe('ada@example.com');
    expect(e.to).toEqual(['to@example.com']);
    expect(e.html).not.toContain('<script>');
    expect(e.subject).toContain('General');
  });
});

describe('POST /api/contact', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  async function post(fields: Record<string, string>, env: Record<string, unknown>) {
    const { onRequestPost } = await import('../functions/api/contact');
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const request = new Request('https://devxtools.dev/api/contact', { method: 'POST', body: fd, headers: { 'CF-Connecting-IP': '9.9.9.9' } });
    return onRequestPost({ request, env } as any);
  }
  const base = { ...valid, startTime: String(Date.now() - 10_000) };

  it('sends one email via Resend with reply_to, sends no auto-reply, and stores no message body', async () => {
    const calls: any[] = [];
    global.fetch = vi.fn(async (url: any, init: any) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response('{"id":"x"}', { status: 200 }); }) as any;
    const kv = memoryKV();
    const res = await post(base, { RESEND_API_KEY: 'k', NEWSLETTER_KV: kv });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].body.to).toEqual(['sebastian.gedda@gmail.com']);
    expect(calls[0].body.reply_to).toBe('ada@example.com');
    for (const p of kv.puts) expect(p.value).not.toContain('license');
  });

  it('silently drops honeypot submissions', async () => {
    global.fetch = vi.fn() as any;
    const res = await post({ ...base, website: 'http://spam' }, { RESEND_API_KEY: 'k', NEWSLETTER_KV: memoryKV() });
    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects too-fast submissions and invalid data without sending', async () => {
    global.fetch = vi.fn() as any;
    expect((await post({ ...base, startTime: String(Date.now()) }, { RESEND_API_KEY: 'k' })).status).toBe(400);
    expect((await post({ ...base, email: 'bad' }, { RESEND_API_KEY: 'k' })).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as any;
    const kv = memoryKV();
    kv.store.set('contact-rate:9.9.9.9', JSON.stringify({ count: CONTACT_RATE_LIMIT_MAX, resetAt: Date.now() + 60_000 }));
    expect((await post(base, { RESEND_API_KEY: 'k', NEWSLETTER_KV: kv })).status).toBe(429);
  });

  it('requires a Turnstile token only when both TURNSTILE_SECRET and PUBLIC_TURNSTILE_SITE_KEY are set', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as any;
    expect((await post(base, { RESEND_API_KEY: 'k', TURNSTILE_SECRET: 's', PUBLIC_TURNSTILE_SITE_KEY: 'p' })).status).toBe(400);
    expect((await post(base, { RESEND_API_KEY: 'k', TURNSTILE_SECRET: 's' })).status).toBe(200);
    expect((await post(base, { RESEND_API_KEY: 'k', PUBLIC_TURNSTILE_SITE_KEY: 'p' })).status).toBe(200);
  });

  it('returns 503 when Resend is not configured', async () => {
    expect((await post(base, {})).status).toBe(503);
  });
});
