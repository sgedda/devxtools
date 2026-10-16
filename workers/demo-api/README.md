# Demo API Worker

A stable, read-only fake REST API for devxtools.dev guides and demos, deployed as a Cloudflare Worker at `demo.devxtools.dev`.

## Features

- **Stable fake data**: Deterministic tasks and users for predictable demos
- **Non-persistent writes**: POST, PUT, DELETE are accepted but echo-only (nothing is stored)
- **Scenario helpers**: Test different HTTP behaviors
- **CORS-enabled**: Works from any origin
- **OpenAPI 3.1**: Full specification at `/openapi.json`
- **Rate limited**: 60 requests per minute per IP

## Endpoints

### Resources

- `GET /tasks` - List all tasks
- `GET /tasks/:id` - Get a specific task
- `POST /tasks` - Create a task (echo only, not persisted)
- `PUT /tasks/:id` - Update a task (echo only, not persisted)
- `DELETE /tasks/:id` - Delete a task (echo only, not persisted)
- `GET /users` - List all users
- `GET /users/:id` - Get a specific user

### Scenario Helpers

- `GET /status/:code` - Return any HTTP status code (200-599)
- `GET /delay/:ms` - Delay response by specified milliseconds (max 5000ms)
- `GET /flaky` - Randomly fails ~1 in 3 requests (200 or 503)

### Documentation

- `GET /` - API index with available endpoints
- `GET /openapi.json` - OpenAPI 3.1 specification

## Local Development

```bash
cd workers/demo-api
npm install
npm run dev
```

Visit http://localhost:8787 to test locally.

## Testing

```bash
npm test          # Run once
npm run test:watch  # Watch mode
```

## Deployment

Deployment is automated via GitHub Actions when changes are pushed to `main` and the `workers/demo-api/**` directory is modified.

### Manual Deployment

```bash
npm run deploy
```

### Required Secrets

The following secret must be configured in the GitHub repository (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_WORKERS_TOKEN` - Cloudflare API token with the following permissions:
  - **Account > Workers Scripts > Edit**
  - **Zone > Workers Routes > Edit** (only if using routes; not needed for `*.workers.dev` domains)

To create the token:
1. Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Use "Edit Cloudflare Workers" template or create a custom token with the above permissions
3. Add the token as a repository secret named `CLOUDFLARE_WORKERS_TOKEN`

Account ID is already configured in the workflow: `2da5448d9c00373519c97d8368d08ae3`

### Custom Domain Setup (One-time)

The custom domain `demo.devxtools.dev` must be manually attached in the Cloudflare dashboard:

1. Go to Workers & Pages > demo-api > Settings > Domains & Routes
2. Click "Add Custom Domain"
3. Enter `demo.devxtools.dev`
4. Cloudflare will automatically configure DNS if the zone is managed by Cloudflare

This step cannot be automated in code without prior DNS configuration.

## Rate Limiting

Rate limiting is enabled at **60 requests per minute per IP address** using Cloudflare's Workers Rate Limiting API (open beta). This binding is available on the Workers Free plan.

The rate limiter uses the `CF-Connecting-IP` header to identify clients. When the limit is exceeded, the API returns HTTP 429 with a JSON error message.

Configuration in `wrangler.toml`:
```toml
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 60, period = 60 }
```

**Reference:** [Cloudflare Workers Rate Limiting documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## Architecture

- **Runtime**: Cloudflare Workers (Edge)
- **Language**: TypeScript 7.0.2
- **Deployment**: Wrangler 4.151.0
- **Testing**: Vitest 5.0.5 with @cloudflare/vitest-plugin 1.4.3
- **No external storage**: No KV, D1, or databases
- **No secrets**: No API keys or user data

## CORS Configuration

All endpoints return these CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-DevX-Req-Id
Access-Control-Max-Age: 86400
```

## Cache Configuration

All responses include:

```
Cache-Control: public, max-age=60
```

This allows CDN and browser caching for 60 seconds while keeping data reasonably fresh.
