// Post-build: every built page that maps to an article OG card (same mapping as
// check-article-og-cards.ts) must point og:image and twitter:image at that card,
// as an absolute https://devxtools.dev URL, and the card must be in dist/.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { existingArticleOgCard } from '../src/lib/article-og';

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
if (errors) { console.error(`\n✗ ${errors} article OG error(s)`); process.exit(1); }
console.log(`✓ ${withCard} article pages use their own OG card`);
