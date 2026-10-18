import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

// Every article page (comparisons, guides, hub articles) from the built sitemap, plus a few hubs.
const ARTICLE_RE = /^\/(comparisons|guides|api-development|testing|observability|blog)\/[^/]+\/$/;
const HUBS = ['/', '/api-development/', '/guides/', '/comparisons/', '/testing/', '/catalog/', '/tools/postman/'];

// Same set the sitemap lists: content-collection slugs plus hand-written .astro article pages.
function sourcePaths(): string[] {
  const fromCollection = readdirSync('src/content/articles').filter((f) => /\.mdx?$/.test(f))
    .map((f) => readFileSync(`src/content/articles/${f}`, 'utf8').match(/^slug:\s*["']?([^"'\n]+)["']?/m)?.[1])
    .filter((x): x is string => !!x);
  const fromPages = ['comparisons', 'guides', 'api-development', 'testing', 'observability', 'blog'].flatMap((dir) =>
    existsSync(`src/pages/${dir}`)
      ? readdirSync(`src/pages/${dir}`).filter((f) => f.endsWith('.astro') && f !== 'index.astro' && !f.startsWith('['))
          .map((f) => `/${dir}/${f.replace(/\.astro$/, '')}/`)
      : []);
  const excluded = new Set(['/guides/msw-vs-nock-vs-polly/']); // stub, filtered out of the sitemap
  return [...new Set([...fromCollection, ...fromPages])].filter((p) => ARTICLE_RE.test(p) && !excluded.has(p));
}

async function sitemapPaths(baseURL: string): Promise<string[]> {
  let xml = '';
  try {
    const res = await fetch(new URL('/sitemap-0.xml', baseURL));
    if (res.ok) xml = await res.text();
  } catch { /* dev server has no sitemap */ }
  if (!xml && existsSync('dist/sitemap-0.xml')) xml = readFileSync('dist/sitemap-0.xml', 'utf8');
  if (!xml) return sourcePaths(); // CI runs this against `astro dev` before the build
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).filter((p) => ARTICLE_RE.test(p));
}

test.describe('Mobile viewport overflow check', () => {
  test('no horizontal page scroll and no clipped tables/figures at 375px', async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 375, height: 800 });
    const articles = await sitemapPaths(baseURL!);
    expect(articles.length, 'sitemap should list article pages').toBeGreaterThan(10);

    const failures: string[] = [];
    for (const url of [...HUBS, ...articles]) {
      await page.goto(url);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const problems: string[] = [];
        if (doc.scrollWidth > doc.clientWidth) problems.push(`page scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}`);
        const content = document.querySelector('main') ?? document.body;
        // Wide content must sit in a scroll wrapper: walk up to the nearest ancestor that scrolls;
        // an ancestor with overflow hidden/clip reached first, narrower than the element, clips it.
        for (const el of content.querySelectorAll<HTMLElement>('table, pre, figure svg, figure img')) {
          let a = el.parentElement;
          while (a && a !== document.body) {
            const ox = getComputedStyle(a).overflowX;
            if (ox === 'auto' || ox === 'scroll') break;
            if ((ox === 'hidden' || ox === 'clip') && el.getBoundingClientRect().width > a.clientWidth + 1) {
              problems.push(`${el.tagName.toLowerCase()} (${Math.round(el.getBoundingClientRect().width)}px) clipped by ${a.tagName.toLowerCase()}.${a.className} (${a.clientWidth}px)`);
              break;
            }
            a = a.parentElement;
          }
        }
        for (const t of content.querySelectorAll('article table, .dx-prose table')) {
          if (!t.closest('.dx-table__scroll')) problems.push('table without .dx-table__scroll wrapper');
        }
        return problems;
      });
      for (const p of r) failures.push(`${url}: ${p}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
