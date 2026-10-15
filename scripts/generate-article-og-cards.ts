// This script generates OG cards for guides and comparisons
// DEPENDENCY: Requires PR #13 (brand assets) to be merged first
// The og-template.html and Puppeteer setup from PR #13 are prerequisites

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OG_GUIDES_DIR = join(process.cwd(), 'public', 'og-guides');
const OG_COMPARISONS_DIR = join(process.cwd(), 'public', 'og-comparisons');

// Article metadata - sync with actual guide and comparison pages
const guides = [
  {
    slug: 'spec-first-mocking-prism-openapi',
    title: 'Spec-First Mocking with Prism and OpenAPI',
    tagline: 'Generate mock servers directly from your OpenAPI specifications using Prism.',
  },
  {
    slug: 'keeping-mocks-honest-pact',
    title: 'Keeping Mocks Honest with Pact',
    tagline: 'Use consumer-driven contract testing to ensure your mocks stay in sync with real APIs.',
  },
  {
    slug: 'react-native-mocking-mockifyer',
    title: 'How to Mock APIs in React Native',
    tagline: 'Compare MSW, MirageJS, and Mockifyer for mocking HTTP requests in React Native applications.',
  },
  {
    slug: 'realistic-test-data-faker-factories',
    title: 'Realistic Test Data with Faker and Factories',
    tagline: 'Create maintainable, realistic test data using Faker and factory patterns with Fishery.',
  },
  {
    slug: 'msw-vs-nock-vs-polly',
    title: 'MSW vs Nock vs Polly.js',
    tagline: 'Compare three popular HTTP mocking approaches for JavaScript testing.',
  },
];

const comparisons = [
  {
    slug: 'msw-vs-nock',
    title: 'MSW vs Nock',
    tagline: 'Choosing between the two most popular HTTP mocking libraries for JavaScript and TypeScript.',
  },
  {
    slug: 'msw-vs-nock-vs-polly',
    title: 'MSW vs Nock vs Polly.js',
    tagline: 'Compare MSW, Nock, and Polly.js for HTTP mocking in JavaScript and TypeScript projects.',
  },
];

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
  // Check if og-template.html exists (from PR #13)
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
