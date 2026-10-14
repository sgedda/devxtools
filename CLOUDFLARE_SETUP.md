# Cloudflare Pages Configuration for Newsletter

This document explains the Cloudflare-specific configuration required for the newsletter signup feature.

## Required: Durable Object for Rate Limiting

The newsletter signup uses a **Durable Object** for reliable rate limiting that works consistently across all Cloudflare edge locations. This is necessary because KV's eventual consistency makes it unsuitable for atomic counter operations.

### Why Durable Objects?

The previous implementation used KV for rate limiting, which suffered from race conditions due to eventual consistency. Multiple rapid requests would all read the same initial count before any writes propagated, allowing abuse. Durable Objects provide:

- **Strong consistency**: Each IP gets its own DO instance with atomic state updates
- **No race conditions**: Read-modify-write operations are serialized
- **Reliable counting**: Works correctly even with rapid concurrent requests

### Configuration in Cloudflare Dashboard

1. Go to your Cloudflare Pages project settings
2. Navigate to **Settings** → **Functions** → **Durable Object bindings**
3. Add a new Durable Object binding:
   - **Variable name**: `RATE_LIMITER`
   - **Durable Object class name**: `RateLimiterDurableObject`
   - **Durable Object namespace**: Create new or select existing

The DO class is exported from `functions/_middleware.ts` and defined in `functions/lib/rate-limiter-do.ts`.

### Configuration via wrangler.toml (Alternative)

If you're using `wrangler.toml` for local development:

```toml
name = "devxtools"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiterDurableObject"
script_name = "devxtools"
```

### How It Works

1. Each IP address gets its own Durable Object instance
2. The DO maintains a counter and reset timestamp
3. Each request atomically increments the counter
4. Rate limit: 3 requests per minute per IP
5. After 1 minute, the counter resets

### Fallback Behavior

If the `RATE_LIMITER` binding is not configured:
- Rate limiting is disabled (logs a warning)
- Signup still works, but without rate protection
- This is "fail open" behavior to prevent complete breakage

## Existing Configuration (Already Set Up)

These environment variables and bindings should already be configured from the initial setup:

### Environment Variables (Required)

```
RESEND_API_KEY=re_...                           # Resend API key
NEWSLETTER_SECRET=<random-secret>               # Token signing secret (32+ bytes)
NEWSLETTER_FROM_EMAIL=newsletter@devxtools.dev  # Sender email
NEWSLETTER_SEGMENT_ID=31d28ce6-349c-4504...     # Resend segment ID for General
```

### KV Namespace Binding (Required)

- **Variable name**: `NEWSLETTER_KV`
- **KV namespace**: Your existing KV namespace

Used for:
- Pending confirmations (24h TTL)
- Unsubscribe token mappings
- Confirmation token mappings
- Attribution data

## Local Development

To test locally with Durable Objects:

1. Install Wrangler: `npm install -g wrangler`
2. Build the project: `npm run build`
3. Run with bindings:
   ```bash
   npx wrangler pages dev dist \
     --kv NEWSLETTER_KV \
     --do RATE_LIMITER=RateLimiterDurableObject
   ```
4. Create `.dev.vars` with secrets:
   ```
   RESEND_API_KEY=re_test_...
   NEWSLETTER_SECRET=test-secret-here
   NEWSLETTER_FROM_EMAIL=test@devxtools.dev
   ```

## Testing Rate Limiting

After configuring the Durable Object:

```bash
# Should succeed (requests 1-3)
for i in {1..3}; do
  curl -X POST https://devxtools.dev/api/newsletter/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","consent":true}'
  sleep 1
done

# Should return 429 (request 4)
curl -X POST https://devxtools.dev/api/newsletter/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consent":true}'
```

Expected output for 4th request:
```json
{"error":"Too many requests. Please try again later."}
```

## Troubleshooting

### Rate limiting not working

**Symptom**: Can submit unlimited requests without getting 429

**Causes**:
1. ✅ Fixed: KV eventual consistency (old issue)
2. ❌ `RATE_LIMITER` binding not configured
3. ❌ Durable Object class not exported from `_middleware.ts`
4. ❌ Cloudflare not routing requests through the DO

**Fix**: Verify the binding exists in Cloudflare dashboard under Functions → Durable Object bindings

### "RATE_LIMITER binding not configured" warning in logs

**Cause**: The binding is missing or misconfigured

**Fix**: Add the binding in Cloudflare Pages settings as described above

### Durable Object errors in production

**Cause**: DO deployment issues or binding misconfiguration

**Check**:
- Verify the DO class name matches exactly: `RateLimiterDurableObject`
- Check that `functions/_middleware.ts` exports the class
- Ensure the binding variable name is exactly `RATE_LIMITER` (case-sensitive)

## Cost Implications

Durable Objects pricing:
- **$0.15 per million requests** to Durable Objects
- Newsletter signups: ~3 DO requests per user (rate limit checks)
- **Estimated cost**: $0.45 per million signups
- Much cheaper than the potential abuse without rate limiting

KV pricing:
- Still used for pending confirmations and attribution
- **$0.50 per million reads**, $5 per million writes
- Newsletter flow: ~5 KV operations per confirmed signup
- **Estimated cost**: ~$0.50 per million confirmed signups

Total estimated cost: **~$1 per million confirmed signups**

## Migration from KV Rate Limiting

The old KV-based rate limiting has been replaced with Durable Objects. No migration is needed:
- Old `rate:{ip}` keys in KV will expire naturally (60s TTL)
- New requests will use Durable Objects
- No data loss or downtime during transition
