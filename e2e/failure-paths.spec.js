/**
 * Failure-path E2E tests
 *
 * Verifies that backend mutation failures produce visible user feedback,
 * no false success screens, and recoverable UI state.
 *
 * Technique: setupMockApi provides happy-path defaults, then a catch-all
 * route override (registered AFTER setupMockApi) intercepts one endpoint
 * and uses route.fallback() for everything else.
 */
import { test, expect } from '@playwright/test';
import { setupMockApi } from './helpers/mock-api.js';
import { loadFixture } from './helpers/fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Override a single Supabase endpoint to return a failure response.
 * Uses the same glob as setupMockApi so Playwright's last-registered-wins
 * rule applies. Non-matching endpoints fall through via route.fallback().
 */
async function overrideEndpoint(page, endpointName, responseBody) {
  await page.route('**/functions/v1/*', (route) => {
    const url = route.request().url();
    const endpoint = url.split('/functions/v1/')[1]?.split('?')[0];
    if (endpoint === endpointName) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      });
    }
    return route.fallback();
  });
}

/** Drive the registration flow from home to the group screen submit button. */
async function driveToGroupSubmit(page) {
  await page.goto('src/registration/index.html?e2e=1');
  await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

  // Search for test member and select suggestion
  await page.fill('#main-search-input', '12345');
  await page.waitForTimeout(500);
  const suggestion = page.locator('button:has-text("Test Player")').first();
  if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
    await suggestion.click();
  }

  // Wait for group screen submit button
  await expect(page.locator('[data-testid="reg-submit-btn"]')).toBeVisible({ timeout: 10000 });
}

/** Drive from home through group to the court selection screen. */
async function driveToCourtSelection(page) {
  await driveToGroupSubmit(page);
  await page.locator('[data-testid="reg-submit-btn"]').click();
  await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Failure Paths', () => {
  test('assign court failure shows error and no false success', async ({ page }) => {
    await setupMockApi(page);
    await overrideEndpoint(page, 'assign-court', {
      ok: false,
      message: 'Court assignment failed',
    });

    await driveToCourtSelection(page);

    // Click an available court (exact match avoids Court 10/11/12)
    await page.getByRole('button', { name: 'Court 1', exact: true }).click();

    // Assert: error feedback appears (toast text)
    await expect(
      page.getByText('Court assignment failed').or(page.getByText('Failed to assign court'))
    ).toBeVisible({ timeout: 5000 });

    // Assert: success screen does NOT appear
    await expect(page.locator('[data-testid="reg-success-screen"]')).not.toBeVisible();

    // Assert: court selection screen is still showing (recoverable state)
    await expect(page.locator('text=Select Your Court')).toBeVisible();

    // Assert: court buttons are still interactive (isAssigning was reset)
    await expect(page.getByRole('button', { name: 'Court 1', exact: true })).toBeEnabled();
  });

  test('assign court race condition (COURT_OCCUPIED) shows warning', async ({ page }) => {
    await setupMockApi(page);
    await overrideEndpoint(page, 'assign-court', {
      ok: false,
      code: 'COURT_OCCUPIED',
      message: 'Court is no longer available',
    });

    await driveToCourtSelection(page);

    // Click an available court
    await page.getByRole('button', { name: 'Court 1', exact: true }).click();

    // Assert: warning feedback about court being taken
    await expect(page.getByText('court was just taken')).toBeVisible({ timeout: 5000 });

    // Assert: success screen does NOT appear
    await expect(page.locator('[data-testid="reg-success-screen"]')).not.toBeVisible();

    // Assert: user remains on court selection (can pick another court)
    await expect(page.locator('text=Select Your Court')).toBeVisible();
  });

  test('assign from waitlist failure shows error and no false success', async ({ page }) => {
    // Use waitlist fixture: Court 1 available + waitlist entry → triggers CTA on home screen.
    // CTA flow uses assign-from-waitlist endpoint (not assign-court).
    const waitlistBoard = loadFixture('board-state-waitlist');
    await setupMockApi(page, { boardState: waitlistBoard });
    await overrideEndpoint(page, 'assign-from-waitlist', {
      ok: false,
      message: 'Failed to assign court from waitlist',
    });

    await page.goto('src/registration/index.html?e2e=1');
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Click the waitlist CTA on home screen
    const waitlistCta = page.locator('[data-testid="waitlist-cta-1"]');
    await expect(waitlistCta).toBeVisible({ timeout: 5000 });
    await waitlistCta.click();

    // Wait for court selection screen
    await expect(page.locator('text=Select Your Court')).toBeVisible({ timeout: 10000 });

    // Select the available court (Court 1)
    await page.getByRole('button', { name: 'Court 1', exact: true }).click();

    // Assert: error feedback appears
    await expect(
      page.getByText('Failed to assign court from waitlist').or(page.getByText('Failed to assign court'))
    ).toBeVisible({ timeout: 5000 });

    // Assert: success screen does NOT appear
    await expect(page.locator('[data-testid="reg-success-screen"]')).not.toBeVisible();

    // Assert: user remains on court selection (recoverable state)
    await expect(page.locator('text=Select Your Court')).toBeVisible();
  });

  test('clear court failure shows error and no false success', async ({ page }) => {
    await setupMockApi(page);
    await overrideEndpoint(page, 'end-session', {
      ok: false,
      message: 'Session end failed',
    });

    await page.goto('src/registration/index.html?e2e=1');
    await expect(page.locator('#main-search-input')).toBeVisible({ timeout: 10000 });

    // Click "Clear a court" button
    const clearCourtBtn = page.locator('[data-testid="clear-court-btn"]');
    await expect(clearCourtBtn).toBeVisible();
    await clearCourtBtn.click();

    // Select occupied court (Court 3 from default fixture)
    const court3Btn = page.locator('button:has-text("Court 3")');
    await expect(court3Btn).toBeVisible({ timeout: 5000 });
    await court3Btn.click();

    // Confirm with "We are finished"
    const confirmBtn = page.locator('[data-testid="clear-confirm-leaving"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Assert: error feedback appears
    await expect(
      page.getByText("Couldn't clear court").or(page.getByText('clear court'))
    ).toBeVisible({ timeout: 5000 });

    // Assert: no misleading "now available" success text
    await expect(page.locator('text=now available')).not.toBeVisible();
  });
});
