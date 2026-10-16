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
    
    // Wait a moment for debounced result count
    await page.waitForTimeout(500);
    
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
    
    // rn+load+ruby should yield empty state (no Ruby load testing tools)
    await page.goto(`${PICKER_URL}?platform=rn&need=load&lang=ruby`);
    
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    expect(pageErrors).toHaveLength(0);
    
    // Wait for results to render
    await page.waitForTimeout(500);
    
    // Empty state should be visible
    await page.waitForSelector('#empty-state:not(.hidden)', { timeout: 3000 });
    
    // Should have Remove and Clear buttons
    const buttons = await page.locator('#empty-buttons button');
    expect(await buttons.count()).toBeGreaterThan(0);
    const firstButton = await buttons.first().textContent();
    expect(firstButton).toContain('Remove');
  });
  
  test('mobile sheet maintains filter state', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    await page.goto(`${PICKER_URL}?platform=web&need=mock`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    
    expect(pageErrors).toHaveLength(0);
    
    // Wait for results to process
    await page.waitForTimeout(500);
    
    // Mobile summary should be visible
    await page.waitForSelector('#mobile-summary:not(.hidden)', { timeout: 3000 });
    
    // Open mobile sheet - click and wait for sheet to be visible
    await page.locator('#edit-filters-btn').click();
    
    // Wait for sheet to open (check multiple conditions)
    await page.waitForSelector('#mobile-sheet:not(.hidden)', { timeout: 3000 });
    await page.waitForSelector('#mobile-sheet-overlay:not(.hidden)', { timeout: 1000 });
    
    // Wait a moment for form to be moved into sheet
    await page.waitForTimeout(300);
    
    // Check that web and mock are selected in the sheet
    const webInput = page.locator('#picker-filters input[name="platform"][value="web"]');
    await expect(webInput).toBeChecked();
    
    const mockInput = page.locator('#picker-filters input[name="need"][value="mock"]');
    await expect(mockInput).toBeChecked();
  });
  
  test('web+mock+ts does not show Mockifyer', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    
    await page.goto(`${PICKER_URL}?platform=web&need=mock&lang=ts`);
    await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
    
    expect(pageErrors).toHaveLength(0);
    
    // Wait for results to render
    await page.waitForTimeout(500);
    
    // Check visible result cards don't contain Mockifyer (it's React Native only)
    const mockifyerCards = await page.locator('article', { hasText: 'Mockifyer' }).count();
    expect(mockifyerCards).toBe(0);
  });
});
