import { test } from '@playwright/test';

test('comprehensive verification', async ({ page }) => {
  console.log('\n=== VERIFICATION REPORT ===\n');
  
  // Test 1: Diagrams on mock-api-react-native
  console.log('1. Diagrams on /guides/mock-api-react-native/');
  await page.goto('http://localhost:4321/guides/mock-api-react-native/');
  await page.waitForSelector('.dx-diagram', { state: 'visible' });
  
  const diagrams = await page.locator('.dx-diagram').all();
  console.log(`   Found ${diagrams.length} diagrams`);
  
  for (let i = 0; i < diagrams.length; i++) {
    const info = await diagrams[i].evaluate((el) => {
      const caption = el.querySelector('figcaption')?.textContent || 'NO CAPTION';
      const svg = el.querySelector('svg');
      const alt = svg?.getAttribute('aria-label') || 'NO ALT';
      return { caption: caption.slice(0, 50), alt: alt.slice(0, 60) };
    });
    console.log(`   Diagram ${i + 1}: caption="${info.caption}..." alt="${info.alt}..."`);
  }
  
  // Test 2: Diagram responsiveness at 375px
  console.log('\n2. Diagram responsiveness at 375px');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:4321/guides/mock-api-react-native/');
  await page.waitForSelector('.dx-diagram', { state: 'visible' });
  
  const firstDiagram = page.locator('.dx-diagram').first();
  const overflow = await firstDiagram.evaluate((el) => {
    const frame = el.querySelector('.dx-figure__frame');
    const svg = el.querySelector('svg');
    return {
      frameWidth: frame?.clientWidth,
      svgWidth: svg?.clientWidth,
      svgScrollWidth: svg?.scrollWidth,
      overflows: (svg?.scrollWidth || 0) > (frame?.clientWidth || 0),
    };
  });
  console.log(`   Frame width: ${overflow.frameWidth}px, SVG width: ${overflow.svgWidth}px`);
  console.log(`   ${overflow.overflows ? '✓ SVG scrolls inside frame' : '✓ SVG fits without scrolling'}`);
  
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Test 3: H2 margins on faker-js
  console.log('\n3. H2 margins on /guides/faker-js-test-data-factories/');
  await page.goto('http://localhost:4321/guides/faker-js-test-data-factories/');
  await page.waitForSelector('h2', { state: 'visible' });
  
  const h2Texts = [
    'Faker.js vs Chance',
    'Common pitfalls',
    'FAQ',
    'Related',
    'Sources'
  ];
  
  for (const text of h2Texts) {
    const h2 = page.locator('h2').filter({ hasText: text });
    const margin = await h2.evaluate((el) => window.getComputedStyle(el).marginTop);
    console.log(`   "${text}": margin-top = ${margin}`);
  }
  
  // Test 4: H2 margins on mock-api-calls-jest and mock-api-playwright
  const guides = [
    '/guides/mock-api-calls-jest/',
    '/guides/mock-api-playwright/'
  ];
  
  for (const guidePath of guides) {
    console.log(`\n4. H2 margins on ${guidePath}`);
    await page.goto(`http://localhost:4321${guidePath}`);
    await page.waitForSelector('h2', { state: 'visible' });
    
    const h2Count = await page.locator('h2').count();
    for (let i = 0; i < h2Count; i++) {
      const info = await page.locator('h2').nth(i).evaluate((el) => ({
        text: el.textContent?.slice(0, 40),
        marginTop: window.getComputedStyle(el).marginTop,
      }));
      console.log(`   H2 "${info.text}": margin-top = ${info.marginTop}`);
    }
  }
  
  console.log('\n');
});
