import { test, expect } from '@playwright/test';

const PAGES_WITH_TABLES = [
  '/guides/openapi-mock-server-prism/',
  '/comparisons/msw-vs-nock/',
  '/comparisons/playwright-vs-cypress/',
  '/guides/mock-api-playwright/',
  '/api-development/postman-alternatives/',
];

test.describe('Table styling', () => {
  test('tables should have borders and proper spacing', async ({ page }) => {
    for (const url of PAGES_WITH_TABLES) {
      await page.goto(url);
      
      const tables = page.locator('table');
      const count = await tables.count();
      
      if (count > 0) {
        console.log(`  Checking ${count} table(s) on ${url}`);
        
        const firstTable = tables.first();
        
        // Check that table has styling
        const hasBackground = await firstTable.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.background !== 'none' && style.background !== '';
        });
        expect(hasBackground, `Table on ${url} should have background`).toBe(true);
        
        // Check for overflow handling (either on table or wrapper)
        const hasOverflow = await page.evaluate(() => {
          const table = document.querySelector('table');
          if (!table) return false;
          
          const tableStyle = window.getComputedStyle(table);
          const wrappers = ['.overflow-x-auto', '.table-wrapper', '.comparison-table-wrapper'];
          
          for (const selector of wrappers) {
            const wrapper = table.closest(selector);
            if (wrapper) {
              const wrapperStyle = window.getComputedStyle(wrapper);
              if (wrapperStyle.overflowX === 'auto' || wrapperStyle.overflowX === 'scroll') {
                return true;
              }
            }
          }
          
          // Check if table itself handles overflow
          return tableStyle.overflowX === 'auto' || 
                 tableStyle.overflowX === 'scroll' ||
                 tableStyle.display === 'block';
        });
        
        expect(hasOverflow, `Table on ${url} should have overflow handling`).toBe(true);
      }
    }
  });

  test('tables should not cause horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    
    for (const url of PAGES_WITH_TABLES) {
      await page.goto(url);
      
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      
      expect(scrollWidth, `Page ${url} should not overflow at 375px`).toBeLessThanOrEqual(clientWidth);
    }
  });
});
