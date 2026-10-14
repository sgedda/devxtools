/**
 * Cloudflare Pages middleware for rate limiting using Durable Objects
 * 
 * This middleware handles rate limiting for the newsletter signup endpoint.
 * It uses Durable Objects for strong consistency across edge locations.
 */

export { RateLimiterDurableObject } from './lib/rate-limiter-do';

export interface Env {
  RATE_LIMITER: DurableObjectNamespace;
}

// Middleware is not needed here - rate limiting is handled per-route
export const onRequest: PagesFunction<Env> = async (context) => {
  return context.next();
};
