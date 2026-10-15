import { chromium } from 'playwright';

interface OverflowElement {
  page: string;
  selector: string;
  scrollWidth: number;
  clientWidth: number;
  overflow: number;
  tagName: string;
  classes: string;
}

const VIEWPORT_WIDTHS = [375, 390];

const TEST_PAGES = [
  { url: '/', name: 'home' },
  { url: '/api-development/', name: 'hub-api-development' },
  { url: '/api-development/postman-alternatives/', name: 'article-postman-alternatives' },
  { url: '/testing/', name: 'hub-testing' },
  { url: '/mocking-test-data/', name: 'hub-mocking' },
  { url: '/catalog/', name: 'catalog' },
  { url: '/tools/postman/', name: 'tool-postman' },
  { url: '/tools/msw/', name: 'tool-msw' },
  { url: '/comparisons/', name: 'comparisons-index' },
  { url: '/comparisons/msw-vs-nock/', name: 'comparison-msw-vs-nock' },
  { url: '/comparisons/msw-vs-nock-vs-polly/', name: 'comparison-msw-vs-nock-vs-polly' },
  { url: '/comparisons/bruno-vs-postman/', name: 'comparison-bruno-vs-postman' },
  { url: '/comparisons/playwright-vs-cypress/', name: 'comparison-playwright-vs-cypress' },
  { url: '/guides/', name: 'guides-index' },
  { url: '/guides/msw-vs-nock-vs-polly/', name: 'guide-msw-vs-nock-vs-polly' },
  { url: '/guides/mock-api-playwright/', name: 'guide-mock-api-playwright' },
];

async function findOverflowingElements(baseUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const allOverflows: OverflowElement[] = [];

  for (const width of VIEWPORT_WIDTHS) {
    console.log(`\n=== Testing at ${width}px width ===\n`);
    
    const context = await browser.newContext({
      viewport: { width, height: 800 }
    });
    const page = await context.newPage();

    for (const testPage of TEST_PAGES) {
      const url = `${baseUrl}${testPage.url}`;
      console.log(`Checking ${testPage.name}: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        
        const overflows = await page.evaluate(() => {
          const results: OverflowElement[] = [];
          const clientWidth = document.documentElement.clientWidth;
          const elements = document.querySelectorAll('*');
          
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const rect = htmlEl.getBoundingClientRect();
            const scrollWidth = htmlEl.scrollWidth;
            
            // Skip if element is not visible
            if (rect.width === 0 || rect.height === 0) return;
            
            // Check if element is wider than viewport
            if (scrollWidth > clientWidth) {
              // Skip if it's a parent and has proper overflow handling
              const style = window.getComputedStyle(htmlEl);
              if (style.overflowX === 'auto' || style.overflowX === 'scroll') return;
              
              results.push({
                page: window.location.pathname,
                selector: htmlEl.tagName.toLowerCase() + 
                         (htmlEl.id ? `#${htmlEl.id}` : '') + 
                         (htmlEl.className && typeof htmlEl.className === 'string' 
                           ? `.${htmlEl.className.split(' ').slice(0, 2).join('.')}` 
                           : ''),
                scrollWidth,
                clientWidth,
                overflow: scrollWidth - clientWidth,
                tagName: htmlEl.tagName.toLowerCase(),
                classes: htmlEl.className && typeof htmlEl.className === 'string' 
                         ? htmlEl.className 
                         : '',
              });
            }
          });
          
          return results;
        });
        
        if (overflows.length > 0) {
          allOverflows.push(...overflows);
          console.log(`  ⚠️  Found ${overflows.length} overflowing elements`);
          overflows.slice(0, 5).forEach(o => {
            console.log(`    - ${o.tagName} (${o.selector}): ${o.overflow}px overflow`);
          });
        } else {
          console.log(`  ✓  No overflow detected`);
        }
      } catch (error) {
        console.error(`  ✗  Error loading page: ${error}`);
      }
    }
    
    await context.close();
  }

  await browser.close();

  // Summary
  console.log('\n=== SUMMARY ===\n');
  if (allOverflows.length === 0) {
    console.log('✓ No overflowing elements found!');
  } else {
    console.log(`Found ${allOverflows.length} total overflowing elements:\n`);
    
    // Group by tag name
    const byTag = allOverflows.reduce((acc, o) => {
      acc[o.tagName] = (acc[o.tagName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('By element type:');
    Object.entries(byTag)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count}`);
      });
    
    console.log('\nTop offenders:');
    allOverflows
      .sort((a, b) => b.overflow - a.overflow)
      .slice(0, 10)
      .forEach((o, i) => {
        console.log(`  ${i + 1}. ${o.tagName} on ${o.page}: +${o.overflow}px`);
        console.log(`     ${o.selector}`);
      });
  }
  
  return allOverflows;
}

const baseUrl = process.argv[2] || 'http://localhost:4321';
findOverflowingElements(baseUrl)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
