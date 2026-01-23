import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

test.describe('Registration Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should complete registration flow successfully', async ({ page }) => {
    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Enter member ID
    await page.fill('#main-search-input', '12345');

    // Wait for suggestions to appear and click on a suggestion
    // The app uses autocomplete, so we need to wait for suggestions
    await page.waitForTimeout(500);

    // If suggestions appear, click the first one
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Wait for group screen and click submit button
    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Wait for court selection screen and select a court
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Court 1")');

    // Wait for success screen
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Verify court assignment is displayed
    await expect(page.locator('[data-testid="reg-assigned-court"]')).toBeVisible();

    // Filter out expected console messages (Mock API logs, 404 for static resources)
    const unexpectedErrors = consoleErrors.filter(e =>
      !e.includes('[Mock API]') &&
      !e.includes('404') &&
      !e.includes('Failed to load resource')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
