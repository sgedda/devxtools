export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX = 3; // 3 requests per minute
export const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

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

export async function checkRateLimit(
  kv: KVNamespace | undefined,
  clientIP: string
): Promise<{ allowed: boolean; error?: string }> {
  if (!kv) {
    return { allowed: true };
  }

  const rateLimitKey = `rate:${clientIP}`;
  const rateLimitData = await kv.get(rateLimitKey);
  const now = Date.now();

  if (rateLimitData) {
    const { count, resetAt }: RateLimitEntry = JSON.parse(rateLimitData);

    if (now < resetAt) {
      if (count >= RATE_LIMIT_MAX) {
        return { allowed: false, error: 'Too many requests. Please try again later.' };
      }

      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: count + 1, resetAt }),
        { expirationTtl: Math.ceil((resetAt - now) / 1000) }
      );
    } else {
      await kv.put(
        rateLimitKey,
        JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW }),
        { expirationTtl: 60 }
      );
    }
  } else {
    await kv.put(
      rateLimitKey,
      JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW }),
      { expirationTtl: 60 }
    );
  }

  return { allowed: true };
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
