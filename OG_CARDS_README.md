# Per-Article OG Cards Setup

## Status: Pending PR #13 Merge

This launch prep PR includes infrastructure for per-article OG cards (guides and comparisons), but **depends on PR #13 (brand assets)** being merged first.

## What's Ready

- ✅ Scripts prepared: `scripts/generate-article-og-cards.ts` and `scripts/check-article-og-cards.ts`
- ✅ Article metadata defined for all 5 guides and 2 comparisons
- ✅ Output directories configured: `public/og-guides/` and `public/og-comparisons/`

## What's Blocked

These require PR #13 to be merged:

1. **Template**: `public/og/og-template.html` (from PR #13)
2. **Puppeteer dependency**: Added in PR #13's package.json
3. **npm scripts**: `og:articles` and `check:og:articles` should be added to package.json
4. **Tool cards infrastructure**: The generate/check pattern this builds on

## After PR #13 Merges

1. Install dependencies (Puppeteer will be added by PR #13)
2. Add to package.json scripts:
   ```json
   "og:articles": "tsx scripts/generate-article-og-cards.ts",
   "check:og:articles": "tsx scripts/check-article-og-cards.ts"
   ```
3. Generate cards: `npm run og:articles`
4. Verify: `npm run check:og:articles`
5. Update guide and comparison pages to reference their og:image paths:
   - Guides: `/og-guides/{slug}.png`
   - Comparisons: `/og-comparisons/{slug}.png`

## Article OG Card Inventory

### Guides (5)
- spec-first-mocking-prism-openapi
- keeping-mocks-honest-pact
- react-native-mocking-mockifyer
- realistic-test-data-faker-factories
- msw-vs-nock-vs-polly

### Comparisons (2)
- msw-vs-nock
- msw-vs-nock-vs-polly
