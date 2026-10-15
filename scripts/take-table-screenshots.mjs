import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const baseURL = 'http://localhost:4321';
const pages = [
  { url: '/guides/openapi-mock-server-prism/', name: 'prism' },
  { url: '/comparisons/msw-vs-nock/', name: 'msw-vs-nock' }
];

const outputDir = '/opt/cursor/artifacts';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const { url, name } of pages) {
  console.log(`\nCapturing ${name}...`);
  
  // Desktop light mode
  const lightPage = await browser.newPage({
    viewport: { width: 1280, height: 1024 },
    colorScheme: 'light'
  });
  await lightPage.goto(`${baseURL}${url}`, { waitUntil: 'networkidle' });
  const tables = await lightPage.locator('table').count();
  console.log(`  Found ${tables} table(s) on ${url}`);
  
  if (tables > 0) {
    await lightPage.screenshot({ 
      path: `${outputDir}/${name}-before-light.png`,
      fullPage: true 
    });
  }
  await lightPage.close();
  
  // Desktop dark mode
  const darkPage = await browser.newPage({
    viewport: { width: 1280, height: 1024 },
    colorScheme: 'dark'
  });
  await darkPage.goto(`${baseURL}${url}`, { waitUntil: 'networkidle' });
  await darkPage.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await darkPage.waitForTimeout(500);
  
  if (tables > 0) {
    await darkPage.screenshot({ 
      path: `${outputDir}/${name}-before-dark.png`,
      fullPage: true 
    });
  }
  await darkPage.close();
  
  // Mobile (375px) light mode
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 800 },
    colorScheme: 'light'
  });
  await mobilePage.goto(`${baseURL}${url}`, { waitUntil: 'networkidle' });
  
  if (tables > 0) {
    await mobilePage.screenshot({ 
      path: `${outputDir}/${name}-before-mobile.png`,
      fullPage: true 
    });
  }
  await mobilePage.close();
}

await browser.close();
console.log('\n✅ Screenshots saved to', outputDir);
