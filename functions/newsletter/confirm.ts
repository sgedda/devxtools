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
    // Extract token ID to look up pending confirmation
    const [tokenId] = token.split('.');
    
    if (!tokenId || !env.NEWSLETTER_KV) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }
    
    // Retrieve pending confirmation data by token ID
    const pendingData = await env.NEWSLETTER_KV.get(`confirm:${tokenId}`);
    if (!pendingData) {
      // Already confirmed, expired, or invalid token
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
    
    // Verify token signature (defense in depth)
    const verifiedEmail = await verifyUnsubscribeToken(token, env.NEWSLETTER_SECRET, env.NEWSLETTER_KV);
    if (!verifiedEmail) {
      return Response.redirect(new URL('/newsletter/expired', url.origin).toString(), 302);
    }

    // Create contact as subscribed (this is the first time we create them in Resend)
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

    // If contact already exists, update them to mark as subscribed
    if (!createResponse.ok) {
      const createData = await createResponse.json() as any;
      
      if (createData.message === 'Contact already exists.') {
        // Contact exists, update their subscription status
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
    
    // Delete both the confirmation token and unsubscribe token mapping (single-use)
    // Only delete after all Resend operations succeed to allow retry on failure
    await env.NEWSLETTER_KV.delete(`confirm:${tokenId}`);
    await env.NEWSLETTER_KV.delete(`unsubscribe:${tokenId}`);

    // Store attribution for confirmed subscriber (pending already deleted above)
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

    // Send welcome email - critical step, log failures prominently
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
      // Don't throw - we've already subscribed them successfully
      // But make the failure very visible in logs
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
