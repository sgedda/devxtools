import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = '/tmp/screenshots';

async function takeScreenshots() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });

  const page = await browser.newPage();
  
  // Set viewport for desktop
  await page.setViewport({ width: 1200, height: 800 });
  
  console.log('Taking screenshots...');
  
  // Home page - Light mode
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, 'header-light.png'),
    clip: { x: 0, y: 0, width: 1200, height: 80 }
  });
  console.log('✓ header-light.png');
  
  // Toggle dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, 'header-dark.png'),
    clip: { x: 0, y: 0, width: 1200, height: 80 }
  });
  console.log('✓ header-dark.png');
  
  // Full page light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, 'home-light.png'),
    fullPage: false,
  });
  console.log('✓ home-light.png');
  
  // Full page dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, 'home-dark.png'),
    fullPage: false,
  });
  console.log('✓ home-dark.png');
  
  // Favicon screenshot (from browser tab)
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle0' });
  const faviconUrl = await page.evaluate(() => {
    const link = document.querySelector('link[rel="icon"]');
    return link ? link.href : null;
  });
  
  if (faviconUrl) {
    await page.goto(faviconUrl);
    await page.setViewport({ width: 512, height: 512 });
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'favicon.png'),
    });
    console.log('✓ favicon.png');
  }
  
  await browser.close();
  console.log(`\nScreenshots saved to ${SCREENSHOTS_DIR}`);
}

takeScreenshots().catch(console.error);
