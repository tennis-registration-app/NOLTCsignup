// @ts-check
import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Block Refresh Wiring', () => {

  test('admin blocks tab reflects new block after refresh', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // Load fixtures for sequencing
    const emptyBlocks = loadFixture('blocks-data-empty');
    const blocksWithNew = loadFixture('blocks-data-with-new-block');

    // Setup with queue:
    // - First get-blocks (List tab click before reload) returns empty
    // - Second get-blocks (List tab click after reload) returns the new block
    await setupMockApi(page, {
      blocksDataQueue: [emptyBlocks, blocksWithNew]
    });

    // Navigate to admin app
    await page.goto('src/admin/index.html?e2e=1');

    // Click Sign In to enter admin panel (same as existing test)
    await page.click('button:has-text("Sign In")');

    // Wait for admin panel to load
    await expect(page.locator('[data-testid="admin-nav-blocks"]')).toBeVisible({ timeout: 10000 });

    // Click blocks tab
    await page.click('[data-testid="admin-nav-blocks"]');

    // Wait for block list container to load
    await expect(page.locator('[data-testid="admin-block-list"]')).toBeVisible({ timeout: 10000 });

    // Click the "List" sub-tab to view existing blocks
    await page.click('button:has-text("List")');

    // Assert NO block time range initially (empty blocks)
    // When empty, the list shows "No blocks scheduled for this day"
    await expect(page.getByText(/04:00.*AM.*06:00.*AM/i)).toHaveCount(0, { timeout: 5000 });

    // Reload to trigger second get-blocks (returns block with "Court Maintenance")
    await page.reload();

    // Click Sign In again after reload
    await page.click('button:has-text("Sign In")');

    // Navigate back to blocks tab
    await expect(page.locator('[data-testid="admin-nav-blocks"]')).toBeVisible({ timeout: 10000 });
    await page.click('[data-testid="admin-nav-blocks"]');

    // Wait for block list
    await expect(page.locator('[data-testid="admin-block-list"]')).toBeVisible({ timeout: 10000 });

    // Click the "List" sub-tab again
    await page.click('button:has-text("List")');

    // Assert the new block is now visible
    // The list view shows court number and time range, not the reason
    // Look for Court 1 with a time range (block was for Court 1)
    await expect(page.getByText(/04:00.*AM.*06:00.*AM/i)).toBeVisible({ timeout: 5000 });

    // Assert no crashes
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });
});
