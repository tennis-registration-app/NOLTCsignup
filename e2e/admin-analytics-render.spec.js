import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';

test.describe('Admin Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should render analytics dashboard without errors', async ({ page }) => {
    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Navigate to admin app
    await page.goto('src/admin/index.html?e2e=1');

    // Click Sign In to enter admin panel
    await page.click('button:has-text("Sign In")');

    // Wait for admin panel to load
    await expect(page.locator('[data-testid="admin-nav-analytics"]')).toBeVisible({ timeout: 10000 });

    // Click analytics tab
    await page.click('[data-testid="admin-nav-analytics"]');

    // Wait for charts container to be visible
    await expect(page.locator('[data-testid="admin-analytics-charts"]')).toBeVisible({ timeout: 10000 });

    // Verify no JavaScript errors (filter out expected messages)
    const unexpectedErrors = consoleErrors.filter(e =>
      !e.includes('[Mock API]') &&
      !e.includes('404') &&
      !e.includes('Failed to load resource')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
