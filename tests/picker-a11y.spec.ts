/**
 * Accessibility tests for the Stack Picker using axe-core
 * Tests at 375px (mobile) and 1280px (desktop) in both light and dark themes
 * Target: 0 serious/critical violations
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PICKER_URL = '/picker/';

test.describe('Stack Picker Accessibility', () => {
  test.describe('Desktop (1280px)', () => {
    test.use({ viewport: { width: 1280, height: 1024 } });
    
    test('light theme - no critical/serious violations', async ({ page }) => {
      await page.goto(PICKER_URL);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
      
      if (violations.length > 0) {
        console.log('Desktop light violations:', JSON.stringify(violations, null, 2));
      }
    });
    
    test('dark theme - no critical/serious violations', async ({ page }) => {
      await page.goto(PICKER_URL);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
      
      if (violations.length > 0) {
        console.log('Desktop dark violations:', JSON.stringify(violations, null, 2));
      }
    });
  });
  
  test.describe('Mobile (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });
    
    test('light theme - no critical/serious violations', async ({ page }) => {
      await page.goto(PICKER_URL);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
      
      if (violations.length > 0) {
        console.log('Mobile light violations:', JSON.stringify(violations, null, 2));
      }
    });
    
    test('dark theme - no critical/serious violations', async ({ page }) => {
      await page.goto(PICKER_URL);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
      
      if (violations.length > 0) {
        console.log('Mobile dark violations:', JSON.stringify(violations, null, 2));
      }
    });
    
    test('mobile sheet has proper ARIA', async ({ page }) => {
      // Load with filters already set to trigger mobile summary
      await page.goto(`${PICKER_URL}?platform=web`);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      
      // Wait for results to process
      await page.waitForTimeout(500);
      
      // Mobile summary should appear
      await page.waitForSelector('#mobile-summary:not(.hidden)', { timeout: 3000 });
      
      // Open mobile sheet
      await page.locator('#edit-filters-btn').click();
      
      // Wait for sheet to open fully
      await page.waitForSelector('#mobile-sheet:not(.hidden)', { timeout: 3000 });
      await page.waitForSelector('#mobile-sheet-overlay:not(.hidden)', { timeout: 1000 });
      await page.waitForTimeout(300);
      
      // Check ARIA attributes
      const sheet = page.locator('#mobile-sheet');
      await expect(sheet).toHaveAttribute('role', 'dialog');
      await expect(sheet).toHaveAttribute('aria-modal', 'true');
      await expect(sheet).toHaveAttribute('aria-labelledby', 'mobile-sheet-title');
      
      // Check focus is trapped (no critical violations)
      const resultsWithSheet = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const violations = resultsWithSheet.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
    });
  });
  
  test.describe('Filter states', () => {
    test.use({ viewport: { width: 1280, height: 1024 } });
    
    test('filtered state - no critical/serious violations', async ({ page }) => {
      await page.goto(`${PICKER_URL}?platform=web&need=mock&lang=ts`);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      await page.waitForTimeout(500);
      await page.waitForSelector('#result-count:not(:empty)', { timeout: 3000 });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
    });
    
    test('empty state - no critical/serious violations', async ({ page }) => {
      // backend+e2e+go yields empty state (no Go E2E testing tools for backend)
      await page.goto(`${PICKER_URL}?platform=backend&need=e2e&lang=go`);
      await page.waitForSelector('#picker-app:not(.hidden)', { timeout: 5000 });
      await page.waitForTimeout(500);
      await page.waitForSelector('#empty-state:not(.hidden)', { timeout: 3000 });
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const violations = results.violations.filter(v => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(violations).toHaveLength(0);
    });
  });
});
