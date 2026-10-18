import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const OG_GUIDES_DIR = join(process.cwd(), 'public', 'og-guides');
const OG_COMPARISONS_DIR = join(process.cwd(), 'public', 'og-comparisons');

interface Article {
  slug: string;
  title: string;
  tagline: string;
}

function loadArticles(): { guides: Article[], comparisons: Article[] } {
  const articlesDir = join(process.cwd(), 'src', 'content', 'articles');
  const articleFiles = readdirSync(articlesDir).filter(f => /\.mdx?$/.test(f));
  const guides: Article[] = [];
  const comparisons: Article[] = [];

  for (const file of articleFiles) {
    const filePath = join(articlesDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    
    const slugPath = data.slug as string;
    const slug = slugPath.split('/').filter(Boolean).pop() || '';
    
    const article: Article = {
      slug,
      title: data.h1 || data.title,
      tagline: data.description,
    };
    
    if (slugPath.includes('/guides/')) {
      guides.push(article);
    } else if (slugPath.includes('/comparisons/')) {
      comparisons.push(article);
    }
  }

  return { guides, comparisons };
}

async function generateArticleOGCard(article: any, type: 'guide' | 'comparison', browser: any) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  const kicker = type === 'guide' ? 'Guide' : 'Comparison';
  const meta = type === 'guide' ? 'Tutorial & best practices' : 'Side-by-side analysis';
  
  const params = new URLSearchParams({
    kicker,
    title: article.title,
    tagline: article.tagline,
    meta,
  });
  
  const templatePath = join(process.cwd(), 'public', 'og', 'og-template.html');
  const url = `file://${templatePath}?${params.toString()}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const outputDir = type === 'guide' ? OG_GUIDES_DIR : OG_COMPARISONS_DIR;
    const outputPath = join(outputDir, `${article.slug}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    
    console.log(`✓ Generated ${type}/${article.slug}.png`);
  } catch (error) {
    console.error(`✗ Failed to generate ${type}/${article.slug}.png:`, error);
  }
  
  await page.close();
}

async function generateAllArticleOGCards() {
  const templatePath = join(process.cwd(), 'public', 'og', 'og-template.html');
  if (!existsSync(templatePath)) {
    console.error('ERROR: og-template.html not found. This script requires PR #13 (brand assets) to be merged first.');
    process.exit(1);
  }

  if (!existsSync(OG_GUIDES_DIR)) {
    mkdirSync(OG_GUIDES_DIR, { recursive: true });
  }
  
  if (!existsSync(OG_COMPARISONS_DIR)) {
    mkdirSync(OG_COMPARISONS_DIR, { recursive: true });
  }
  
  const { guides, comparisons } = loadArticles();
  console.log(`Generating OG cards for ${guides.length} guides and ${comparisons.length} comparisons...`);
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  
  for (const guide of guides) {
    await generateArticleOGCard(guide, 'guide', browser);
  }
  
  for (const comparison of comparisons) {
    await generateArticleOGCard(comparison, 'comparison', browser);
  }
  
  await browser.close();
  console.log('Done!');
}

generateAllArticleOGCards().catch(console.error);
