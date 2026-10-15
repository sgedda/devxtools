import { chromium } from 'playwright';

const url = 'http://localhost:4321/comparisons/msw-vs-nock/';
const width = 390;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height: 800 }
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const wideElements = await page.evaluate(() => {
  const viewport = document.documentElement.clientWidth;
  const results = [];
  
  // Find all elements in the article
  const article = document.querySelector('article.comparison');
  if (!article) return [];
  
  const allElements = article.querySelectorAll('*');
  
  allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    // Skip if not visible
    if (rect.width === 0 || rect.height === 0) return;
    
    // Check if element extends beyond viewport
    if (el.scrollWidth > viewport || rect.right > viewport) {
      results.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        classes: el.className || '',
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        rectRight: Math.round(rect.right),
        viewport,
        overflow: el.scrollWidth - viewport,
        overflowX: style.overflowX,
        textContent: el.textContent?.substring(0, 50) || '',
      });
    }
  });
  
  return results.sort((a, b) => b.overflow - a.overflow);
});

console.log('Wide elements (wider than viewport):');
wideElements.slice(0, 15).forEach((el, i) => {
  console.log(`\n${i + 1}. ${el.tag}${el.id ? '#' + el.id : ''}${el.classes ? '.' + el.classes.split(' ').slice(0, 2).join('.') : ''}`);
  console.log(`   scrollWidth: ${el.scrollWidth}px, overflow: +${el.overflow}px`);
  console.log(`   overflowX: ${el.overflowX}`);
  console.log(`   text: "${el.textContent}"`);
});

await browser.close();
