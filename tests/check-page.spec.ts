import { test } from '@playwright/test';

test('check page content', async ({ page }) => {
  await page.goto('http://localhost:4321/guides/mock-api-react-native/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Get page title
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Check if there's any content
  const bodyText = await page.locator('body').textContent();
  console.log(`Body text length: ${bodyText?.length}`);
  console.log(`First 200 chars: ${bodyText?.slice(0, 200)}`);
  
  // Check for specific elements
  const h1Count = await page.locator('h1').count();
  const h2Count = await page.locator('h2').count();
  const figureCount = await page.locator('figure').count();
  const diagramCount = await page.locator('.dx-diagram').count();
  
  console.log(`h1: ${h1Count}, h2: ${h2Count}, figure: ${figureCount}, dx-diagram: ${diagramCount}`);
});
