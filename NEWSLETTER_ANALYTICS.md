# Newsletter Analytics & Attribution

This document explains how to query newsletter signups by page and placement to understand which content drives confirmed subscriptions.

## Attribution Data Model

When a user confirms their newsletter subscription, we store attribution data in the `NEWSLETTER_KV` namespace:

```typescript
Key: `attribution:${email}`
Value: {
  email: string,
  page: string | null,          // e.g., "/guides/keeping-mocks-honest-pact"
  placement: string | null,       // "footer" or "article"
  confirmedAt: number             // Unix timestamp in milliseconds
}
```

**Privacy Note:** We only store the email, page path, placement, and confirmation timestamp. No IP addresses, user agents, or other personal data is collected.

## Querying Attribution Data

### Using Wrangler CLI

#### List all attribution keys

```bash
npx wrangler kv:key list --namespace-id=<NAMESPACE_ID> --prefix="attribution:"
```

#### Get attribution for a specific email

```bash
npx wrangler kv:key get "attribution:user@example.com" --namespace-id=<NAMESPACE_ID>
```

### Bulk Export via Wrangler

To analyze signups by page, export all attribution data:

```bash
# List all attribution keys and save to file
npx wrangler kv:key list --namespace-id=<NAMESPACE_ID> --prefix="attribution:" > attribution-keys.json

# Then fetch each key (requires scripting)
# Example with jq and bash:
cat attribution-keys.json | jq -r '.[].name' | while read key; do
  echo "Fetching $key..."
  npx wrangler kv:key get "$key" --namespace-id=<NAMESPACE_ID> >> attribution-data.jsonl
done
```

### Analysis Examples

#### Count signups by page

```bash
# Using jq to analyze the exported data
cat attribution-data.jsonl | jq -r '.page' | sort | uniq -c | sort -rn
```

Example output:
```
     42 /guides/keeping-mocks-honest-pact
     31 /guides/spec-first-mocking-prism-openapi
     28 /
     18 /comparisons/msw-vs-nock
     ...
```

#### Count signups by placement

```bash
cat attribution-data.jsonl | jq -r '.placement' | sort | uniq -c
```

Example output:
```
     89 article
     30 footer
```

#### Top pages by confirmed signups (last 30 days)

```bash
# Filter by confirmedAt timestamp (last 30 days = 2592000000 ms)
THIRTY_DAYS_AGO=$(($(date +%s) * 1000 - 2592000000))

cat attribution-data.jsonl | \
  jq -r --arg since "$THIRTY_DAYS_AGO" \
  'select(.confirmedAt >= ($since | tonumber)) | .page' | \
  sort | uniq -c | sort -rn | head -10
```

### Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Workers & Pages → KV
2. Select your `NEWSLETTER_KV` namespace
3. Filter keys by prefix: `attribution:`
4. Click any key to view its attribution data

**Note:** The dashboard is not ideal for bulk analysis. Use Wrangler CLI for exporting and analyzing data.

## Cloudflare Workers Script for Analytics

For more advanced analytics, deploy a Cloudflare Worker that queries the KV namespace:

```typescript
// workers/analytics.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/analytics/by-page') {
      const list = await env.NEWSLETTER_KV.list({ prefix: 'attribution:' });
      const stats: Record<string, number> = {};
      
      for (const key of list.keys) {
        const data = await env.NEWSLETTER_KV.get(key.name);
        if (data) {
          const attribution = JSON.parse(data);
          const page = attribution.page || 'unknown';
          stats[page] = (stats[page] || 0) + 1;
        }
      }
      
      return Response.json(
        Object.entries(stats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
      );
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

Deploy:
```bash
npx wrangler deploy workers/analytics.ts
```

Access: `https://analytics.your-worker.workers.dev/analytics/by-page`

## Integration with Resend

Attribution data is stored in KV because:

1. **Flexibility:** Easy to query and analyze without rate limits
2. **Privacy:** Data stays in your Cloudflare account
3. **Cost:** KV reads/writes are inexpensive
4. **Future-proof:** Can migrate to Resend contact properties later if needed

To sync with Resend in the future, you can add custom fields to contacts using the Resend API and backfill from KV.

## Testing Attribution Locally

To test locally with Wrangler:

```bash
# Start dev server with KV binding
npm run build
npx wrangler pages dev dist --kv NEWSLETTER_KV

# Submit signup with attribution
curl -X POST http://localhost:8788/api/newsletter/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consent":true,"page":"/guides/test","placement":"article"}'

# Check confirmation link in terminal output
# Click it, then verify attribution was stored:
npx wrangler kv:key get "attribution:test@example.com" --namespace-id=<NAMESPACE_ID>
```

## Retention & Cleanup

Attribution data is stored indefinitely. To implement cleanup:

1. **TTL-based:** Modify `confirm.ts` to set an expiration when writing to KV:
   ```typescript
   await env.NEWSLETTER_KV.put(
     `attribution:${email}`,
     JSON.stringify({ ... }),
     { expirationTtl: 31536000 } // 1 year in seconds
   );
   ```

2. **Manual cleanup:** Run a scheduled Worker to delete old entries:
   ```typescript
   const RETENTION_DAYS = 365;
   const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
   
   const list = await env.NEWSLETTER_KV.list({ prefix: 'attribution:' });
   for (const key of list.keys) {
     const data = await env.NEWSLETTER_KV.get(key.name);
     const attribution = JSON.parse(data);
     if (attribution.confirmedAt < cutoff) {
       await env.NEWSLETTER_KV.delete(key.name);
     }
   }
   ```

## Common Queries

### Conversion rate by page

1. Track page views (separate analytics)
2. Divide confirmed signups by page views
3. Example: 42 signups from `/guides/pact` with 10,000 views = 0.42% conversion

### A/B testing placement

Compare `article` vs `footer` placement conversion:

```bash
# Article placement signups
cat attribution-data.jsonl | jq 'select(.placement == "article")' | wc -l

# Footer placement signups  
cat attribution-data.jsonl | jq 'select(.placement == "footer")' | wc -l
```

### Time series analysis

Group signups by week:

```bash
cat attribution-data.jsonl | jq -r '.confirmedAt' | \
  awk '{print strftime("%Y-%W", $1/1000)}' | \
  sort | uniq -c
```
