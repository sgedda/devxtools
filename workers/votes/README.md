# Votes Worker

Stack voting API for devxtools.dev - a privacy-first voting system backed by Cloudflare D1.

## Architecture

- **Worker**: Cloudflare Worker handling `/api/polls/*` routes
- **Database**: D1 (SQLite) with polls, options, and votes tables
- **Privacy**: IP addresses are never stored; only salted hashes for duplicate prevention
- **Rate limiting**: 10 requests/minute per IP (configured but not currently enforced; fix pending)

## Local Development

```bash
npm install
npm run dev
```

## Deployment

Deployment is automated via `.github/workflows/votes-deploy.yml` on push to `main`.

### One-time setup

1. **D1 database**: Created automatically by the workflow, or manually:
   ```bash
   npx wrangler d1 create devxtools-votes
   ```

2. **Vote salt secret**: Set a random salt for voter hashing:
   ```bash
   npx wrangler secret put VOTE_SALT --env production
   ```

### Manual deployment

```bash
# Apply migrations
npm run d1:migrations:apply

# Seed polls from src/data/polls/*.yaml
DATABASE_ID=<your-d1-id> CLOUDFLARE_API_TOKEN=<token> npm run seed

# Deploy worker
npm run deploy
```

## Adding a Poll

1. Create a YAML file in `/src/data/polls/`:

```yaml
slug: my-poll
question: What's your favorite tool?
status: active
options:
  - slug: option-1
    label: Tool A
    tool_slug: tool-a
    sort: 1
  - slug: option-2
    label: Tool B
    tool_slug: tool-b
    sort: 2
```

2. The workflow validates and seeds it automatically on push to `main`.

## API Endpoints

### GET `/api/polls/:slug`

Returns poll details and options. If the visitor has voted (based on the hashed IP), includes vote counts.

**Response (not voted):**
```json
{
  "slug": "rn-api-mocking",
  "question": "How do you mock APIs in React Native?",
  "has_voted": false,
  "options": [
    { "slug": "msw", "label": "MSW", "tool_slug": "msw" },
    { "slug": "nock", "label": "Nock", "tool_slug": "nock" }
  ]
}
```

**Response (voted):**
```json
{
  "slug": "rn-api-mocking",
  "question": "How do you mock APIs in React Native?",
  "has_voted": true,
  "total_votes": 42,
  "options": [
    { "slug": "msw", "label": "MSW", "tool_slug": "msw", "count": 25, "percentage": 60 },
    { "slug": "nock", "label": "Nock", "tool_slug": "nock", "count": 17, "percentage": 40 }
  ]
}
```

### POST `/api/polls/:slug/vote`

Submit a vote. Returns 409 if the visitor already voted, 429 if rate limited (once the limiter is working).

**Request:**
```json
{
  "option": "msw"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "slug": "rn-api-mocking",
    "question": "How do you mock APIs in React Native?",
    "total_votes": 43,
    "options": [ ... ]
  }
}
```

## Testing

```bash
npm test
```

Tests run with Vitest + `@cloudflare/vitest-plugin` for in-memory D1.

## Privacy

- **No raw IPs stored**: Only SHA-256 hashes of `IP + poll slug + secret salt`
- **Retention**: Vote hashes are automatically anonymized after 90 days via scheduled cron job (runs daily at 02:00 UTC). The cron replaces each expired hash with a unique `EXPIRED_` prefix, preserving vote counts; after expiry the same network can vote again.
- **No cookies**: Deduplication is per IP address only
- **Rate limiting**: 10 requests/minute per IP, fail-closed for POST requests (configured but not currently enforced; fix pending)

## Permissions

The `CLOUDFLARE_WORKERS_TOKEN` secret must have:
- **Account > Workers Scripts > Edit**
- **Account > D1 > Edit** (for database creation and migrations)

## Scheduled Tasks

The worker includes a cron trigger that runs daily at 02:00 UTC to replace vote hashes older than 90 days. This maintains the 90-day retention policy while keeping aggregate vote counts intact.
