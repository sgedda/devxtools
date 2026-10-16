# Demo API Worker

A stable, read-only fake REST API for devxtools.dev guides and demos, deployed as a Cloudflare Worker at `demo.devxtools.dev`.

## Features

- **Stable fake data**: Deterministic tasks and users for predictable demos
- **Non-persistent writes**: POST, PUT, DELETE are accepted but echo-only (nothing is stored)
- **Scenario helpers**: Test different HTTP behaviors
- **CORS-enabled**: Works from any origin
- **OpenAPI 3.1**: Full specification at `/openapi.json`
- **Rate limited**: Per-IP rate limiting (when available)

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

- `GET /status/:code` - Return any HTTP status code (100-599)
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

The following secrets must be configured in the GitHub repository:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers deploy permission

Account ID is already configured in the workflow: `2da5448d9c00373519c97d8368d08ae3`

### Custom Domain Setup (One-time)

The custom domain `demo.devxtools.dev` must be manually attached in the Cloudflare dashboard:

1. Go to Workers & Pages > demo-api > Settings > Domains & Routes
2. Click "Add Custom Domain"
3. Enter `demo.devxtools.dev`
4. Cloudflare will automatically configure DNS if the zone is managed by Cloudflare

This step cannot be automated in code without prior DNS configuration.

## Rate Limiting

**Note**: The Workers Rate Limiting binding is not available on the Cloudflare Workers free plan as of October 2024. The code includes the rate limiting logic with a graceful fallback that allows all requests if the binding is unavailable.

To enable rate limiting in production:
1. Upgrade to a Workers paid plan
2. Add the rate limiting binding to `wrangler.toml`
3. Redeploy

## Architecture

- **Runtime**: Cloudflare Workers (Edge)
- **Language**: TypeScript 7.0.2
- **Deployment**: Wrangler 4.151.0
- **Testing**: Vitest with @cloudflare/vitest-pool-workers
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
