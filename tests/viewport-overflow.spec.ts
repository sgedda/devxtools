import { test, expect } from '@playwright/test';

const KEY_PAGES = [
  '/',
  '/api-development/',
  '/api-development/postman-alternatives/',
  '/catalog/',
  '/tools/postman/',
  '/comparisons/msw-vs-nock/',
  '/comparisons/bruno-vs-postman/',
  '/comparisons/playwright-vs-cypress/',
  '/guides/msw-vs-nock-vs-polly/',
  '/guides/mock-api-playwright/',
];

test.describe('Mobile viewport overflow check', () => {
  test('should not have horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    
    for (const url of KEY_PAGES) {
      await page.goto(url);
      
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      
      expect(scrollWidth, `Page ${url} should not have horizontal overflow`).toBeLessThanOrEqual(clientWidth);
    }
  });
});
