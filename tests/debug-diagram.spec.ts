import { test } from '@playwright/test';

test('debug diagram content', async ({ page }) => {
  await page.goto('http://localhost:4321/guides/mock-api-react-native/');
  await page.waitForSelector('.dx-diagram', { state: 'visible' });
  
  const firstDiagram = page.locator('.dx-diagram').first();
  
  // Get the full HTML of the figure
  const html = await firstDiagram.innerHTML();
  console.log('Full figure HTML (first 500 chars):');
  console.log(html.slice(0, 500));
  
  // Check if figcaption exists
  const figcaptionCount = await firstDiagram.locator('figcaption').count();
  console.log(`\nFigcaption count: ${figcaptionCount}`);
  
  if (figcaptionCount > 0) {
    const captionText = await firstDiagram.locator('figcaption').textContent();
    console.log(`Caption text: "${captionText}"`);
  }
  
  // Check SVG
  const svgCount = await firstDiagram.locator('svg').count();
  console.log(`\nSVG count: ${svgCount}`);
  
  if (svgCount > 0) {
    const svgAlt = await firstDiagram.locator('svg').first().getAttribute('aria-label');
    console.log(`First SVG aria-label: "${svgAlt?.slice(0, 60)}..."`);
  }
});
