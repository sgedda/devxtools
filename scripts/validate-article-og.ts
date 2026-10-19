// Post-build: every built page that maps to an article OG card (same mapping as
// check-article-og-cards.ts) must point og:image and twitter:image at that card,
// as an absolute https://devxtools.dev URL, and the card must be in dist/.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { existingArticleOgCard, ASTRO_ARTICLE_PAGES } from '../src/lib/article-og';

const DIST = join(process.cwd(), 'dist');
const SITE = 'https://devxtools.dev';
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? pages(p) : f === 'index.html' ? [p] : [];
  });
}
const meta = (html: string, attr: string, name: string) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

let errors = 0, withCard = 0;
for (const file of pages(DIST)) {
  const urlPath = file.slice(DIST.length).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf-8');
  if (/http-equiv="refresh"/i.test(html)) continue; // redirect stubs
  const card = existingArticleOgCard(urlPath);
  if (!card) continue;
  withCard++;
  const want = SITE + card;
  for (const [attr, name] of [['property', 'og:image'], ['name', 'twitter:image']]) {
    const got = meta(html, attr, name);
    if (got !== want) {
      console.error(`✗ ${urlPath} ${name} is ${got ?? '(missing)'}${got === `${SITE}/og-image.png` ? ' (default while a card exists)' : ''}, expected ${want}`);
      errors++;
    }
  }
  if (!existsSync(join(DIST, card))) { console.error(`✗ ${card} missing from dist`); errors++; }
}
// Every article page must be built and carry its own card (no default fallback).
const articlesDir = join(process.cwd(), 'src', 'content', 'articles');
const articleUrls = [
  ...readdirSync(articlesDir).filter(f => /\.mdx?$/.test(f)).map(f => matter(readFileSync(join(articlesDir, f), 'utf-8')).data.slug as string),
  ...ASTRO_ARTICLE_PAGES,
];
for (const url of articleUrls) {
  const file = join(DIST, url, 'index.html');
  if (!existsSync(file)) { console.error(`✗ ${url} not built`); errors++; continue; }
  if (!existingArticleOgCard(url)) { console.error(`✗ ${url} has no OG card`); errors++; continue; }
  const got = meta(readFileSync(file, 'utf-8'), 'property', 'og:image');
  if (got !== SITE + existingArticleOgCard(url)) { console.error(`✗ ${url} og:image is ${got}`); errors++; }
}
if (errors) { console.error(`\n✗ ${errors} article OG error(s)`); process.exit(1); }
console.log(`✓ ${withCard} pages use their own OG card; all ${articleUrls.length} articles covered`);
