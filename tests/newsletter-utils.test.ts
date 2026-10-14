import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateEmail,
  checkHoneypot,
  checkRateLimit,
  generateToken,
  verifyToken,
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
    let mockKV: KVNamespace;

    beforeEach(() => {
      mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;
    });

    it('should allow request when KV is not available', async () => {
      const result = await checkRateLimit(undefined, '1.2.3.4');
      expect(result).toEqual({ allowed: true });
    });

    it('should allow first request', async () => {
      (mockKV.get as any).mockResolvedValue(null);
      
      const result = await checkRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.get).toHaveBeenCalledWith('rate:1.2.3.4');
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMIT_WINDOW;
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: 1, resetAt })
      );
      
      const result = await checkRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMIT_WINDOW;
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: RATE_LIMIT_MAX, resetAt })
      );
      
      const result = await checkRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({
        allowed: false,
        error: 'Too many requests. Please try again later.',
      });
    });

    it('should reset counter after window expires', async () => {
      const now = Date.now();
      const resetAt = now - 1000; // Expired
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: RATE_LIMIT_MAX, resetAt })
      );
      
      const result = await checkRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.put).toHaveBeenCalled();
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
});
