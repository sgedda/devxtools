import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateSubmission,
  checkHoneypot,
  checkSubmissionRateLimit,
  checkMinimumFillTime,
  generateYAMLStub,
  parseRequestBody,
  escapeHtml,
  SUBMISSION_RATE_LIMIT_MAX,
  SUBMISSION_RATE_LIMIT_WINDOW,
} from '../functions/lib/submission-utils';

describe('Submission Utilities', () => {
  describe('validateSubmission', () => {
    const validSubmission = {
      toolName: 'Test Tool',
      url: 'https://example.com',
      repoUrl: 'https://github.com/example/test',
      category: 'http-interception',
      pricing: 'Open Source',
      description: 'A test tool for testing',
      email: 'test@example.com',
      isMaintainer: true,
    };

    it('should validate a correct submission', () => {
      const result = validateSubmission(validSubmission);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.toolName).toBe('Test Tool');
    });

    it('should reject submission with missing tool name', () => {
      const result = validateSubmission({ ...validSubmission, toolName: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tool name is required');
    });

    it('should reject submission with tool name too long', () => {
      const result = validateSubmission({ ...validSubmission, toolName: 'a'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tool name must be 100 characters or less');
    });

    it('should reject submission with missing URL', () => {
      const result = validateSubmission({ ...validSubmission, url: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Website URL is required');
    });

    it('should reject submission with invalid URL', () => {
      const result = validateSubmission({ ...validSubmission, url: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Website URL is invalid');
    });

    it('should reject submission with non-HTTP URL', () => {
      const result = validateSubmission({ ...validSubmission, url: 'ftp://example.com' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Website URL must use HTTP or HTTPS');
    });

    it('should accept submission with empty repo URL', () => {
      const result = validateSubmission({ ...validSubmission, repoUrl: '' });
      expect(result.valid).toBe(true);
    });

    it('should reject submission with invalid repo URL', () => {
      const result = validateSubmission({ ...validSubmission, repoUrl: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Repository URL is invalid');
    });

    it('should reject submission with invalid category', () => {
      const result = validateSubmission({ ...validSubmission, category: 'invalid-category' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Valid category is required');
    });

    it('should reject submission with missing pricing', () => {
      const result = validateSubmission({ ...validSubmission, pricing: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Pricing information is required');
    });

    it('should reject submission with pricing too long', () => {
      const result = validateSubmission({ ...validSubmission, pricing: 'a'.repeat(101) });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Pricing must be 100 characters or less');
    });

    it('should reject submission with missing description', () => {
      const result = validateSubmission({ ...validSubmission, description: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should reject submission with description too long', () => {
      const result = validateSubmission({ ...validSubmission, description: 'a'.repeat(281) });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Description must be 280 characters or less');
    });

    it('should reject submission with invalid email', () => {
      const result = validateSubmission({ ...validSubmission, email: 'not-an-email' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject submission with missing isMaintainer', () => {
      const { isMaintainer, ...withoutCheckbox } = validSubmission;
      const result = validateSubmission(withoutCheckbox);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maintainer confirmation is required');
    });

    it('should trim whitespace from fields', () => {
      const result = validateSubmission({
        ...validSubmission,
        toolName: '  Test Tool  ',
        description: '  A test tool  ',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.toolName).toBe('Test Tool');
      expect(result.data?.description).toBe('A test tool');
    });

    it('should reject null or undefined submission', () => {
      expect(validateSubmission(null).valid).toBe(false);
      expect(validateSubmission(undefined).valid).toBe(false);
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

  describe('checkSubmissionRateLimit', () => {
    let mockKV: KVNamespace;

    beforeEach(() => {
      mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any;
    });

    it('should allow request when KV is not available', async () => {
      const result = await checkSubmissionRateLimit(undefined, '1.2.3.4');
      expect(result).toEqual({ allowed: true });
    });

    it('should allow first request', async () => {
      (mockKV.get as any).mockResolvedValue(null);
      
      const result = await checkSubmissionRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.get).toHaveBeenCalledWith('submission-rate:1.2.3.4');
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should allow requests within rate limit', async () => {
      const now = Date.now();
      const resetAt = now + SUBMISSION_RATE_LIMIT_WINDOW;
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: 1, resetAt })
      );
      
      const result = await checkSubmissionRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      const now = Date.now();
      const resetAt = now + SUBMISSION_RATE_LIMIT_WINDOW;
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: SUBMISSION_RATE_LIMIT_MAX, resetAt })
      );
      
      const result = await checkSubmissionRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({
        allowed: false,
        error: 'Too many submissions. Please try again in an hour.',
      });
    });

    it('should reset counter after window expires', async () => {
      const now = Date.now();
      const resetAt = now - 1000;
      
      (mockKV.get as any).mockResolvedValue(
        JSON.stringify({ count: SUBMISSION_RATE_LIMIT_MAX, resetAt })
      );
      
      const result = await checkSubmissionRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should handle KV errors gracefully', async () => {
      (mockKV.get as any).mockRejectedValue(new Error('KV error'));
      
      const result = await checkSubmissionRateLimit(mockKV, '1.2.3.4');
      
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('checkMinimumFillTime', () => {
    it('should return true if enough time has passed', () => {
      const startTime = Date.now() - 5000;
      const now = Date.now();
      expect(checkMinimumFillTime(startTime, now)).toBe(true);
    });

    it('should return false if not enough time has passed', () => {
      const startTime = Date.now() - 1000;
      const now = Date.now();
      expect(checkMinimumFillTime(startTime, now)).toBe(false);
    });

    it('should return true at exactly 3 seconds', () => {
      const startTime = Date.now() - 3000;
      const now = Date.now();
      expect(checkMinimumFillTime(startTime, now)).toBe(true);
    });
  });

  describe('generateYAMLStub', () => {
    it('should generate a valid YAML stub', () => {
      const data = {
        toolName: 'Test Tool',
        url: 'https://example.com',
        repoUrl: 'https://github.com/example/test',
        category: 'http-interception' as const,
        pricing: 'Open Source',
        description: 'A test tool',
        email: 'test@example.com',
        isMaintainer: true,
        mode: 'add' as const,
      };

      const yaml = generateYAMLStub(data);

      expect(yaml).toContain('name: Test Tool');
      expect(yaml).toContain('slug: test-tool');
      expect(yaml).toContain('website: https://example.com');
      expect(yaml).toContain('repo: https://github.com/example/test');
      expect(yaml).toContain('categories:');
      expect(yaml).toContain('- http-interception');
      expect(yaml).toContain('# Contact: test@example.com');
      expect(yaml).toContain('# Pricing: Open Source');
    });

    it('should handle missing repo URL', () => {
      const data = {
        toolName: 'Test Tool',
        url: 'https://example.com',
        repoUrl: '',
        category: 'http-interception' as const,
        pricing: 'Open Source',
        description: 'A test tool',
        email: 'test@example.com',
        isMaintainer: true,
      };

      const yaml = generateYAMLStub(data);

      expect(yaml).toContain('# repo: (not provided)');
    });

    it('should generate slug from tool name', () => {
      const data = {
        toolName: 'My Test Tool 123',
        url: 'https://example.com',
        repoUrl: '',
        category: 'http-interception' as const,
        pricing: 'Open Source',
        description: 'A test tool',
        email: 'test@example.com',
        isMaintainer: true,
      };

      const yaml = generateYAMLStub(data);

      expect(yaml).toContain('slug: my-test-tool-123');
    });

    it('should include existing slug when claiming', () => {
      const data = {
        toolName: 'Test Tool',
        url: 'https://example.com',
        repoUrl: '',
        category: 'http-interception' as const,
        pricing: 'Open Source',
        description: 'A test tool',
        email: 'test@example.com',
        isMaintainer: true,
        mode: 'claim' as const,
        existingSlug: 'old-slug',
      };

      const yaml = generateYAMLStub(data);

      expect(yaml).toContain('# Existing slug: old-slug');
    });
  });

  describe('parseRequestBody', () => {
    it('should parse JSON request body', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'Test Tool',
          email: 'test@example.com',
          isMaintainer: true,
        }),
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        toolName: 'Test Tool',
        email: 'test@example.com',
        isMaintainer: true,
      });
    });

    it('should parse form data request body', async () => {
      const formData = new FormData();
      formData.append('toolName', 'Test Tool');
      formData.append('email', 'test@example.com');
      formData.append('isMaintainer', 'true');
      formData.append('startTime', '1234567890');

      const request = new Request('https://example.com', {
        method: 'POST',
        body: formData,
      });

      const result = await parseRequestBody(request);
      expect(result).toEqual({
        toolName: 'Test Tool',
        email: 'test@example.com',
        isMaintainer: true,
        startTime: 1234567890,
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
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml('test & test')).toBe('test &amp; test');
      expect(escapeHtml("test's test")).toBe('test&#039;s test');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});
