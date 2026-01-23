import { loadFixture } from './fixtures.js';

/**
 * Sets up API route interception for E2E tests.
 * Intercepts all Supabase Edge Function calls and returns fixture data.
 */
export async function setupMockApi(page, options = {}) {
  const boardState = options.boardState || loadFixture('board-state');
  const analyticsData = options.analyticsData || loadFixture('analytics-data');
  const settingsData = options.settingsData || loadFixture('settings-data');
  const blocksData = options.blocksData || loadFixture('blocks-data');

  // Mock members data for autocomplete (snake_case to match API format)
  const membersData = {
    ok: true,
    members: [
      { id: 'member-12345', account_id: 'acc-12345', member_number: '12345', display_name: 'Test Player', is_primary: true },
      { id: 'member-67890', account_id: 'acc-67890', member_number: '67890', display_name: 'Another Player', is_primary: true },
    ],
  };

  // Intercept ALL Supabase function calls with a single handler
  await page.route('**/functions/v1/*', async (route) => {
    const url = route.request().url();
    const endpoint = url.split('/functions/v1/')[1]?.split('?')[0];

    console.log(`[Mock API] Intercepted: ${endpoint} from ${url}`);

    switch (endpoint) {
      case 'get-board':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(boardState),
        });

      case 'get-members':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(membersData),
        });

      case 'assign-court':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            serverNow: new Date().toISOString(),
            court: 1,
            sessionId: 'session-new-123',
            message: 'Court assigned successfully',
          }),
        });

      case 'get-analytics':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(analyticsData),
        });

      case 'get-settings':
      case 'system-settings':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(settingsData),
        });

      case 'update-system-settings':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            serverNow: new Date().toISOString(),
            message: 'Settings updated',
          }),
        });

      case 'get-blocks':
      case 'list-blocks':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(blocksData),
        });

      case 'create-block':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            serverNow: new Date().toISOString(),
            block: {
              id: 'block-new-123',
              courtNumber: 1,
              reason: 'Test block',
              startsAt: new Date().toISOString(),
              endsAt: new Date(Date.now() + 3600000).toISOString(),
            },
          }),
        });

      case 'get-frequent-partners':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, partners: [] }),
        });

      case 'get-usage-comparison':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: [] }),
        });

      case 'get-transactions':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, transactions: [] }),
        });

      default:
        console.log(`[Mock API] Unhandled endpoint: ${endpoint}`);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, serverNow: new Date().toISOString() }),
        });
    }
  });
}
