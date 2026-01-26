import { loadFixture } from './fixtures.js';

/**
 * Sets up API route interception for E2E tests.
 * Intercepts all Supabase Edge Function calls and returns fixture data.
 */
export async function setupMockApi(page, options = {}) {
  // Support both single boardState and sequenced boardStateQueue
  const boardStateQueue = options.boardStateQueue
    ? [...options.boardStateQueue]  // Clone to avoid mutation
    : [options.boardState || loadFixture('board-state')];

  let boardCallCount = 0;

  const analyticsData = options.analyticsData || loadFixture('analytics-data');
  const settingsData = options.settingsData || loadFixture('settings-data');

  // Support both single blocksData and sequenced blocksDataQueue
  const blocksDataQueue = options.blocksDataQueue
    ? [...options.blocksDataQueue]  // Clone to avoid mutation
    : [options.blocksData || loadFixture('blocks-data')];

  let blocksCallCount = 0;

  // Updated membersData to match fixture names
  const membersData = {
    ok: true,
    members: [
      { id: 'm1', account_id: 'acc-1001', member_number: '1001', display_name: 'John Smith', is_primary: true },
      { id: 'm2', account_id: 'acc-1002', member_number: '1002', display_name: 'Jane Doe', is_primary: true },
      { id: 'member-12345', account_id: 'acc-12345', member_number: '12345', display_name: 'Test Player', is_primary: true },
      { id: 'member-67890', account_id: 'acc-67890', member_number: '67890', display_name: 'Another Player', is_primary: true },
    ],
  };

  // Clear any existing route to prevent collisions
  await page.unroute('**/functions/v1/*').catch(() => {});

  // Intercept ALL Supabase function calls with a single handler
  await page.route('**/functions/v1/*', async (route) => {
    const url = route.request().url();
    const endpoint = url.split('/functions/v1/')[1]?.split('?')[0];

    console.log(`[Mock API] Intercepted: ${endpoint} from ${url}`);

    switch (endpoint) {
      case 'get-board': {
        // Return next item from queue, or repeat last item if exhausted
        const boardState = boardCallCount < boardStateQueue.length
          ? boardStateQueue[boardCallCount]
          : boardStateQueue[boardStateQueue.length - 1];
        boardCallCount++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(boardState),
        });
      }

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
      case 'list-blocks': {
        // Return next item from queue, or repeat last item if exhausted
        const blocksData = blocksCallCount < blocksDataQueue.length
          ? blocksDataQueue[blocksCallCount]
          : blocksDataQueue[blocksDataQueue.length - 1];
        blocksCallCount++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(blocksData),
        });
      }

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

      case 'assign-from-waitlist':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            court: 1,
            sessionId: 'session-waitlist-123',
            message: 'Assigned from waitlist',
          }),
        });

      case 'end-session':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            message: 'Session ended',
          }),
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
