import { chromium } from 'playwright';

const url = 'http://localhost:4321/api-development/postman-alternatives/';
const width = 390;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height: 800 }
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const offenders = await page.evaluate(() => {
  const viewport = document.documentElement.clientWidth;
  const results = [];
  
  // Get all elements
  const elements = document.querySelectorAll('*');
  
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    // Skip if not visible
    if (rect.width === 0 || rect.height === 0) return;
    
    // Skip if it has overflow-x auto/scroll (it's meant to scroll)
    if (style.overflowX === 'auto' || style.overflowX === 'scroll') return;
    
    // Check if element extends beyond viewport
    if (el.scrollWidth > viewport) {
      // Skip if it's a child of an overflow-x auto container
      let parent = el.parentElement;
      let hasScrollParent = false;
      while (parent) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.overflowX === 'auto' || parentStyle.overflowX === 'scroll') {
          hasScrollParent = true;
          break;
        }
        parent = parent.parentElement;
      }
      
      if (!hasScrollParent) {
        results.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          classes: el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0, 3).join(' ') : '',
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflow: el.scrollWidth - viewport,
          overflowX: style.overflowX,
        });
      }
    }
  });
  
  return results.sort((a, b) => b.overflow - a.overflow).slice(0, 10);
});

console.log('Top 10 offenders NOT inside scroll containers:');
offenders.forEach((o, i) => {
  console.log(`\n${i + 1}. ${o.tag}${o.id ? '#' + o.id : ''}${o.classes ? '.' + o.classes.replace(/ /g, '.') : ''}`);
  console.log(`   scrollWidth: ${o.scrollWidth}px (${o.overflow}px overflow)`);
  console.log(`   overflowX: ${o.overflowX}`);
});

await browser.close();
