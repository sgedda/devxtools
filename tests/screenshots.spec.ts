/**
 * Take screenshots of the Stack Picker for documentation
 */

import { test } from '@playwright/test';

const PICKER_URL = '/picker/';

test.describe('Stack Picker Screenshots', () => {
  test('desktop empty state (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto(PICKER_URL);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.screenshot({ path: 'picker-screenshots/01-desktop-empty.png', fullPage: true });
  });
  
  test('desktop with filters (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto(`${PICKER_URL}?platform=web&need=mock&lang=ts`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.waitForSelector('#result-count:not(:empty)', { timeout: 3000 });
    await page.screenshot({ path: 'picker-screenshots/02-desktop-filtered.png', fullPage: true });
  });
  
  test('desktop empty state with relaxation (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto(`${PICKER_URL}?platform=rn&need=load&lang=go`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'picker-screenshots/03-desktop-empty-state.png', fullPage: true });
  });
  
  test('desktop dark mode (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto(`${PICKER_URL}?platform=web&need=mock`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: 'picker-screenshots/04-desktop-dark.png', fullPage: true });
  });
  
  test('mobile summary bar (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${PICKER_URL}?platform=rn&need=mock`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.waitForSelector('#mobile-summary:not(.hidden)', { timeout: 2000 });
    // Scroll down a bit to show the sticky summary
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'picker-screenshots/05-mobile-summary.png' });
  });
  
  test('mobile sheet open (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${PICKER_URL}?platform=web`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    await page.waitForSelector('#mobile-summary:not(.hidden)', { timeout: 2000 });
    await page.click('#edit-filters-btn');
    await page.waitForSelector('#mobile-sheet:not(.hidden)', { timeout: 2000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'picker-screenshots/06-mobile-sheet.png', fullPage: true });
  });
});
