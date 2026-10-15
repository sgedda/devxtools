/**
 * Security tests for newsletter handlers
 * 
 * Tests for:
 * 1. Reflected XSS prevention (token validation and HTML escaping)
 * 2. RFC 8058 one-click unsubscribe (token in query string)
 * 3. GET handlers making zero fetch calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Newsletter Security Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('XSS Prevention', () => {
    it('rejects token with XSS payload in GET confirm', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const xssToken = 'abc123"><script>alert("xss")</script><input type="hidden" value="';
      const request = new Request(`https://example.com/newsletter/confirm?token=${encodeURIComponent(xssToken)}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });

    it('rejects token with invalid format (missing HMAC)', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const invalidToken = '12345678-1234-1234-1234-123456789abc';
      const request = new Request(`https://example.com/newsletter/confirm?token=${invalidToken}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });

    it('rejects token with extra content after second dot', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const malformedToken = '12345678-1234-1234-1234-123456789abc.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.extradata';
      const request = new Request(`https://example.com/newsletter/confirm?token=${malformedToken}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });

    it('HTML-escapes token in rendered page', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const token = await generateUnsubscribeToken('test@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'test@example.com',
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'test@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const request = new Request(`https://example.com/newsletter/confirm?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);
      const html = await response.text();

      expect(html).not.toContain('<script>');
      expect(html).toContain('value=');
    });

    it('rejects malformed token in POST confirm', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { onRequestPost } = await import('../functions/newsletter/confirm');

      const formData = new FormData();
      formData.append('token', 'invalid-token-format');
      const request = new Request('https://example.com/newsletter/confirm', {
        method: 'POST',
        body: formData,
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestPost(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });

    it('rejects XSS token in GET unsubscribe', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
      };

      const { onRequestGet } = await import('../functions/newsletter/unsubscribe');

      const xssToken = '"><img src=x onerror=alert(1)><"';
      const request = new Request(`https://example.com/newsletter/unsubscribe?token=${encodeURIComponent(xssToken)}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });

    it('rejects malformed token in POST unsubscribe', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
      };

      const { onRequestPost } = await import('../functions/newsletter/unsubscribe');

      const formData = new FormData();
      formData.append('token', 'malformed');
      const request = new Request('https://example.com/newsletter/unsubscribe', {
        method: 'POST',
        body: formData,
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestPost(context);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/newsletter/expired/');
    });
  });

  describe('RFC 8058 One-Click Unsubscribe', () => {
    it('POST unsubscribe with token in query string unsubscribes contact', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const token = await generateUnsubscribeToken('subscriber@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'subscriber@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      let unsubscribeCalled = false;
      global.fetch = vi.fn((url: string | URL | Request, options?: any) => {
        const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
        
        if (urlStr.includes('api.resend.com/contacts/') && options?.method === 'PATCH') {
          const body = JSON.parse(options.body);
          expect(body.unsubscribed).toBe(true);
          unsubscribeCalled = true;
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }) as any;

      const { onRequestPost } = await import('../functions/newsletter/unsubscribe');

      const request = new Request(`https://example.com/newsletter/unsubscribe?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'List-Unsubscribe=One-Click',
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestPost(context);

      expect(unsubscribeCalled).toBe(true);
      expect(response.status).toBe(200);
    });

    it('POST unsubscribe prefers query string token over form body token', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const correctToken = await generateUnsubscribeToken('correct@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'correct@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      global.fetch = vi.fn((url: string | URL | Request, options?: any) => {
        const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
        
        if (urlStr.includes('api.resend.com/contacts/') && options?.method === 'PATCH') {
          expect(urlStr).toContain('correct@example.com');
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }) as any;

      const { onRequestPost } = await import('../functions/newsletter/unsubscribe');

      const formData = new FormData();
      formData.append('token', 'wrong-token');
      const request = new Request(`https://example.com/newsletter/unsubscribe?token=${correctToken}`, {
        method: 'POST',
        body: formData,
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestPost(context);
    });
  });

  describe('GET Handlers Make Zero Fetch Calls', () => {
    it('GET confirm makes zero fetch calls', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
        NEWSLETTER_FROM_EMAIL: 'test@example.com',
        NEWSLETTER_SEGMENT_ID: 'test-segment',
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const token = await generateUnsubscribeToken('test@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'test@example.com',
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'test@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      let fetchCalled = false;
      global.fetch = vi.fn(() => {
        fetchCalled = true;
        return Promise.resolve(new Response('Should not be called', { status: 500 }));
      }) as any;

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const request = new Request(`https://example.com/newsletter/confirm?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestGet(context);

      expect(fetchCalled).toBe(false);
    });

    it('GET unsubscribe makes zero fetch calls', async () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;

      const mockEnv = {
        NEWSLETTER_SECRET: 'test-secret',
        NEWSLETTER_KV: mockKV,
        RESEND_API_KEY: 'test-key',
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const token = await generateUnsubscribeToken('test@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'test@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      let fetchCalled = false;
      global.fetch = vi.fn(() => {
        fetchCalled = true;
        return Promise.resolve(new Response('Should not be called', { status: 500 }));
      }) as any;

      const { onRequestGet } = await import('../functions/newsletter/unsubscribe');

      const request = new Request(`https://example.com/newsletter/unsubscribe?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestGet(context);

      expect(fetchCalled).toBe(false);
    });
  });

  describe('Token Format Validation', () => {
    it('validateTokenFormat accepts valid UUID.HMAC format', async () => {
      const { validateTokenFormat } = await import('../functions/lib/newsletter-utils');
      
      const validToken = '12345678-1234-1234-1234-123456789abc.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      expect(validateTokenFormat(validToken)).toBe(true);
    });

    it('validateTokenFormat rejects token without HMAC', async () => {
      const { validateTokenFormat } = await import('../functions/lib/newsletter-utils');
      
      const invalidToken = '12345678-1234-1234-1234-123456789abc';
      
      expect(validateTokenFormat(invalidToken)).toBe(false);
    });

    it('validateTokenFormat rejects token with short HMAC', async () => {
      const { validateTokenFormat } = await import('../functions/lib/newsletter-utils');
      
      const invalidToken = '12345678-1234-1234-1234-123456789abc.abc123';
      
      expect(validateTokenFormat(invalidToken)).toBe(false);
    });

    it('validateTokenFormat rejects token with extra dots', async () => {
      const { validateTokenFormat } = await import('../functions/lib/newsletter-utils');
      
      const invalidToken = '12345678-1234-1234-1234-123456789abc.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.extra';
      
      expect(validateTokenFormat(invalidToken)).toBe(false);
    });

    it('validateTokenFormat rejects non-string input', async () => {
      const { validateTokenFormat } = await import('../functions/lib/newsletter-utils');
      
      expect(validateTokenFormat(null)).toBe(false);
      expect(validateTokenFormat(undefined)).toBe(false);
      expect(validateTokenFormat(123)).toBe(false);
      expect(validateTokenFormat({})).toBe(false);
    });
  });

  describe('HTML Escaping', () => {
    it('escapeHtml escapes all dangerous characters', async () => {
      const { escapeHtml } = await import('../functions/lib/newsletter-utils');
      
      const dangerous = '<script>alert("xss")</script>';
      const escaped = escapeHtml(dangerous);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
    });

    it('escapeHtml handles all special characters', async () => {
      const { escapeHtml } = await import('../functions/lib/newsletter-utils');
      
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#039;');
    });
  });
});
