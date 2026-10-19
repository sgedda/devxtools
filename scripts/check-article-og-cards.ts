// Pre-build: every article (content collection + hand-written .astro article pages)
// must have its OG card in public/, at the path given by src/lib/article-og.ts.
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { articleOgCardPath, ASTRO_ARTICLE_PAGES } from '../src/lib/article-og';

export function articleUrls(): string[] {
  const dir = join(process.cwd(), 'src', 'content', 'articles');
  const fromContent = readdirSync(dir)
    .filter(f => /\.mdx?$/.test(f))
    .map(f => matter(readFileSync(join(dir, f), 'utf-8')).data.slug as string);
  return [...fromContent, ...ASTRO_ARTICLE_PAGES];
}

let missing = 0;
for (const url of articleUrls()) {
  const card = articleOgCardPath(url);
  if (!card) { console.log(`✗ No OG card mapping for ${url}`); missing++; continue; }
  if (existsSync(join(process.cwd(), 'public', card))) console.log(`✓ Found: ${card.slice(1)}`);
  else { console.log(`✗ Missing: ${card.slice(1)}`); missing++; }
}
if (missing > 0) {
  console.error(`\n✗ ${missing} OG card(s) missing. Run 'npm run og:articles -- --missing' to generate them.`);
  process.exit(1);
}
console.log('\n✓ All article OG cards present.');
