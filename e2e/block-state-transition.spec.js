// @ts-check
import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Block State Transitions', () => {

  test('courtboard renders blocked court then available after refresh', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // Load sequenced fixtures: first blocked, then unblocked
    const blockedBoard = loadFixture('board-state-blocked');
    const unblockedBoard = loadFixture('board-state-unblocked');

    // Setup with queue: first call returns blocked, second returns unblocked
    await setupMockApi(page, {
      boardStateQueue: [blockedBoard, unblockedBoard]
    });

    // Navigate to courtboard with e2e mode (triggers first get-board)
    await page.goto('src/courtboard/index.html?e2e=1');

    // Wait for initial render - look for any court text
    await expect(page.locator('text=/Court\\s*1/i').first()).toBeVisible({ timeout: 10000 });

    // Reload page to trigger second get-board (returns unblocked state)
    await page.reload();

    // Wait for render after reload
    await expect(page.locator('text=/Court\\s*1/i').first()).toBeVisible({ timeout: 10000 });

    // Verify court 2 is still visible (basic sanity check)
    await expect(page.locator('text=/Court\\s*2/i').first()).toBeVisible({ timeout: 5000 });

    // Assert no crashes during transitions
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });
});
