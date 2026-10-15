import { test, expect } from '@playwright/test';

const PAGES_WITH_TABLES = [
  '/guides/openapi-mock-server-prism/',
  '/comparisons/msw-vs-nock/',
  '/comparisons/playwright-vs-cypress/',
  '/guides/mock-api-playwright/',
  '/api-development/postman-alternatives/',
];

test.describe('Table styling', () => {
  test('markdown tables should be wrapped and have proper structure', async ({ page }) => {
    await page.goto('/guides/openapi-mock-server-prism/');
    
    // Wait for the script to run
    await page.waitForTimeout(500);
    
    const tables = page.locator('table');
    const count = await tables.count();
    
    expect(count, 'Should have tables on the page').toBeGreaterThan(0);
    
    const firstTable = tables.first();
    
    // Check table has wrapper
    const hasWrapper = await firstTable.evaluate((el) => {
      const parent = el.parentElement;
      return parent?.classList.contains('table-wrapper') || 
             parent?.classList.contains('overflow-x-auto');
    });
    expect(hasWrapper, 'Table should be wrapped in overflow container').toBe(true);
    
    // Check first column has th scope="row"
    const firstRowHeader = await firstTable.locator('tbody tr:first-child th[scope="row"]').count();
    expect(firstRowHeader, 'First column should use th with scope="row"').toBeGreaterThan(0);
    
    // Check table has caption (even if sr-only)
    const hasCaption = await firstTable.locator('caption').count();
    expect(hasCaption, 'Table should have a caption').toBeGreaterThan(0);
  });

  test('tables should not cause horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    
    for (const url of PAGES_WITH_TABLES) {
      await page.goto(url);
      await page.waitForTimeout(500); // Wait for wrapper script
      
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      
      expect(scrollWidth, `Page ${url} should not overflow at 375px`).toBeLessThanOrEqual(clientWidth);
    }
  });
});
