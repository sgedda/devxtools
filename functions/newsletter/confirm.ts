import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyUnsubscribeToken, generateUnsubscribeToken } from '../lib/newsletter-utils';

interface Env {
  RESEND_API_KEY: string;
  NEWSLETTER_FROM_EMAIL: string;
  NEWSLETTER_SEGMENT_ID: string;
  NEWSLETTER_SECRET: string;
  NEWSLETTER_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }

  try {
    const [tokenId] = token.split('.');
    
    if (!tokenId || !env.NEWSLETTER_KV) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    const pendingData = await env.NEWSLETTER_KV.get(`confirm:${tokenId}`);
    if (!pendingData) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    const verifiedEmail = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    if (!verifiedEmail) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Subscription - DevX Tools</title>
  <meta name="robots" content="noindex">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #e6edf3;
      background: #0d1117;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container { width: 100%; max-width: 1200px; margin: 0 auto; }
    .message-card {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 3rem 2rem;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      background: rgba(88, 166, 255, 0.1);
      color: #58a6ff;
      border: 2px solid #58a6ff;
    }
    h1 {
      margin-bottom: 1rem;
      color: #e6edf3;
      font-size: 2rem;
    }
    .lead {
      font-size: 1.25rem;
      color: #e6edf3;
      margin-bottom: 1rem;
    }
    p {
      color: #8b949e;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    .confirm-form {
      margin-top: 2rem;
      margin-bottom: 1.5rem;
    }
    .button {
      display: inline-block;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 500;
      color: #fff;
      background: #238636;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
    }
    .button:hover {
      background: #2ea043;
    }
    .note {
      font-size: 0.875rem;
      color: #6e7681;
      margin-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="message-card">
      <div class="icon">📧</div>
      <h1>Confirm Your Subscription</h1>
      <p class="lead">
        You're almost there! Click the button below to complete your subscription to the DevX Tools newsletter.
      </p>
      <p>
        By confirming, you'll receive occasional emails about new guides, comparisons, and developer tools. 
        You can unsubscribe at any time.
      </p>
      <form method="POST" action="/newsletter/confirm" class="confirm-form">
        <input type="hidden" name="token" value="${token}" />
        <button type="submit" class="button">
          Confirm Subscription
        </button>
      </form>
      <p class="note">
        If you didn't sign up for this newsletter, you can safely ignore this page.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  let token: string | null = null;

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      token = formData.get('token') as string;
    } else if (contentType.includes('application/json')) {
      const body = await request.json() as any;
      token = body.token;
    }
  } catch (error) {
    console.error('Failed to parse request body:', error);
  }

  if (!token) {
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }

  try {
    const [tokenId] = token.split('.');
    
    if (!tokenId || !env.NEWSLETTER_KV) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    const pendingData = await env.NEWSLETTER_KV.get(`confirm:${tokenId}`);
    if (!pendingData) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    let email: string;
    let attribution: { page?: string | null; placement?: string | null } = {};
    
    try {
      const pending = JSON.parse(pendingData);
      email = pending.email;
      attribution = pending.attribution || {};
      
      if (!email) {
        throw new Error('No email in pending data');
      }
    } catch (error) {
      console.error('Failed to parse pending confirmation data:', error);
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    const verifiedEmail = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    if (!verifiedEmail) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    await env.NEWSLETTER_KV.delete(`confirm:${tokenId}`);
    await env.NEWSLETTER_KV.delete(`unsubscribe:${tokenId}`);

    const createResponse = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    });

    if (!createResponse.ok) {
      const createData = await createResponse.json() as any;
      
      if (createData.message === 'Contact already exists.') {
        const updateResponse = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            unsubscribed: false,
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update contact subscription status');
          throw new Error('Failed to update contact subscription status');
        }
      } else {
        console.error('Failed to create contact:', createData);
        throw new Error('Failed to create contact');
      }
    }

    const segmentId = env.NEWSLETTER_SEGMENT_ID || '31d28ce6-349c-4504-9dcf-65ad1562666f';
    const segmentResponse = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${segmentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!segmentResponse.ok) {
      const segmentError = await segmentResponse.json();
      console.error('Failed to add contact to segment:', segmentError);
      throw new Error('Failed to add contact to segment');
    }

    if (env.NEWSLETTER_KV && (attribution.page || attribution.placement)) {
      await env.NEWSLETTER_KV.put(
        `attribution:${email}`,
        JSON.stringify({
          email,
          page: attribution.page || null,
          placement: attribution.placement || null,
          confirmedAt: Date.now(),
        })
      );
    }

    const unsubscribeToken = await generateUnsubscribeToken(
      email,
      env.NEWSLETTER_SECRET,
      env.NEWSLETTER_KV
    );
    const welcomeUnsubscribeUrl = new URL('/newsletter/unsubscribe', url.origin);
    welcomeUnsubscribeUrl.searchParams.set('token', unsubscribeToken);

    const fromEmail = env.NEWSLETTER_FROM_EMAIL || 'newsletter@devxtools.dev';
    
    console.log(`[NEWSLETTER] Sending welcome email to ${email} from ${fromEmail}`);
    
    const welcomeEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Welcome to DevX Tools!',
        headers: {
          'List-Unsubscribe': `<${welcomeUnsubscribeUrl.toString()}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        html: `
          <p>Hi there,</p>
          <p>Thanks for confirming your subscription to the DevX Tools newsletter! 🎉</p>
          <p>You'll now receive updates about developer experience tools, comparisons, and guides straight to your inbox.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            Not interested anymore? <a href="${welcomeUnsubscribeUrl.toString()}">Unsubscribe here</a>.
          </p>
        `,
      }),
    });

    if (!welcomeEmailResponse.ok) {
      const welcomeError = await welcomeEmailResponse.json();
      console.error(`[NEWSLETTER] CRITICAL: Failed to send welcome email to ${email}:`, JSON.stringify(welcomeError));
      console.error(`[NEWSLETTER] Response status: ${welcomeEmailResponse.status}`);
    } else {
      const welcomeResult = await welcomeEmailResponse.json();
      console.log(`[NEWSLETTER] Welcome email sent successfully to ${email}:`, welcomeResult);
    }

    return Response.redirect(new URL('/newsletter/confirmed', url.origin).toString(), 302);

  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }
};
