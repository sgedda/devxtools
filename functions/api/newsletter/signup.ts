import type { PagesFunction } from '@cloudflare/workers-types';
import {
  validateEmail,
  checkHoneypot,
  checkRateLimit,
  generateToken,
  generateUnsubscribeToken,
  parseRequestBody,
} from '../../lib/newsletter-utils';

interface Env {
  RESEND_API_KEY: string;
  NEWSLETTER_FROM_EMAIL: string;
  NEWSLETTER_SEGMENT_ID: string;
  NEWSLETTER_SECRET: string;
  NEWSLETTER_KV: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Rate limiting (best-effort KV, primary protection is WAF rule)
    // See CLOUDFLARE_SETUP.md for WAF configuration
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitResult = await checkRateLimit(env.NEWSLETTER_KV, clientIP);
    
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
    
    const { email, website: honeypot, page, placement } = body;

    // Honeypot check - silently accept but don't process
    if (checkHoneypot(honeypot)) {
      return new Response(
        JSON.stringify({ 
          message: 'Check your email to confirm your subscription!' 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // CRITICAL: Make ZERO writes to Resend contacts during signup
    // - New contacts: don't create until confirmation
    // - Existing contacts: don't modify (prevents malicious unsubscribe)
    // - Only confirm handler can set unsubscribed:false or add to segment
    // - Only unsubscribe handler can set unsubscribed:true
    
    // Generate confirmation token (opaque, single-use, stored in KV with 24h TTL)
    const confirmToken = await generateUnsubscribeToken(
      email,
      env.NEWSLETTER_SECRET,
      env.NEWSLETTER_KV
    );
    const confirmUrl = new URL('/newsletter/confirm', request.url);
    confirmUrl.searchParams.set('token', confirmToken);

    // Store pending confirmation keyed by token (not email) with 24h TTL
    // This allows us to look it up during confirmation without exposing the email
    const [tokenId] = confirmToken.split('.');
    if (env.NEWSLETTER_KV && tokenId) {
      await env.NEWSLETTER_KV.put(
        `confirm:${tokenId}`,
        JSON.stringify({ 
          email, 
          timestamp: Date.now(),
          attribution: {
            page: page || null,
            placement: placement || null,
          }
        }),
        { expirationTtl: 86400 }
      );
    }

    // Send confirmation email via Resend /emails API
    const fromEmail = env.NEWSLETTER_FROM_EMAIL || 'newsletter@devxtools.dev';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Confirm your DevX Tools newsletter subscription',
        html: `
          <p>Hi there,</p>
          <p>Thanks for signing up for the DevX Tools newsletter! Please confirm your subscription by clicking the link below:</p>
          <p><a href="${confirmUrl.toString()}" style="display: inline-block; padding: 12px 24px; background-color: #58a6ff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Confirm Subscription</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="font-size: 14px; color: #666;">${confirmUrl.toString()}</p>
          <p style="margin-top: 24px; font-size: 14px; color: #666;">This link will expire in 24 hours.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            If you didn't sign up for this newsletter, you can safely ignore this email.
          </p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json();
      console.error('Resend email send failed:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send confirmation email. Please try again.' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Check your email to confirm your subscription!' 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Newsletter signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
