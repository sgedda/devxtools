import { chromium } from 'playwright';

const url = 'http://localhost:4321/api-development/postman-alternatives/';
const width = 390;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height: 800 }
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const wideUls = await page.evaluate(() => {
  const viewport = document.documentElement.clientWidth;
  const results = [];
  
  document.querySelectorAll('ul').forEach(ul => {
    if (ul.scrollWidth > viewport) {
      const style = window.getComputedStyle(ul);
      results.push({
        scrollWidth: ul.scrollWidth,
        classes: ul.className,
        overflowX: style.overflowX,
        text: ul.textContent.substring(0, 100),
      });
    }
  });
  
  return results;
});

console.log('Wide ULs:');
wideUls.forEach((ul, i) => {
  console.log(`\n${i + 1}. scrollWidth: ${ul.scrollWidth}px`);
  console.log(`   classes: ${ul.classes}`);
  console.log(`   overflowX: ${ul.overflowX}`);
  console.log(`   text: "${ul.text}..."`);
});

await browser.close();
