import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

test.describe('Clear Court Flow', () => {
  test('should complete clear court flow for occupied court', async ({ page }) => {
    // Use default board-state (has court 3 occupied)
    await setupMockApi(page);

    // Navigate to registration app
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Click "Clear a court" button
    const clearCourtBtn = page.locator('[data-testid="clear-court-btn"]');
    await expect(clearCourtBtn).toBeVisible();
    await clearCourtBtn.click();

    // Step 1: Select occupied court (Court 3 from fixture)
    const court3Btn = page.locator('button:has-text("Court 3")');
    await expect(court3Btn).toBeVisible({ timeout: 5000 });
    await court3Btn.click();

    // Step 2: Confirm with "We are finished"
    const confirmBtn = page.locator('[data-testid="clear-confirm-leaving"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Assert success state (either success message or return to home)
    // Wait for either success text or home screen
    await expect(
      page.locator('text=now available').or(page.locator('#main-search-input'))
    ).toBeVisible({ timeout: 10000 });
  });
});
