import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyUnsubscribeToken, validateTokenFormat, escapeHtml } from '../lib/newsletter-utils';

interface Env {
  RESEND_API_KEY: string;
  NEWSLETTER_SECRET: string;
  NEWSLETTER_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token || !validateTokenFormat(token)) {
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }

  try {
    const email = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    
    if (!email) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    const escapedToken = escapeHtml(token);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - DevX Tools</title>
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
      background: rgba(210, 153, 34, 0.1);
      color: #d29922;
      border: 2px solid #d29922;
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
    .unsubscribe-form {
      margin-top: 2rem;
      margin-bottom: 1.5rem;
    }
    .button {
      display: inline-block;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 500;
      color: #fff;
      background: #d29922;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
    }
    .button:hover {
      opacity: 0.9;
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
      <div class="icon">✉</div>
      <h1>Unsubscribe from Newsletter</h1>
      <p class="lead">
        We're sorry to see you go.
      </p>
      <p>
        Click the button below to unsubscribe from the DevX Tools newsletter. 
        You won't receive any more emails from us.
      </p>
      <form method="POST" action="/newsletter/unsubscribe" class="unsubscribe-form">
        <input type="hidden" name="token" value="${escapedToken}" />
        <button type="submit" class="button">
          Confirm Unsubscribe
        </button>
      </form>
      <p class="note">
        Changed your mind? Just close this page.
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
    console.error('Newsletter unsubscribe error:', error);
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  let token: string | null = null;

  token = url.searchParams.get('token');

  if (!token) {
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
  }

  if (!token || !validateTokenFormat(token)) {
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }

  try {
    const email = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    
    if (!email) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    const updateResponse = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unsubscribed: true,
      }),
    });

    if (!updateResponse.ok) {
      console.error('Failed to unsubscribe contact');
    }

    return Response.redirect(new URL('/newsletter/unsubscribed', url.origin).toString(), 302);

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }
};
