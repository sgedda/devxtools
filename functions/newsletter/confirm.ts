import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyToken } from '../lib/newsletter-utils';

interface Env {
  RESEND_API_KEY: string;
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
    const email = await verifyToken(token, env.NEWSLETTER_SECRET, true);
    
    if (!email) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    // Check if confirmation is still valid (if KV is available)
    if (env.NEWSLETTER_KV) {
      const pending = await env.NEWSLETTER_KV.get(`pending:${email}`);
      if (!pending) {
        // Already confirmed or expired
        return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
      }
    }

    // Update contact to mark as subscribed
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

    // Add contact to segment
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

    // Only remove pending entry after both API calls succeed
    if (env.NEWSLETTER_KV) {
      await env.NEWSLETTER_KV.delete(`pending:${email}`);
    }

    return Response.redirect(new URL('/newsletter/confirmed', url.origin).toString(), 302);

  } catch (error) {
    console.error('Newsletter confirmation error:', error);
    return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
  }
};
