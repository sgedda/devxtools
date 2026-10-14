export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX = 3; // 3 requests per minute
export const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export interface UnsubscribeMapping {
  email: string;
  createdAt: number;
}

export function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

export function checkHoneypot(honeypot: unknown): boolean {
  return !!honeypot;
}

/**
 * Best-effort KV-based rate limiter (defense in depth)
 * 
 * PRIMARY PROTECTION: Cloudflare WAF rate limiting rule
 * SECONDARY: This KV-based check (may have race conditions due to eventual consistency)
 * 
 * Use WAF rule: POST /api/newsletter/signup, 3 requests/min per IP, block 1min
 * See CLOUDFLARE_SETUP.md for WAF configuration instructions
 */
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  clientIP: string
): Promise<{ allowed: boolean; error?: string }> {
  if (!kv) {
    return { allowed: true };
  }

  try {
    const rateLimitKey = `rate:${clientIP}`;
    const now = Date.now();
    
    // Get current count
    const data = await kv.get(rateLimitKey);
    
    if (!data) {
      // First request - store it
      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW }),
        { expirationTtl: 60 }
      );
      return { allowed: true };
    }
    
    const { count, resetAt }: RateLimitEntry = JSON.parse(data);
    
    // Check if window expired
    if (now >= resetAt) {
      // Reset counter
      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW }),
        { expirationTtl: 60 }
      );
      return { allowed: true };
    }
    
    // Within window - check limit
    if (count >= RATE_LIMIT_MAX) {
      return { 
        allowed: false, 
        error: 'Too many requests. Please try again later.' 
      };
    }
    
    // Increment counter
    await kv.put(
      rateLimitKey,
      JSON.stringify({ count: count + 1, resetAt }),
      { expirationTtl: Math.max(60, Math.ceil((resetAt - now) / 1000)) }
    );
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request (fail open)
    return { allowed: true };
  }
}

export async function generateToken(email: string, secret: string): Promise<string> {
  const data = JSON.stringify({
    email,
    timestamp: Date.now(),
  });

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const keyBuffer = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${btoa(data)}.${signatureHex}`;
}

export async function verifyToken(
  token: string,
  secret: string,
  checkAge = true
): Promise<string | null> {
  try {
    const [dataB64, signatureHex] = token.split('.');
    if (!dataB64 || !signatureHex) {
      return null;
    }

    const data = atob(dataB64);
    const payload = JSON.parse(data);

    // Check timestamp if required
    if (checkAge && Date.now() - payload.timestamp > TOKEN_MAX_AGE) {
      return null;
    }

    // Verify signature
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBuffer,
      dataBuffer
    );

    return isValid ? payload.email : null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function generateUnsubscribeToken(
  email: string,
  secret: string,
  kv?: KVNamespace
): Promise<string> {
  // Generate a random opaque token ID
  const tokenId = crypto.randomUUID();
  
  // If KV is available, store the mapping
  if (kv) {
    const mapping: UnsubscribeMapping = {
      email,
      createdAt: Date.now(),
    };
    // Store indefinitely (no expiration)
    await kv.put(`unsubscribe:${tokenId}`, JSON.stringify(mapping));
  }
  
  // Create HMAC signature over the token ID
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(tokenId);
  const keyBuffer = encoder.encode(secret);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${tokenId}.${signatureHex}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
  kv?: KVNamespace
): Promise<string | null> {
  try {
    const [tokenId, signatureHex] = token.split('.');
    if (!tokenId || !signatureHex) {
      return null;
    }
    
    // Verify HMAC signature
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(tokenId);
    const keyBuffer = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBuffer = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBuffer,
      dataBuffer
    );
    
    if (!isValid) {
      return null;
    }
    
    // If KV is available, look up the email
    if (kv) {
      const mappingData = await kv.get(`unsubscribe:${tokenId}`);
      if (!mappingData) {
        return null;
      }
      
      const mapping: UnsubscribeMapping = JSON.parse(mappingData);
      return mapping.email;
    }
    
    // If no KV, we can't recover the email from the opaque token
    return null;
  } catch (error) {
    console.error('Unsubscribe token verification error:', error);
    return null;
  }
}

export interface SignupAttribution {
  page?: string;
  placement?: string;
}

export async function parseRequestBody(
  request: Request
): Promise<{ email?: string; consent?: boolean; website?: string; page?: string; placement?: string } | null> {
  const contentType = request.headers.get('content-type') || '';
  
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      return {
        email: body.email,
        consent: body.consent,
        website: body.website,
        page: body.page,
        placement: body.placement,
      };
    } else {
      const formData = await request.formData();
      const consentValue = formData.get('consent');
      return {
        email: formData.get('email') as string,
        consent: consentValue === 'true' || consentValue === true,
        website: formData.get('website') as string,
        page: formData.get('page') as string,
        placement: formData.get('placement') as string,
      };
    }
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return null;
  }
}
