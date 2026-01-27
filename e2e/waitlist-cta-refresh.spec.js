// @ts-check
import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Waitlist CTA Refresh Wiring', () => {

  test('CTA updates when court becomes available after refresh', async ({ page }) => {
    // Capture page errors BEFORE navigation
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    // Load fixtures for sequencing
    const allOccupied = loadFixture('board-state-all-occupied');
    const oneAvailable = loadFixture('board-state-one-available');

    // Setup with queue:
    // - First get-board returns all courts occupied (no CTA)
    // - Second get-board (after reload) returns one court available (CTA visible)
    await setupMockApi(page, {
      boardStateQueue: [allOccupied, oneAvailable]
    });

    // Navigate to registration (same URL as existing waitlist test)
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load (same selector as existing waitlist test)
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // INITIAL STATE: Assert waitlist CTA is NOT visible
    // (all courts occupied, so no "Play Now" option for waitlisted member)
    const waitlistCta = page.locator('[data-testid="waitlist-cta-1"]');
    await expect(waitlistCta).toHaveCount(0, { timeout: 5000 });

    // Trigger refresh (reload to get second board state)
    await page.reload();

    // Wait for app to reload
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // AFTER REFRESH: Assert waitlist CTA IS visible
    // (one court available, so "Play Now" option appears for waitlisted member)
    await expect(waitlistCta).toBeVisible({ timeout: 5000 });

    // Assert no crashes
    const crashErrors = pageErrors.filter(e =>
      e.includes('Cannot read properties of null') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('TypeError')
    );
    expect(crashErrors).toHaveLength(0);
  });
});
