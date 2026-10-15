/**
 * Regression tests for newsletter double opt-in scanner bug fix
 * 
 * Root cause: GET /newsletter/confirm?token=... was directly subscribing contacts,
 * so email security scanners (Gmail, Outlook Safe Links) that prefetch links
 * in the confirmation email would trigger subscriptions before a human clicked.
 * 
 * Fix: GET requests have NO side effects. Only POST requests perform subscriptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Newsletter Scanner Bug Regression Tests', () => {
  describe('CRITICAL: GET confirm must have NO side effects', () => {
    it('GET /newsletter/confirm?token=... makes zero Resend contact writes', async () => {
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

      expect(mockKV.delete).not.toHaveBeenCalled();
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('GET /newsletter/confirm?token=... does not consume single-use token', async () => {
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

      await onRequestGet(context);

      expect(mockKV.delete).not.toHaveBeenCalled();
    });

    it('Email scanner prefetch of confirm link does not subscribe contact', async () => {
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
      const token = await generateUnsubscribeToken('unsubscribed@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'unsubscribed@example.com',
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'unsubscribed@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const request = new Request(`https://example.com/newsletter/confirm?token=${token}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246 Microsoft Outlook 16.0',
        },
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestGet(context);

      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('CRITICAL: POST confirm performs subscription', () => {
    it('POST /newsletter/confirm with valid token subscribes and adds to segment exactly once', async () => {
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
      const token = await generateUnsubscribeToken('newuser@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'newuser@example.com',
            timestamp: Date.now(),
            attribution: { page: '/test', placement: 'footer' },
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'newuser@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      global.fetch = vi.fn((url: string | URL | Request, options?: any) => {
        const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
        
        if (urlStr.includes('api.resend.com/contacts') && options?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify({ id: 'contact-123' }), { status: 200 }));
        }
        if (urlStr.includes('api.resend.com/contacts/') && urlStr.includes('/segments/') && options?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        if (urlStr.includes('api.resend.com/emails') && options?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }));
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }) as any;

      const { onRequestPost } = await import('../functions/newsletter/confirm');

      const formData = new FormData();
      formData.append('token', token);
      const request = new Request('https://example.com/newsletter/confirm', {
        method: 'POST',
        body: formData,
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestPost(context);

      expect(mockKV.delete).toHaveBeenCalledWith(expect.stringContaining('confirm:'));
      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('attribution:'),
        expect.any(String)
      );
    });
  });

  describe('Production incident reproduction', () => {
    it('Existing unsubscribed contact + signup + GET confirm leaves contact unsubscribed', async () => {
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

      const existingContact = {
        id: 'de6654f5-97bc-4d32-a973-b777aa7e782e',
        email: 'victim@example.com',
        unsubscribed: true,
      };

      const { generateUnsubscribeToken } = await import('../functions/lib/newsletter-utils');
      const token = await generateUnsubscribeToken(existingContact.email, mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: existingContact.email,
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: existingContact.email,
            createdAt: Date.now(),
          });
        }
        return null;
      });

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const request = new Request(`https://example.com/newsletter/confirm?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestGet(context);

      expect(mockKV.delete).not.toHaveBeenCalled();
      expect(existingContact.unsubscribed).toBe(true);
    });

    it('Brand-new address + signup creates nothing in Resend until POST confirm', async () => {
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
      const token = await generateUnsubscribeToken('brandnew@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'brandnew@example.com',
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'brandnew@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      const { onRequestGet } = await import('../functions/newsletter/confirm');

      const request = new Request(`https://example.com/newsletter/confirm?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestGet(context);

      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET unsubscribe must have NO side effects', () => {
    it('GET /newsletter/unsubscribe?token=... makes zero Resend contact writes', async () => {
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

      const { onRequestGet } = await import('../functions/newsletter/unsubscribe');

      const request = new Request(`https://example.com/newsletter/unsubscribe?token=${token}`);
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      const response = await onRequestGet(context);

      expect(response.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('RFC 8058 List-Unsubscribe headers', () => {
    it('Welcome email includes List-Unsubscribe and List-Unsubscribe-Post headers', async () => {
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
      const token = await generateUnsubscribeToken('newuser@example.com', mockEnv.NEWSLETTER_SECRET, mockKV);

      (mockKV.get as any).mockImplementation(async (key: string) => {
        if (key.startsWith('confirm:')) {
          return JSON.stringify({
            email: 'newuser@example.com',
            timestamp: Date.now(),
            attribution: {},
          });
        }
        if (key.startsWith('unsubscribe:')) {
          return JSON.stringify({
            email: 'newuser@example.com',
            createdAt: Date.now(),
          });
        }
        return null;
      });

      let emailHeaders: any = null;

      global.fetch = vi.fn((url: string | URL | Request, options?: any) => {
        const urlStr = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
        
        if (urlStr.includes('api.resend.com/emails') && options?.method === 'POST') {
          const body = JSON.parse(options.body);
          emailHeaders = body.headers;
          return Promise.resolve(new Response(JSON.stringify({ id: 'email-123' }), { status: 200 }));
        }
        if (urlStr.includes('api.resend.com/contacts')) {
          return Promise.resolve(new Response(JSON.stringify({ id: 'contact-123' }), { status: 200 }));
        }
        return Promise.resolve(new Response('OK', { status: 200 }));
      }) as any;

      const { onRequestPost } = await import('../functions/newsletter/confirm');

      const formData = new FormData();
      formData.append('token', token);
      const request = new Request('https://example.com/newsletter/confirm', {
        method: 'POST',
        body: formData,
      });
      const context = { request, env: mockEnv, params: {}, waitUntil: vi.fn(), passThroughOnException: vi.fn() } as any;

      await onRequestPost(context);

      expect(emailHeaders).toBeDefined();
      expect(emailHeaders['List-Unsubscribe']).toBeDefined();
      expect(emailHeaders['List-Unsubscribe']).toContain('newsletter/unsubscribe');
      expect(emailHeaders['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });
  });
});
