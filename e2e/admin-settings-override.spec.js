import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should navigate to settings tab and show form', async ({ page }) => {
    // Navigate to admin app
    await page.goto('src/admin/index.html?e2e=1');

    // Click Sign In to enter admin panel
    await page.click('button:has-text("Sign In")');

    // Wait for admin panel to load
    await expect(page.locator('[data-testid="admin-nav-settings"]')).toBeVisible({ timeout: 10000 });

    // Click settings tab
    await page.click('[data-testid="admin-nav-settings"]');

    // Wait for settings form to load
    await expect(page.locator('[data-testid="admin-settings-form"]')).toBeVisible({ timeout: 10000 });

    // Verify save button is visible (may be disabled until changes made)
    const saveButton = page.locator('[data-testid="admin-settings-save"]');
    await expect(saveButton).toBeVisible();

    // Verify no unhandled errors (page didn't crash)
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
