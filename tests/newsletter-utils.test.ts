import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateEmail,
  checkHoneypot,
  checkRateLimit,
  generateToken,
  verifyToken,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  parseRequestBody,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  TOKEN_MAX_AGE,
} from '../functions/lib/newsletter-utils';

describe('Newsletter Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toEqual({ valid: true });
      expect(validateEmail('user+tag@domain.co.uk')).toEqual({ valid: true });
      expect(validateEmail('name.surname@company.com')).toEqual({ valid: true });
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toEqual({
        valid: false,
        error: 'Please enter a valid email address',
      });
      expect(validateEmail('missing@domain')).toEqual({
        valid: false,
        error: 'Please enter a valid email address',
      });
      expect(validateEmail('@example.com')).toEqual({
        valid: false,
        error: 'Please enter a valid email address',
      });
    });

    it('should reject missing or non-string values', () => {
      expect(validateEmail(null)).toEqual({
        valid: false,
        error: 'Email is required',
      });
      expect(validateEmail(undefined)).toEqual({
        valid: false,
        error: 'Email is required',
      });
      expect(validateEmail(123 as any)).toEqual({
        valid: false,
        error: 'Email is required',
      });
    });
  });

  describe('checkHoneypot', () => {
    it('should return true if honeypot is filled', () => {
      expect(checkHoneypot('bot-value')).toBe(true);
      expect(checkHoneypot('spam')).toBe(true);
    });

    it('should return false if honeypot is empty', () => {
      expect(checkHoneypot('')).toBe(false);
      expect(checkHoneypot(null)).toBe(false);
      expect(checkHoneypot(undefined)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    let mockRateLimiter: DurableObjectNamespace;
    let mockStub: any;

    beforeEach(() => {
      mockStub = {
        fetch: vi.fn(),
      };

      mockRateLimiter = {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue(mockStub),
      } as any;
    });

    it('should allow request when rate limiter is not available', async () => {
      const result = await checkRateLimit(undefined, '1.2.3.4');
      expect(result).toEqual({ allowed: true });
    });

    it('should allow first request', async () => {
      mockStub.fetch.mockResolvedValue(
        new Response(JSON.stringify({ allowed: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      
      const result = await checkRateLimit(mockRateLimiter, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockRateLimiter.idFromName).toHaveBeenCalledWith('1.2.3.4');
      expect(mockStub.fetch).toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      mockStub.fetch.mockResolvedValue(
        new Response(JSON.stringify({ allowed: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      
      const result = await checkRateLimit(mockRateLimiter, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
    });

    it('should block requests exceeding rate limit', async () => {
      mockStub.fetch.mockResolvedValue(
        new Response(JSON.stringify({ 
          allowed: false, 
          error: 'Too many requests. Please try again later.' 
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      
      const result = await checkRateLimit(mockRateLimiter, '1.2.3.4');
      
      expect(result).toEqual({
        allowed: false,
        error: 'Too many requests. Please try again later.',
      });
    });

    it('should handle Durable Object errors gracefully', async () => {
      mockStub.fetch.mockRejectedValue(new Error('DO error'));
      
      const result = await checkRateLimit(mockRateLimiter, '1.2.3.4');
      
      // Should fail open (allow request) on error
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('generateToken and verifyToken', () => {
    const secret = 'test-secret-key';
    const email = 'test@example.com';

    it('should generate and verify a valid token', async () => {
      const token = await generateToken(email, secret);
      
      expect(token).toBeTruthy();
      expect(token).toContain('.');
      
      const verifiedEmail = await verifyToken(token, secret, false);
      expect(verifiedEmail).toBe(email);
    });

    it('should reject token with wrong secret', async () => {
      const token = await generateToken(email, secret);
      const verifiedEmail = await verifyToken(token, 'wrong-secret', false);
      
      expect(verifiedEmail).toBeNull();
    });

    it('should reject expired token when checkAge is true', async () => {
      const token = await generateToken(email, secret);
      
      // Fast-forward time by mocking Date.now
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + TOKEN_MAX_AGE + 1000);
      
      const verifiedEmail = await verifyToken(token, secret, true);
      expect(verifiedEmail).toBeNull();
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should accept expired token when checkAge is false', async () => {
      const token = await generateToken(email, secret);
      
      // Fast-forward time
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + TOKEN_MAX_AGE + 1000);
      
      const verifiedEmail = await verifyToken(token, secret, false);
      expect(verifiedEmail).toBe(email);
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should reject malformed token', async () => {
      expect(await verifyToken('invalid-token', secret, false)).toBeNull();
      expect(await verifyToken('no.signature.parts.here', secret, false)).toBeNull();
      expect(await verifyToken('', secret, false)).toBeNull();
    });

    it('should reject token with invalid base64', async () => {
      const verifiedEmail = await verifyToken('!!!invalid!!!.abcd1234', secret, false);
      expect(verifiedEmail).toBeNull();
    });
  });

  describe('generateUnsubscribeToken and verifyUnsubscribeToken', () => {
    const secret = 'test-secret-key';
    const email = 'test@example.com';
    let mockKV: KVNamespace;

    beforeEach(() => {
      mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;
    });

    it('should generate and verify a valid unsubscribe token with KV', async () => {
      const token = await generateUnsubscribeToken(email, secret, mockKV);
      
      expect(token).toBeTruthy();
      expect(token).toContain('.');
      expect(mockKV.put).toHaveBeenCalled();

      const [tokenId] = token.split('.');
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ email, createdAt: Date.now() })
      );

      const verifiedEmail = await verifyUnsubscribeToken(token, secret, mockKV);
      expect(verifiedEmail).toBe(email);
      expect(mockKV.get).toHaveBeenCalledWith(`unsubscribe:${tokenId}`);
    });

    it('should generate token without KV but fail verification without KV', async () => {
      const token = await generateUnsubscribeToken(email, secret, undefined);
      
      expect(token).toBeTruthy();
      expect(token).toContain('.');

      const verifiedEmail = await verifyUnsubscribeToken(token, secret, undefined);
      expect(verifiedEmail).toBeNull();
    });

    it('should reject unsubscribe token with wrong secret', async () => {
      const token = await generateUnsubscribeToken(email, secret, mockKV);
      
      const [tokenId] = token.split('.');
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ email, createdAt: Date.now() })
      );

      const verifiedEmail = await verifyUnsubscribeToken(token, 'wrong-secret', mockKV);
      expect(verifiedEmail).toBeNull();
    });

    it('should reject unsubscribe token that does not exist in KV', async () => {
      const token = await generateUnsubscribeToken(email, secret, mockKV);
      
      (mockKV.get as any).mockResolvedValue(null);

      const verifiedEmail = await verifyUnsubscribeToken(token, secret, mockKV);
      expect(verifiedEmail).toBeNull();
    });

    it('should reject malformed unsubscribe token', async () => {
      (mockKV.get as any).mockResolvedValue(null);

      expect(await verifyUnsubscribeToken('invalid-token', secret, mockKV)).toBeNull();
      expect(await verifyUnsubscribeToken('no-signature', secret, mockKV)).toBeNull();
      expect(await verifyUnsubscribeToken('', secret, mockKV)).toBeNull();
    });

    it('should not expire unsubscribe tokens (long-lived)', async () => {
      const token = await generateUnsubscribeToken(email, secret, mockKV);
      
      const [tokenId] = token.split('.');
      const oldTimestamp = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 year ago
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ email, createdAt: oldTimestamp })
      );

      const verifiedEmail = await verifyUnsubscribeToken(token, secret, mockKV);
      expect(verifiedEmail).toBe(email);
    });
  });

  describe('parseRequestBody', () => {
    it('should parse JSON request body', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', consent: true, website: '' }),
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        email: 'test@example.com',
        consent: true,
        website: '',
      });
    });

    it('should parse form data request body', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('consent', 'true');
      formData.append('website', '');

      const request = new Request('https://example.com', {
        method: 'POST',
        body: formData,
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        email: 'test@example.com',
        consent: true,
        website: '',
        page: null,
        placement: null,
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const result = await parseRequestBody(request);
      expect(result).toBeNull();
    });

    it('should handle missing fields in JSON', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        email: 'test@example.com',
        consent: undefined,
        website: undefined,
      });
    });

    it('should handle JSON with incorrect types', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 123, consent: 'yes' }),
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        email: 123,
        consent: 'yes',
        website: undefined,
      });
    });
  });
});
