import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import matter from 'gray-matter';
import { articleOgCardPath, ASTRO_ARTICLE_PAGES } from '../src/lib/article-og';

// Usage: npm run og:articles [-- --missing]   (--missing: only cards that don't exist yet)

interface Article {
  url: string;
  title: string;
  tagline: string;
}

function loadArticles(): Article[] {
  const articlesDir = join(process.cwd(), 'src', 'content', 'articles');
  const articles: Article[] = readdirSync(articlesDir)
    .filter(f => /\.mdx?$/.test(f))
    .map(file => {
      const { data } = matter(readFileSync(join(articlesDir, file), 'utf-8'));
      // Long H1s wrap to 3 lines and crowd the card; use the shorter SEO title then.
      const h1 = data.h1 && data.h1.length <= 60 ? data.h1 : undefined;
      return { url: data.slug as string, title: h1 || data.title, tagline: data.description };
    });
  for (const url of ASTRO_ARTICLE_PAGES) {
    const src = readFileSync(join(process.cwd(), 'src/pages', `${url.replace(/^\/|\/$/g, '')}.astro`), 'utf-8');
    const title = src.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || src.match(/\btitle="([^"]+)"/)?.[1];
    const tagline = src.match(/\bdescription="([^"]+)"/)?.[1];
    if (title && tagline) articles.push({ url, title, tagline });
    else console.warn(`! Could not read title/description from ${url}`);
  }
  return articles.filter(a => articleOgCardPath(a.url));
}

const KICKERS: Record<string, [string, string]> = {
  guides: ['Guide', 'Tutorial & best practices'],
  comparisons: ['Comparison', 'Side-by-side analysis'],
  testing: ['Testing', 'Hands-on roundup'],
  observability: ['Observability', 'Hands-on roundup'],
  'api-development': ['API Development', 'Hands-on roundup'],
  blog: ['Blog', 'From the maintainer'],
};

async function generateArticleOGCard(article: Article, browser: any) {
  const card = articleOgCardPath(article.url)!;
  const section = article.url.split('/').filter(Boolean)[0];
  const [kicker, meta] = KICKERS[section] || ['Article', 'In-depth article'];
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  const params = new URLSearchParams({ kicker, title: article.title, tagline: article.tagline, meta });
  const templatePath = join(process.cwd(), 'public', 'og', 'og-template.html');
  try {
    await page.goto(`file://${templatePath}?${params.toString()}`, { waitUntil: 'networkidle0', timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 500));
    const outputPath = join(process.cwd(), 'public', card);
    mkdirSync(dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`✓ Generated ${card}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${card}:`, error);
  }
  await page.close();
}

async function generateAllArticleOGCards() {
  const templatePath = join(process.cwd(), 'public', 'og', 'og-template.html');
  if (!existsSync(templatePath)) {
    console.error('ERROR: og-template.html not found. This script requires PR #13 (brand assets) to be merged first.');
    process.exit(1);
  }
  const onlyMissing = process.argv.includes('--missing');
  const articles = loadArticles().filter(a => !onlyMissing || !existsSync(join(process.cwd(), 'public', articleOgCardPath(a.url)!)));
  console.log(`Generating OG cards for ${articles.length} articles...`);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  for (const article of articles) await generateArticleOGCard(article, browser);
  await browser.close();
  console.log('Done!');
}

generateAllArticleOGCards().catch(console.error);
