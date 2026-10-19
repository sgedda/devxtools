import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Same mapping as scripts/generate-article-og-cards.ts and check-article-og-cards.ts:
 * an article whose URL contains /guides/ uses public/og-guides/<last segment>.png,
 * one under /comparisons/ uses public/og-comparisons/<last segment>.png, and any
 * other article (testing, observability, api-development, blog) uses
 * public/og-articles/<last segment>.png. Only used when the file exists.
 */
export function articleOgCardPath(urlPath: string): string | null {
  const path = urlPath.replace(/^https?:\/\/[^/]+/, '');
  const slug = path.split('/').filter(Boolean).pop() || '';
  if (!slug) return null;
  if (path.includes('/guides/')) return `/og-guides/${slug}.png`;
  if (path.includes('/comparisons/')) return `/og-comparisons/${slug}.png`;
  if (/^\/(testing|observability|api-development|blog)\/[^/]+\/?$/.test(path)) return `/og-articles/${slug}.png`;
  return null;
}

/** The article's own card if the file exists in public/, else null. */
export function existingArticleOgCard(urlPath: string, root = process.cwd()): string | null {
  const card = articleOgCardPath(urlPath);
  return card && existsSync(join(root, 'public', card)) ? card : null;
}

// Article pages that are hand-written .astro files rather than content-collection entries.
export const ASTRO_ARTICLE_PAGES = [
  '/comparisons/bruno-vs-postman/',
  '/comparisons/playwright-vs-cypress/',
  '/guides/mock-api-playwright/',
  '/api-development/postman-alternatives/',
];
