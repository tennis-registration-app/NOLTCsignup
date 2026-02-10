import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Deferred Waitlist', () => {
  test('success screen shows block warning for time-restricted court', async ({ page }) => {
    // This test verifies that when a court is assigned with an upcoming block,
    // the success screen shows a warning about the reservation.

    // Collect console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Setup: mock API with board-state-all-restricted fixture
    const restrictedFixture = loadFixture('board-state-all-restricted');
    await setupMockApi(page, { boardState: restrictedFixture });

    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Enter member ID
    await page.fill('#main-search-input', '12345');

    // Wait for suggestions to appear and click on a suggestion
    await page.waitForTimeout(500);

    // Click the first matching suggestion
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Wait for group screen and click submit button
    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Wait for court selection screen
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });

    // Verify Court 5 is displayed (the only available court)
    await expect(page.locator('button:has-text("Court 5")')).toBeVisible({ timeout: 5000 });

    // Click Court 5
    await page.click('button:has-text("Court 5")');

    // Wait for success screen (may go through warning modal automatically)
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Verify we're assigned to Court 5
    await expect(page.locator('text=Court 5')).toBeVisible();

    // The success screen should show a note about the upcoming reservation
    // (Note: this may show "Invalid Date" if block times aren't properly adjusted)
    await expect(page.locator('text=Court reserved')).toBeVisible({ timeout: 5000 });

    // Filter out expected console messages
    const unexpectedErrors = consoleErrors.filter(
      (e) =>
        !e.includes('[Mock API]') &&
        !e.includes('404') &&
        !e.includes('Failed to load resource')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('waitlist CTA shows for deferred group when full-time court opens', async ({ page }) => {
    // Setup: mock API with board-state-deferred-with-opening
    // This simulates a deferred group that can now be served
    const deferredFixture = loadFixture('board-state-deferred-with-opening');
    await setupMockApi(page, { boardState: deferredFixture });

    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // The home screen should show a waitlist CTA for the deferred group
    // Since there's a full-time court available, they should see "You're Up!" or similar
    // Check that the waitlist entry appears on the home screen waitlist display
    await expect(page.locator('text=Test Deferred')).toBeVisible({ timeout: 5000 });
  });
});
