import { chromium } from 'playwright';

const url = 'http://localhost:4321/api-development/postman-alternatives/';
const width = 390;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height: 800 }
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const info = await page.evaluate(() => {
  const html = document.documentElement;
  const body = document.body;
  
  return {
    viewportWidth: html.clientWidth,
    htmlScrollWidth: html.scrollWidth,
    bodyScrollWidth: body.scrollWidth,
    bodyOverflowX: window.getComputedStyle(body).overflowX,
  };
});

console.log('Document info:');
console.log(`  Viewport: ${info.viewportWidth}px`);
console.log(`  HTML scrollWidth: ${info.htmlScrollWidth}px`);
console.log(`  Body scrollWidth: ${info.bodyScrollWidth}px`);
console.log(`  Body overflow-x: ${info.bodyOverflowX}`);

await browser.close();
