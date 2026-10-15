import type { PagesFunction } from '@cloudflare/workers-types';
import {
  validateSubmission,
  checkHoneypot,
  checkSubmissionRateLimit,
  checkMinimumFillTime,
  generateYAMLStub,
  parseRequestBody,
  escapeHtml,
} from '../lib/submission-utils';

interface Env {
  NEWSLETTER_KV: KVNamespace;
  TURNSTILE_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitResult = await checkSubmissionRateLimit(env.NEWSLETTER_KV, clientIP);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await parseRequestBody(request);
    
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { honeypot, startTime, turnstileToken, ...submissionData } = body;

    // Honeypot check
    if (checkHoneypot(honeypot)) {
      return new Response(
        JSON.stringify({ 
          message: 'Thank you for your submission! We will review it shortly.' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Minimum fill time check
    if (typeof startTime === 'number' && !checkMinimumFillTime(startTime, Date.now())) {
      return new Response(
        JSON.stringify({ error: 'Please take your time to fill out the form.' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Turnstile verification (if enabled)
    if (env.TURNSTILE_SECRET && turnstileToken) {
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: clientIP,
        }),
      });

      const turnstileResult = await turnstileResponse.json() as { success: boolean };
      if (!turnstileResult.success) {
        return new Response(
          JSON.stringify({ error: 'Verification failed. Please try again.' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Validate submission data
    const validation = validateSubmission(submissionData);
    if (!validation.valid || !validation.data) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const yamlStub = generateYAMLStub(validation.data);

    // Store submission in KV
    if (env.NEWSLETTER_KV) {
      await env.NEWSLETTER_KV.put(
        `submission:${timestamp}:${id}`,
        JSON.stringify({
          ...validation.data,
          timestamp,
          id,
          ip: clientIP,
          yamlStub,
        }),
        { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Thank you for your submission! We will review it and get back to you via email.',
        id,
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Submission error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
