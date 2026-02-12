import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

test.describe('Tournament Match', () => {
  test('player can designate a tournament match from success screen', async ({ page }) => {
    // Collect console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Setup: mock API with board-state-tournament fixture
    const tournamentFixture = loadFixture('board-state-tournament');
    await setupMockApi(page, { boardState: tournamentFixture });

    // Navigate to registration app with e2e mode
    await page.goto('src/registration/index.html?e2e=1');

    // Wait for app to load
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Enter member ID
    await page.fill('#main-search-input', '12345');

    // Wait for suggestions to appear and click on a suggestion
    await page.waitForTimeout(500);

    // Click the first matching suggestion
    const suggestion = page.locator('button:has-text("Test Player")').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }

    // Wait for group screen and click submit button
    const submitBtn = page.locator('[data-testid="reg-submit-btn"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Wait for court selection screen
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });

    // Select Court 5 (the available court)
    await page.click('button:has-text("Court 5")');

    // Wait for success screen
    await expect(page.locator('[data-testid="reg-success-screen"]')).toBeVisible({ timeout: 10000 });

    // Verify court assignment is displayed
    await expect(page.locator('[data-testid="reg-assigned-court"]')).toBeVisible();

    // Verify "Tournament match?" link is visible
    await expect(page.locator('[data-testid="tournament-match-link"]')).toBeVisible();

    // Verify priority time is shown (not tournament badge yet)
    await expect(page.locator('[data-testid="priority-until"]')).toBeVisible();
    await expect(page.locator('[data-testid="tournament-badge"]')).not.toBeVisible();

    // Click "Tournament match?"
    await page.click('[data-testid="tournament-match-link"]');

    // Verify confirmation modal appears with correct text
    await expect(page.locator('[data-testid="tournament-confirm-modal"]')).toBeVisible();
    await expect(
      page.locator('text=We are registering for a Club tournament match')
    ).toBeVisible();

    // Click "Confirm"
    await page.click('button:has-text("Confirm")');

    // Verify tournament badge appears
    await expect(page.locator('[data-testid="tournament-badge"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=✓ Tournament Match — play until completion')).toBeVisible();

    // Verify "Priority until" is gone
    await expect(page.locator('[data-testid="priority-until"]')).not.toBeVisible();

    // Verify "Tournament match?" link is gone
    await expect(page.locator('[data-testid="tournament-match-link"]')).not.toBeVisible();

    // Filter out expected console messages
    const unexpectedErrors = consoleErrors.filter(
      (e) =>
        !e.includes('[Mock API]') &&
        !e.includes('404') &&
        !e.includes('Failed to load resource')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
