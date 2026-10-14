/**
 * Durable Object for rate limiting
 * 
 * Provides strong consistency for rate limiting across all edge locations.
 * Each IP address gets its own Durable Object instance with atomic counters.
 */

interface RateLimitState {
  count: number;
  resetAt: number;
}

export class RateLimiterDurableObject {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'check') {
      const result = await this.checkLimit();
      return Response.json(result);
    }

    return new Response('Invalid action', { status: 400 });
  }

  private async checkLimit(): Promise<{ allowed: boolean; error?: string }> {
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const RATE_LIMIT_MAX = 3; // 3 requests per minute
    const now = Date.now();

    // Get current state from Durable Object storage
    let state = await this.storage.get<RateLimitState>('limit');

    if (!state) {
      // First request - initialize
      state = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
      await this.storage.put('limit', state);
      return { allowed: true };
    }

    if (now >= state.resetAt) {
      // Window expired - reset
      state = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
      await this.storage.put('limit', state);
      return { allowed: true };
    }

    // Within window
    if (state.count >= RATE_LIMIT_MAX) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        error: 'Too many requests. Please try again later.' 
      };
    }

    // Increment counter
    state.count += 1;
    await this.storage.put('limit', state);
    return { allowed: true };
  }
}
