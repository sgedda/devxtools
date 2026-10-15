import puppeteer from 'puppeteer-core';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { getAllTools } from '../src/lib/tools.js';

const OG_DIR = join(process.cwd(), 'public', 'og-tools');

const simpleIconsMap: Record<string, string> = {
  'msw': 'msw',
  'cypress': 'cypress',
  'playwright': 'playwright',
  'postman': 'postman',
  'insomnia': 'insomnia',
  'hoverfly': 'hoverfly',
  'wiremock': 'apachewiremock',
  'pact': 'pact',
  'prism': 'stoplight',
  'faker': 'faker',
  'artillery': 'artillery',
  'k6': 'k6',
  'sentry': 'sentry',
  'datadog': 'datadog',
  'charles': 'charlesproxy',
  'nock': 'npm',
  'pollyjs': 'netflix',
  'miragejs': 'miragejs',
  'mockoon': 'mockoon',
};

const htmlTemplate = readFileSync(join(process.cwd(), 'public', 'og', 'og-template.html'), 'utf-8');

async function generateOGCard(tool: any, browser: any) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  const logoSlug = simpleIconsMap[tool.slug] || '';
  const stars = tool.githubStars 
    ? tool.githubStars >= 1000 
      ? `${(tool.githubStars / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : tool.githubStars.toString()
    : '';
  
  const categories = tool.categories.map((cat: string) => {
    return cat.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }).join(', ');
  
  const languages = tool.languages.slice(0, 2).join(', ');
  const meta = languages;
  
  const params = new URLSearchParams({
    kicker: 'Tool Profile',
    title: tool.name,
    tagline: tool.description,
    meta,
    cats: categories,
    ...(logoSlug && { logo: logoSlug }),
    ...(stars && { stars }),
    ...(tool.license && { license: tool.license }),
  });
  
  const templatePath = join(process.cwd(), 'public', 'og', 'og-template.html');
  const url = `file://${templatePath}?${params.toString()}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const outputPath = join(OG_DIR, `${tool.slug}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    
    console.log(`✓ Generated ${tool.slug}.png`);
    await page.close();
    return true;
  } catch (error) {
    console.error(`✗ Failed to generate ${tool.slug}.png:`, error);
    await page.close();
    return false;
  }
}

async function generateAllOGCards() {
  if (!existsSync(OG_DIR)) {
    mkdirSync(OG_DIR, { recursive: true });
  }
  
  const tools = getAllTools();
  console.log(`Generating OG cards for ${tools.length} tools...`);
  
  const browser = await puppeteer.launch({
    executablePath: chromium.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  
  const results = [];
  for (const tool of tools) {
    const success = await generateOGCard(tool, browser);
    results.push(success);
  }
  
  await browser.close();
  
  const successCount = results.filter(Boolean).length;
  const failureCount = results.length - successCount;
  
  console.log(`Done! ${successCount} succeeded, ${failureCount} failed.`);
  
  if (failureCount > 0) {
    process.exit(1);
  }
}

generateAllOGCards().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
