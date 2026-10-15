import { ToolCategory } from '../../src/lib/schema';

export interface SubmissionData {
  toolName: string;
  url: string;
  repoUrl: string;
  category: ToolCategory;
  pricing: string;
  description: string;
  email: string;
  isMaintainer: boolean;
  mode?: 'claim' | 'add';
  existingSlug?: string;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const SUBMISSION_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
export const SUBMISSION_RATE_LIMIT_MAX = 5; // 5 requests per hour

export function validateSubmission(data: unknown): { valid: boolean; error?: string; data?: SubmissionData } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request data' };
  }

  const submission = data as Record<string, unknown>;

  // Validate tool name
  if (!submission.toolName || typeof submission.toolName !== 'string' || submission.toolName.trim().length === 0) {
    return { valid: false, error: 'Tool name is required' };
  }
  if (submission.toolName.trim().length > 100) {
    return { valid: false, error: 'Tool name must be 100 characters or less' };
  }

  // Validate URL
  if (!submission.url || typeof submission.url !== 'string') {
    return { valid: false, error: 'Website URL is required' };
  }
  try {
    const url = new URL(submission.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Website URL must use HTTP or HTTPS' };
    }
  } catch {
    return { valid: false, error: 'Website URL is invalid' };
  }

  // Validate repo URL (optional but must be valid if provided)
  if (submission.repoUrl && typeof submission.repoUrl === 'string' && submission.repoUrl.trim().length > 0) {
    try {
      const repoUrl = new URL(submission.repoUrl);
      if (!['http:', 'https:'].includes(repoUrl.protocol)) {
        return { valid: false, error: 'Repository URL must use HTTP or HTTPS' };
      }
    } catch {
      return { valid: false, error: 'Repository URL is invalid' };
    }
  }

  // Validate category
  const validCategories: ToolCategory[] = [
    'http-interception',
    'mock-server',
    'spec-based-mocking',
    'contract-testing',
    'test-data-generation',
    'hosted-mocks',
    'record-replay',
    'api-client',
    'openapi-tooling',
    'sdk-generator',
    'e2e-testing',
    'load-testing',
    'error-monitoring',
    'distributed-tracing',
    'log-aggregation',
    'application-logging',
    'network-debugging',
  ];
  
  if (!submission.category || !validCategories.includes(submission.category as ToolCategory)) {
    return { valid: false, error: 'Valid category is required' };
  }

  // Validate pricing
  if (!submission.pricing || typeof submission.pricing !== 'string' || submission.pricing.trim().length === 0) {
    return { valid: false, error: 'Pricing information is required' };
  }
  if (submission.pricing.trim().length > 100) {
    return { valid: false, error: 'Pricing must be 100 characters or less' };
  }

  // Validate description
  if (!submission.description || typeof submission.description !== 'string' || submission.description.trim().length === 0) {
    return { valid: false, error: 'Description is required' };
  }
  if (submission.description.trim().length > 280) {
    return { valid: false, error: 'Description must be 280 characters or less' };
  }

  // Validate email
  if (!submission.email || typeof submission.email !== 'string') {
    return { valid: false, error: 'Contact email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(submission.email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Validate isMaintainer checkbox
  if (typeof submission.isMaintainer !== 'boolean') {
    return { valid: false, error: 'Maintainer confirmation is required' };
  }

  return {
    valid: true,
    data: {
      toolName: (submission.toolName as string).trim(),
      url: (submission.url as string).trim(),
      repoUrl: submission.repoUrl && typeof submission.repoUrl === 'string' ? (submission.repoUrl as string).trim() : '',
      category: submission.category as ToolCategory,
      pricing: (submission.pricing as string).trim(),
      description: (submission.description as string).trim(),
      email: (submission.email as string).trim(),
      isMaintainer: submission.isMaintainer as boolean,
      mode: submission.mode as 'claim' | 'add' | undefined,
      existingSlug: submission.existingSlug as string | undefined,
    },
  };
}

export function checkHoneypot(honeypot: unknown): boolean {
  return !!honeypot;
}

export async function checkSubmissionRateLimit(
  kv: KVNamespace | undefined,
  clientIP: string
): Promise<{ allowed: boolean; error?: string }> {
  if (!kv) {
    return { allowed: true };
  }

  try {
    const rateLimitKey = `submission-rate:${clientIP}`;
    const now = Date.now();
    
    const data = await kv.get(rateLimitKey);
    
    if (!data) {
      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: 1, resetAt: now + SUBMISSION_RATE_LIMIT_WINDOW }),
        { expirationTtl: 3600 }
      );
      return { allowed: true };
    }
    
    const { count, resetAt }: RateLimitEntry = JSON.parse(data);
    
    if (now >= resetAt) {
      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: 1, resetAt: now + SUBMISSION_RATE_LIMIT_WINDOW }),
        { expirationTtl: 3600 }
      );
      return { allowed: true };
    }
    
    if (count >= SUBMISSION_RATE_LIMIT_MAX) {
      return { 
        allowed: false, 
        error: 'Too many submissions. Please try again in an hour.' 
      };
    }
    
    await kv.put(
      rateLimitKey,
      JSON.stringify({ count: count + 1, resetAt }),
      { expirationTtl: Math.max(3600, Math.ceil((resetAt - now) / 1000)) }
    );
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    return { allowed: true };
  }
}

export function checkMinimumFillTime(startTime: number, now: number): boolean {
  const MIN_FILL_TIME = 3000; // 3 seconds
  return (now - startTime) >= MIN_FILL_TIME;
}

export function generateYAMLStub(data: SubmissionData): string {
  const slug = data.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const today = new Date().toISOString().split('T')[0];
  
  return `# Submission received: ${new Date().toISOString()}
# Mode: ${data.mode || 'add'}
${data.existingSlug ? `# Existing slug: ${data.existingSlug}` : ''}
# Contact: ${data.email}
# Is maintainer: ${data.isMaintainer}
# Pricing: ${data.pricing}

name: ${data.toolName}
slug: ${slug}
website: ${data.url}
${data.repoUrl ? `repo: ${data.repoUrl}` : '# repo: (not provided)'}
license: # TODO: Verify license
languages:
  - # TODO: Add languages
runtimes:
  - # TODO: Add runtimes
sections:
  - # TODO: Map category to section(s)
categories:
  - ${data.category}
specSupport: # optional
  - # TODO: Add spec support if applicable
bestFor: ${data.description}
description: # TODO: Expand description
whenToUse: # TODO: Add usage guidance
githubStars: # TODO: Fetch from GitHub API if applicable
lastActivity: # TODO: Fetch from GitHub API if applicable
npmPackage: # TODO: Add if applicable
weeklyDownloads: # TODO: Fetch if applicable
lastChecked: ${today}
affiliation: # TODO: Add if affiliated
`;
}

export async function parseRequestBody(
  request: Request
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get('content-type') || '';
  
  try {
    if (contentType.includes('application/json')) {
      return await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of formData.entries()) {
        if (key === 'isMaintainer') {
          result[key] = value === 'true' || value === 'on';
        } else if (key === 'startTime') {
          result[key] = parseInt(value as string, 10);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return null;
  }
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
