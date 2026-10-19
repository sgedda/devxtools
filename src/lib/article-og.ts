import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Same mapping as scripts/generate-article-og-cards.ts and check-article-og-cards.ts:
 * an article whose URL contains /guides/ uses public/og-guides/<last segment>.png,
 * one under /comparisons/ uses public/og-comparisons/<last segment>.png.
 */
export function articleOgCardPath(urlPath: string): string | null {
  const path = urlPath.replace(/^https?:\/\/[^/]+/, '');
  const slug = path.split('/').filter(Boolean).pop() || '';
  if (!slug) return null;
  if (path.includes('/guides/')) return `/og-guides/${slug}.png`;
  if (path.includes('/comparisons/')) return `/og-comparisons/${slug}.png`;
  return null;
}

/** The article's own card if the file exists in public/, else null. */
export function existingArticleOgCard(urlPath: string, root = process.cwd()): string | null {
  const card = articleOgCardPath(urlPath);
  return card && existsSync(join(root, 'public', card)) ? card : null;
}
