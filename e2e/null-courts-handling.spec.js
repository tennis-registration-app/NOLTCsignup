// @ts-check
import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Null Courts Handling', () => {

  test('courtboard renders without crashing when board has null court entries', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // Load fixture with null entries in courts array
    const boardState = loadFixture('board-state-with-nulls');
    await setupMockApi(page, { boardState });

    // Navigate to courtboard (use e2e=1 mode)
    await page.goto('src/courtboard/index.html?e2e=1');

    // Wait for board to render - look for court elements
    await expect(page.locator('text=/Court\\s*1/i').first()).toBeVisible({ timeout: 10000 });

    // Verify multiple courts rendered (proves iteration worked past nulls)
    await expect(page.locator('text=/Court\\s*11/i').first()).toBeVisible({ timeout: 5000 });

    // Assert no TypeError or null-related crashes
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });

  test('registration renders without crashing when board has null court entries', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const boardState = loadFixture('board-state-with-nulls');
    await setupMockApi(page, { boardState });

    // Navigate to registration with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load (using same selector as existing tests)
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Verify Clear a court button is also visible (proves app rendered fully)
    await expect(page.locator('[data-testid="clear-court-btn"]')).toBeVisible();

    // Assert no crashes during initial render with null courts
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });

  test('registration flow completes with null court entries using existing member', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const boardState = loadFixture('board-state-with-nulls');
    await setupMockApi(page, { boardState });

    // Navigate to registration with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Use member ID 12345 (Test Player from membersData - known to work in other tests)
    await page.fill('#main-search-input', '12345');
    await page.waitForTimeout(500);

    // Click Test Player suggestion if visible
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Wait for group screen and submit
    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Select a court (Court 1 is available in fixture)
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Court 1")');

    // Verify success screen appears
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Assert no crashes
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });
});
