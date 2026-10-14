import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyUnsubscribeToken } from '../lib/newsletter-utils';

interface Env {
  RESEND_API_KEY: string;
  NEWSLETTER_SECRET: string;
  NEWSLETTER_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.redirect(new URL('/newsletter/unsubscribed', url.origin).toString(), 302);
  }

  try {
    const email = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    
    if (!email) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    // Update contact to mark as unsubscribed
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
