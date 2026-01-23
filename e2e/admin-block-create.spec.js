import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

test.describe('Admin Block Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should navigate to blocks tab and show block list', async ({ page }) => {
    // Navigate to admin app
    await page.goto('src/admin/index.html?e2e=1');

    // Click Sign In to enter admin panel
    await page.click('button:has-text("Sign In")');

    // Wait for admin panel to load
    await expect(page.locator('[data-testid="admin-nav-blocks"]')).toBeVisible({ timeout: 10000 });

    // Click blocks tab
    await page.click('[data-testid="admin-nav-blocks"]');

    // Wait for block list to load
    await expect(page.locator('[data-testid="admin-block-list"]')).toBeVisible({ timeout: 10000 });

    // Verify the create block button is visible (may be disabled until courts selected)
    const createButton = page.locator('[data-testid="admin-block-create-btn"]');
    await expect(createButton).toBeVisible();

    // Verify no unhandled errors (page didn't crash)
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
