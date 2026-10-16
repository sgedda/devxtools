/**
 * Smoke test for the Stack Picker
 * Tests the built site to catch runtime issues that unit tests miss
 */

import { test, expect } from '@playwright/test';

const PICKER_URL = '/picker/';

test.describe('Stack Picker Smoke Tests', () => {
  test('picker initializes and shows results with filters', async ({ page }) => {
    // Listen for page errors
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    // Load picker with filters
    await page.goto(`${PICKER_URL}?platform=web&need=mock&lang=ts`);
    
    // Wait for picker to initialize
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    
    // Check no JavaScript errors
    expect(pageErrors).toHaveLength(0);
    
    // Check result count is shown and > 0
    const resultCount = await page.locator('#result-count').textContent();
    expect(resultCount).toBeTruthy();
    expect(resultCount).toMatch(/\d+ tools? match/);
    
    // Extract the number
    const match = resultCount!.match(/(\d+) tools? match/);
    expect(match).toBeTruthy();
    const count = parseInt(match![1]);
    expect(count).toBeGreaterThan(0);
    
    // Check that tool cards are visible
    const cards = await page.locator('article').count();
    expect(cards).toBeGreaterThan(0);
  });
  
  test('empty state appears with impossible filter combo', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    // rn+load+go should yield empty state
    await page.goto(`${PICKER_URL}?platform=rn&need=load&lang=go`);
    
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    expect(pageErrors).toHaveLength(0);
    
    // Empty state should be visible
    await page.waitForSelector('#empty-state:not(.hidden)', { timeout: 3000 });
    
    // Should have a Remove button
    const removeButton = await page.locator('#empty-buttons button').first();
    expect(await removeButton.isVisible()).toBe(true);
    expect(await removeButton.textContent()).toContain('Remove');
  });
  
  test('mobile sheet maintains filter state', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    await page.goto(`${PICKER_URL}?platform=web&need=mock`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    
    expect(pageErrors).toHaveLength(0);
    
    // Mobile summary should be visible
    await page.waitForSelector('#mobile-summary:not(.hidden)', { timeout: 2000 });
    
    // Open mobile sheet
    await page.click('#edit-filters-btn');
    await page.waitForSelector('#mobile-sheet:not(.hidden)', { timeout: 2000 });
    
    // Check that web and mock are selected in the sheet
    const webInput = await page.locator('#picker-filters input[name="platform"][value="web"]');
    expect(await webInput.isChecked()).toBe(true);
    
    const mockInput = await page.locator('#picker-filters input[name="need"][value="mock"]');
    expect(await mockInput.isChecked()).toBe(true);
  });
  
  test('web+mock+ts does not show Mockifyer', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    await page.goto(`${PICKER_URL}?platform=web&need=mock&lang=ts`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    
    expect(pageErrors).toHaveLength(0);
    
    // Get all tool card links
    const toolLinks = await page.locator('article a[href*="/tools/"]').allTextContents();
    
    // Mockifyer should not be in the list (it's React Native only)
    expect(toolLinks.some(text => text.includes('Mockifyer'))).toBe(false);
  });
});
