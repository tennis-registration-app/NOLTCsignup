import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Overtime Takeover Eligibility', () => {
  test('should allow overtime court selection when no free playable courts exist', async ({ page }) => {
    // Use overtime-only fixture
    const overtimeBoard = loadFixture('board-state-overtime-only');

    // Setup mock with overtime fixture
    await setupMockApi(page, { boardState: overtimeBoard });

    // Navigate to registration app
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Enter member ID to start registration
    await page.fill('#main-search-input', '12345');

    // Wait for suggestions and select player
    await page.waitForTimeout(500);
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Click submit button
    await page.click('[data-testid="reg-submit-btn"]');

    // Wait for court selection screen with overtime warning
    await expect(page.locator('[data-testid="overtime-warning"]')).toBeVisible({ timeout: 10000 });

    // Assert overtime court 6 is clickable
    const overtimeCourtBtn = page.locator('button:has-text("Court 6")');
    await expect(overtimeCourtBtn).toBeVisible();
    await expect(overtimeCourtBtn).toBeEnabled();

    // Click overtime court
    await overtimeCourtBtn.click();

    // Assert flow advances to success screen
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });
  });
});
