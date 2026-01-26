import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

/**
 * Regression test for Home button freeze on Success screen.
 *
 * Issue: Browser compositor hit-test mismatch caused Home button clicks to be
 * swallowed when header was inside scroll container (overflow-y-auto).
 *
 * Fix: Restructured SuccessCard so header stays outside scroll context.
 *
 * This test verifies the Home button is clickable immediately after the
 * Success screen appears.
 */
test.describe('Success Screen Home Button', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('Home button should be clickable immediately on Success screen', async ({ page }) => {
    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Enter member ID
    await page.fill('#main-search-input', '12345');
    await page.waitForTimeout(500);

    // Click first suggestion if visible
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Submit to get to court selection
    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Select a court
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Court 1")');

    // Wait for success screen
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Verify Home button is visible and enabled
    // Use locator with data-testid attribute directly for reliability
    const homeBtn = page.locator('[data-testid="success-home-btn"]');
    await expect(homeBtn).toBeVisible({ timeout: 5000 });
    await expect(homeBtn).toBeEnabled();

    // Verify the button receives clicks (hit-test regression guard)
    const box = await homeBtn.boundingBox();
    expect(box).not.toBeNull();

    const hitElement = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el?.getAttribute('data-testid') || el?.tagName?.toLowerCase();
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    );

    // The hit target should be the button itself (or inside it)
    // Accept 'success-home-btn' or 'button' (the button element)
    expect(['success-home-btn', 'button']).toContain(hitElement);

    // Click the Home button
    await homeBtn.click();

    // Verify we navigated back to home (success screen should be gone)
    await expect(page.locator('[data-testid="reg-success-screen"]')).not.toBeVisible({ timeout: 5000 });

    // Should be back on the main search screen
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 5000 });
  });

  test('Header should be outside scroll container (layout regression)', async ({ page }) => {
    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Complete registration flow to get to success screen
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });
    await page.fill('#main-search-input', '12345');
    await page.waitForTimeout(500);

    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Court 1")');

    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Verify header and main content exist
    const header = page.locator('[data-testid="success-header"]');
    const main = page.locator('[data-testid="success-main"]');

    await expect(header).toBeVisible({ timeout: 5000 });
    await expect(main).toBeVisible({ timeout: 5000 });

    // Verify header is positioned above main content (not overlapping)
    const headerBox = await header.boundingBox();
    const mainBox = await main.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(mainBox).not.toBeNull();

    // Header bottom should be at or above main top (no overlap)
    expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(mainBox.y + 1); // 1px tolerance
  });
});
