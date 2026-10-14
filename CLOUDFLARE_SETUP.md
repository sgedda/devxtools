# Cloudflare Configuration for Newsletter

This document explains the Cloudflare-specific configuration required for the newsletter signup feature.

## Rate Limiting Strategy

The newsletter uses a **two-layer rate limiting approach**:

1. **Primary**: Cloudflare WAF rate limiting rule (reliable, edge-enforced)
2. **Secondary**: KV-based limiter in code (best-effort, defense in depth)

### Why Two Layers?

KV's eventual consistency causes race conditions with atomic counters. The WAF rule provides reliable rate limiting at the edge, while the KV check adds defense in depth.

## Required: WAF Rate Limiting Rule

Create a WAF rate limiting rule in the Cloudflare dashboard. The free plan allows **one rate limiting rule**.

### Configuration Steps

1. Go to Cloudflare Dashboard
2. Select your domain (e.g., `devxtools.dev`)
3. Navigate to **Security** → **WAF** → **Rate limiting rules**
4. Click **Create rate limiting rule**

### Rule Configuration

**Rule name**: `Newsletter Signup Rate Limit`

**If incoming requests match**:
```
Field: URI Path
Operator: equals
Value: /api/newsletter/signup

AND

Field: HTTP Method
Operator: equals  
Value: POST
```

**With the same value of**:
```
Field: IP Address
```

**Requests exceeding**:
```
Requests: 3
Period: 1 minute
```

**Then take action**:
```
Action: Block
Duration: 1 minute
With response:
  - Status code: 429
  - Response body: (default "Rate limit exceeded")
```

**Mitigation timeout**: 1 minute

### Screenshot Reference

Your configuration should look like this:

```
┌─────────────────────────────────────────────────┐
│ When incoming requests match...                 │
│                                                 │
│ (URI Path equals "/api/newsletter/signup"      │
│  AND HTTP Method equals "POST")                 │
│                                                 │
│ With the same value of...                       │
│ • IP Address                                    │
│                                                 │
│ Requests exceeding...                           │
│ • 3 requests per 1 minute                       │
│                                                 │
│ Then...                                         │
│ • Block for 1 minute                            │
│ • HTTP status: 429                              │
└─────────────────────────────────────────────────┘
```

### Verification

Test the WAF rule after deployment:

```bash
# Requests 1-3 should succeed (200 or 400 for validation)
for i in {1..3}; do
  curl -w "\nStatus: %{http_code}\n" \
    -X POST https://devxtools.dev/api/newsletter/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","consent":true}'
  sleep 1
done

# Request 4 should be blocked by WAF (429)
curl -w "\nStatus: %{http_code}\n" \
  -X POST https://devxtools.dev/api/newsletter/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consent":true}'
```

Expected: Request 4 returns `429 Too Many Requests`

## Defense in Depth: KV Rate Limiter

The code also implements a KV-based rate limiter as a secondary check. This is **best-effort** due to KV's eventual consistency:

- **May allow some requests past the limit** due to race conditions
- **Primary protection is the WAF rule** (reliable)
- **Adds defense** if WAF rule is misconfigured or disabled
- **No additional configuration needed** (uses existing `NEWSLETTER_KV` binding)

## Existing Configuration

These should already be configured from the initial newsletter setup:

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
- Pending confirmations (`confirm:{tokenId}`, 24h TTL)
- Unsubscribe token mappings (`unsubscribe:{tokenId}`)
- Attribution data (`attribution:{email}`)
- Best-effort rate limiting (`rate:{ip}`, 60s TTL)

## Local Development

To test locally:

```bash
npm run build
npx wrangler pages dev dist --kv NEWSLETTER_KV
```

Create `.dev.vars` with test credentials:
```
RESEND_API_KEY=re_test_...
NEWSLETTER_SECRET=test-secret-here
NEWSLETTER_FROM_EMAIL=test@devxtools.dev
NEWSLETTER_SEGMENT_ID=31d28ce6-349c-4504-9dcf-65ad1562666f
```

**Note**: Local development won't have WAF protection. The KV rate limiter will work but may have race conditions with rapid concurrent requests. This is acceptable for local testing.

## Production Testing Checklist

After deploying and configuring the WAF rule:

### 1. Rate Limiting

```bash
# Test WAF rule enforcement
for i in {1..4}; do
  echo "Request $i:"
  curl -w "Status: %{http_code}\n\n" \
    -X POST https://devxtools.dev/api/newsletter/signup \
    -d "email=test$i@example.com&consent=on"
  sleep 2
done
```

Expected:
- Requests 1-3: `200` or `400` (validation)
- Request 4: `429` (blocked by WAF)

### 2. No Contact Writes During Signup

After a signup POST (before confirmation):
- ✅ Go to Resend dashboard → Contacts
- ✅ Search for the signup email
- ✅ **Expected**: Either NOT found, or if found (due to email send), marked as `unsubscribed: true` and NOT in any segments
- ✅ **Critical**: Contact should NOT be subscribed or in General segment yet

### 3. Confirmation Flow

Click the confirmation link:
- ✅ Contact created/updated as `unsubscribed: false`
- ✅ Contact added to General segment
- ✅ Welcome email received
- ✅ Cloudflare logs show: `[NEWSLETTER] Welcome email sent successfully`

### 4. Security: Malicious Unsubscribe Prevention

**Attack scenario**: Try to unsubscribe someone else via signup

1. In Resend, create a test contact as subscribed
2. Submit signup form with that email (don't confirm)
3. Check Resend dashboard
4. ✅ **Critical**: Contact should still be subscribed (signup didn't unsubscribe them)

**Before this fix**: Signup would mark the contact as `unsubscribed: true`  
**After this fix**: Signup makes ZERO contact API writes

## Troubleshooting

### Rate Limiting Not Working

**Symptoms**:
- Can submit unlimited signup requests
- Never see 429 errors

**Causes & Fixes**:

1. ❌ **WAF rule not created/enabled**
   - Fix: Create the WAF rule as documented above
   - Verify rule is enabled (toggle should be blue/on)

2. ❌ **WAF rule path mismatch**
   - Fix: Ensure path is exactly `/api/newsletter/signup` (case-sensitive)
   - Include the leading `/`

3. ❌ **Wrong HTTP method**
   - Fix: Rule must match `POST` method only

4. ❌ **Testing from same IP too slowly**
   - Fix: Send requests within 1 minute (< 20 seconds apart)
   - WAF resets counter after 1 minute

5. ℹ️ **KV rate limiter race conditions**
   - This is expected - KV is best-effort only
   - Primary protection is the WAF rule

### Confirming WAF Rule is Active

Check Cloudflare's **Security Events** log:

1. Dashboard → Security → Events
2. Filter by `Rate limiting rule`
3. Should see blocked requests after hitting limit

### Testing WAF Rule Locally

WAF rules only work on Cloudflare's edge, not locally. For local testing:
- KV rate limiter provides basic protection
- May allow more than 3 requests due to race conditions
- Test production WAF rule after deploying

## Cost Implications

### WAF Rate Limiting Rule

- **Free plan**: 1 rule included (we use it for newsletter signup)
- **Pro plan**: 10 rules included
- **No per-request cost**: Edge-enforced, no Workers/Functions invocations

### KV Operations

Newsletter flow uses ~5-7 KV operations per confirmed signup:
- Signup: Write `confirm:{token}` (1 write)
- Signup: Rate limit check (1 read, 1 write)
- Confirm: Read `confirm:{token}` (1 read), delete (1 write)
- Confirm: Write `attribution:{email}` if provided (1 write)
- Confirm: Read/write `unsubscribe:{token}` (1 read, 1 write)

**KV Pricing** (Free tier includes 100k reads/day, 1k writes/day):
- $0.50 per million reads
- $5.00 per million writes

**Estimated cost**: ~$0.50 per million confirmed signups

### Total Cost

**~$0.50 per million confirmed signups** (essentially free under most traffic)

Compare to cost of abuse without rate limiting:
- Spam attacks overwhelming Resend quota
- Reputation damage from malicious re-subscriptions
- Potential GDPR fines for non-consensual emails

## Advanced: Custom WAF Rules

If you need more sophisticated rate limiting:

### Geographic Rate Limits

Add country-specific limits for high-spam regions:

```
(URI Path equals "/api/newsletter/signup" 
 AND HTTP Method equals "POST"
 AND IP Source Country in {CN, RU, ...})

Requests: 1 per 5 minutes
Action: Block for 1 hour
```

### Email Domain Blocking

Block disposable email domains:

```
(URI Path equals "/api/newsletter/signup"
 AND Body contains "@tempmail.com")

Action: Block
```

**Note**: Body inspection requires Enterprise plan

## Monitoring

Track newsletter signup rate limiting in Cloudflare Analytics:

1. Dashboard → Analytics → Security
2. Filter by **Rate Limiting** events
3. View blocked requests, top IPs, trends

Set up alerts:
- Dashboard → Notifications → Add
- Event: Rate limit exceeded
- Threshold: > 10 blocks per hour

This helps identify attack patterns or legitimate traffic spikes.

## Migration from Durable Objects

If you previously used the Durable Object approach:
- No migration needed - just create the WAF rule
- Old Durable Object bindings can be removed
- Code automatically uses KV-based limiter
- No data loss or downtime
