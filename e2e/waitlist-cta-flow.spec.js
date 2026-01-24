import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Waitlist CTA Play-Now Flow', () => {
  test('should show CTA and assign court when waitlist entry exists with free court', async ({ page }) => {
    // Use waitlist fixture
    const waitlistBoard = loadFixture('board-state-waitlist');

    // Setup mock with waitlist fixture
    await setupMockApi(page, { boardState: waitlistBoard });

    // Navigate to registration app
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Assert waitlist CTA is visible
    const waitlistCta = page.locator('[data-testid="waitlist-cta-1"]');
    await expect(waitlistCta).toBeVisible({ timeout: 5000 });

    // Click the CTA
    await waitlistCta.click();

    // Wait for court selection screen
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });

    // Select the free court (Court 1 from fixture)
    await page.click('button:has-text("Court 1")');

    // Assert success screen appears (deterministic assertion)
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });
  });
});
