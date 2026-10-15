# DevX Tools

> A curated guide to API mocking, testing, and test data generation tools for developers.

Visit [devxtools.dev](https://devxtools.dev) to explore the catalog.

## About

DevX Tools is a comprehensive, community-driven catalog of developer tools focused on:

- API mocking and HTTP interception
- Mock servers and service virtualization
- Contract testing
- Test data generation
- Record/replay functionality

All tools are cataloged with verified information, categorized by use case, and searchable by language, runtime, and spec support.

## Project Structure

```
/
├── src/
│   ├── data/
│   │   └── tools/          # YAML files for each tool
│   ├── layouts/
│   │   └── Layout.astro    # Base layout with SEO
│   ├── lib/
│   │   ├── schema.ts       # Zod schema for tool validation
│   │   └── tools.ts        # Tool loading utilities
│   └── pages/
│       ├── index.astro     # Home page
│       ├── catalog.astro   # Tool catalog with filters
│       ├── picker.astro    # Interactive tool picker
│       ├── changelog.astro # Site changelog
│       ├── tools/
│       │   └── [slug].astro    # Dynamic tool pages
│       ├── comparisons/
│       │   └── ...            # Tool comparisons
│       └── guides/
│           └── ...            # Tutorial guides
├── scripts/
│   └── validate-catalog.ts  # Schema validation script
└── public/
    └── robots.txt
```

## Adding a New Tool

### 1. Create a YAML file

Create a new file in `src/data/tools/` named after the tool's slug (e.g., `my-tool.yaml`).

```yaml
name: My Tool
slug: my-tool
website: https://example.com
repo: https://github.com/example/my-tool  # optional
license: MIT  # optional
languages:
  - TypeScript
  - JavaScript
runtimes:
  - Node.js
  - Browser
categories:
  - http-interception
  - mock-server
specSupport:  # optional
  - OpenAPI
  - GraphQL
bestFor: One-line description of the tool's sweet spot
description: A comprehensive description of what the tool does and how it works.
lastChecked: 2026-10-14  # YYYY-MM-DD format
```

### 2. Valid categories

- `http-interception`
- `mock-server`
- `spec-based-mocking`
- `contract-testing`
- `test-data-generation`
- `hosted-mocks`
- `record-replay`

### 3. Validate your changes

```bash
npm run validate
```

This will check all tool files against the schema.

### 4. Build and test locally

```bash
npm install
npm run dev
```

Visit `http://localhost:4321` to preview your changes.

### 5. Submit a pull request

- Verify URLs are correct and accessible
- Ensure license information is accurate
- Update `lastChecked` to the current date
- Run validation before committing

## Updating an Existing Tool

1. Edit the tool's YAML file in `src/data/tools/`
2. Update the `lastChecked` date to today
3. Run `npm run validate` to check for errors
4. Submit a pull request with your changes

## Development

### Prerequisites

- Node.js 22.12.0 or higher
- npm 10.9.0 or higher

### Commands

| Command                | Action                                     |
| :--------------------- | :----------------------------------------- |
| `npm install`          | Install dependencies                       |
| `npm run dev`          | Start dev server at `localhost:4321`       |
| `npm run build`        | Build production site to `./dist/`         |
| `npm run preview`      | Preview build locally before deploying     |
| `npm run validate`     | Validate all tool catalog entries          |
| `npm test`             | Run tests                                  |
| `npm run test:watch`   | Run tests in watch mode                    |

### Local Testing with Cloudflare Pages Functions

To test the newsletter signup functionality locally:

```bash
npm run build
npx wrangler pages dev dist
```

This starts a local server with Pages Functions support. The signup form will work, but you'll need environment variables configured (see below).

For development without Resend integration, the form will degrade gracefully when `RESEND_API_KEY` is not set.

## Deployment

This site is designed to deploy as a static site with serverless functions to Cloudflare Pages.

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `dist`
4. Configure environment variables and secrets (see below)
5. Create a KV namespace for rate limiting (optional but recommended)
6. Deploy

#### Required Secrets (Cloudflare Pages Environment Variables)

Before the newsletter signup will work in production, configure these in the Cloudflare Pages dashboard:

**Required:**
- `RESEND_API_KEY` - Your Resend API key (get one at [resend.com](https://resend.com))
- `NEWSLETTER_SECRET` - A random secret string for signing tokens (generate with `openssl rand -hex 32`)

**Optional (with defaults):**
- `NEWSLETTER_FROM_EMAIL` - Sender email address (default: `newsletter@devxtools.dev`)
- `NEWSLETTER_SEGMENT_ID` - Resend segment ID for confirmed subscribers (default: `31d28ce6-349c-4504-9dcf-65ad1562666f`)

**Optional KV Binding:**
- `NEWSLETTER_KV` - Bind a KV namespace for rate limiting and pending confirmations. Without this, rate limiting is disabled and expired confirmation links can't be detected (less secure but functional).

To create and bind a KV namespace:
```bash
wrangler kv:namespace create NEWSLETTER_KV
# Note the ID, then add in Cloudflare Pages settings:
# Variable name: NEWSLETTER_KV
# KV namespace: [select the created namespace]
```

#### Newsletter Configuration

The newsletter uses double opt-in:
1. User submits their email
2. They receive a confirmation email with a 24-hour expiry link
3. Clicking the link confirms their subscription and adds them to the Resend segment
4. Every email includes an unsubscribe link

**For broadcast emails sent through Resend**, include Resend's unsubscribe placeholder in your email template:
```html
<a href="{{unsubscribe}}">Unsubscribe</a>
```

Resend will automatically replace this with a working unsubscribe link.

## Continuous Integration

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

- Validates all tool catalog entries against the schema
- Runs tests for newsletter utilities
- Builds the site
- Runs on every PR and push to main

## Tool Submission System

The site includes a tool submission feature that allows maintainers to submit new tools or claim existing listings:

- **Public submission form**: `/submit/` page with validation
- **Claim flow**: Tool pages link to `/submit/?tool=<slug>&mode=claim` for maintainers to claim and update listings
- **Server-side validation**: All fields validated with appropriate limits
- **Anti-spam protection**:
  - Honeypot field (invisible to real users)
  - Minimum fill time (3 seconds)
  - Rate limiting (5 submissions per hour per IP)
  - Optional Turnstile CAPTCHA (when configured)
- **Secure storage**: Submissions stored in Cloudflare KV with 90-day retention
- **Manual review workflow**: Never auto-publishes; maintainers review and approve

### Submission Architecture

- **Frontend**: Astro page at `/submit/` with progressive enhancement
- **Backend**: Cloudflare Pages Function at `/api/submit`
- **Storage**: Cloudflare KV (uses `NEWSLETTER_KV` binding)
- **Rate limiting**: IP-based via KV (5 per hour)

### Managing Submissions

Use the `scripts/list-submissions.ts` script to export submissions:

```bash
# List all submissions
CLOUDFLARE_ACCOUNT_ID=xxx \
CLOUDFLARE_API_TOKEN=xxx \
CLOUDFLARE_KV_NAMESPACE_ID=xxx \
tsx scripts/list-submissions.ts

# Export YAML stubs to a directory
CLOUDFLARE_ACCOUNT_ID=xxx \
CLOUDFLARE_API_TOKEN=xxx \
CLOUDFLARE_KV_NAMESPACE_ID=xxx \
tsx scripts/list-submissions.ts --export ./submissions
```

**Review workflow:**
1. Export submissions with the script
2. Review and edit the YAML stubs
3. Move approved files to `src/data/tools/`
4. Create a PR with the new tools
5. Merge after Editor review

### Optional: Turnstile Configuration

To enable Turnstile CAPTCHA (recommended for production):

1. Create a Turnstile site key at [dash.cloudflare.com](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Set environment variables:
   - `PUBLIC_TURNSTILE_SITE_KEY` (build-time, visible to client)
   - `TURNSTILE_SECRET` (runtime secret, Pages Function only)

When unset, the form works without CAPTCHA (relies on honeypot + rate limiting).

## Tool Badges

Each tool in the catalog has a badge that can be embedded in README files or websites:

- **Light theme**: `/badge/<slug>.svg`
- **Dark theme**: `/badge/<slug>-dark.svg`

Badges are generated at build time as static SVGs for all tools. The badge section on each tool page includes:
- Visual previews (light and dark themes)
- Copy-paste Markdown snippet
- Copy-paste HTML snippet

To customize badge design, edit:
- `src/pages/badge/[slug].svg.ts` (light theme)
- `src/pages/badge/[slug]-dark.svg.ts` (dark theme)

## Newsletter System

The site includes a newsletter signup feature with:

- **Double opt-in**: Users must confirm their email before being subscribed
- **Rate limiting**: Prevents abuse (3 requests per minute per IP)
- **Honeypot field**: Silent spam protection
- **Token-based confirmation**: Secure, expiring confirmation links (24 hours)
- **Unsubscribe support**: One-click unsubscribe from any email

The signup form appears:
- In the footer of every page
- At the end of guide and comparison articles

### Architecture

- **Frontend**: Astro component with progressive enhancement
- **Backend**: Cloudflare Pages Functions (serverless)
- **Email service**: Resend API for contact management and email delivery
- **Storage**: Cloudflare KV for rate limiting and pending confirmations (optional)

### Testing the Newsletter

Run the test suite:
```bash
npm test
```

Test locally with Pages Functions:
```bash
npm run build
npx wrangler pages dev dist --kv NEWSLETTER_KV
```

You'll need a `.dev.vars` file with test credentials:
```
RESEND_API_KEY=re_test_...
NEWSLETTER_SECRET=your-test-secret-here
NEWSLETTER_FROM_EMAIL=test@devxtools.dev
```

## Contributing

We welcome contributions! Here's how you can help:

- **Add new tools**: Create a PR with a new tool YAML file
- **Update existing tools**: Keep information current (versions, URLs, features)
- **Write guides**: Expand stub guides with detailed tutorials
- **Report issues**: Found incorrect information? Open an issue
- **Improve comparisons**: Add new comparison pages or enhance existing ones

### Guidelines

- **Accuracy first**: All information must be verifiable
- **No marketing speak**: Be objective and factual
- **Keep it current**: Update `lastChecked` dates when verifying info
- **Test locally**: Always run `npm run validate` and preview changes
- **Write clear descriptions**: Help users understand when to use each tool

## Automated Updates

A weekly GitHub Action automatically:

1. Checks for broken links in tool websites and repos
2. Opens PRs to update `lastChecked` dates
3. Flags tools that may need review

## License

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)  
Code: MIT

## Maintainers

- [@sgedda](https://github.com/sgedda)

## Acknowledgments

Built with [Astro](https://astro.build), styled with modern CSS, and hosted as a static site.

Special thanks to all the tool maintainers and contributors who make the developer experience better every day.
