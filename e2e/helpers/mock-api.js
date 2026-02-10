import { loadFixture } from './fixtures.js';

/**
 * Adjusts block fixture dates to be relative to today (local time).
 * Preserves the time-of-day from the original fixture but changes the date to today.
 * Uses local date (not UTC) to match browser's Date behavior.
 * This makes tests time-independent.
 */
function adjustBlockDatesToToday(blocksData) {
  if (!blocksData || !blocksData.blocks || blocksData.blocks.length === 0) {
    return {
      ...blocksData,
      serverNow: new Date().toISOString(),
    };
  }

  // Use local date components to match browser's selectedDate (which uses new Date())
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local time

  const adjustedBlocks = blocksData.blocks.map((block) => {
    const adjusted = { ...block };

    // Adjust startsAt - preserve time, change date to today (local)
    if (block.startsAt) {
      const originalTime = block.startsAt.split('T')[1]; // HH:MM:SS.sssZ
      adjusted.startsAt = `${todayDateStr}T${originalTime}`;
    }

    // Adjust endsAt - preserve time, change date to today (local)
    if (block.endsAt) {
      const originalTime = block.endsAt.split('T')[1];
      adjusted.endsAt = `${todayDateStr}T${originalTime}`;
    }

    // Adjust createdAt if present
    if (block.createdAt) {
      const originalTime = block.createdAt.split('T')[1];
      adjusted.createdAt = `${todayDateStr}T${originalTime}`;
    }

    return adjusted;
  });

  return {
    ...blocksData,
    serverNow: new Date().toISOString(),
    blocks: adjustedBlocks,
  };
}

/**
 * Adjusts board state dates to be relative to current time.
 * Makes tests time-independent by shifting fixture dates to today.
 */
function adjustBoardDatesToToday(boardData) {
  if (!boardData) return boardData;

  const now = new Date();
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  const adjustDate = (dateStr) => {
    if (!dateStr) return dateStr;
    const originalTime = dateStr.split('T')[1];
    return `${todayDateStr}T${originalTime}`;
  };

  const adjusted = {
    ...boardData,
    serverNow: now.toISOString(),
  };

  // Adjust court session dates
  if (adjusted.courts) {
    adjusted.courts = adjusted.courts.map((court) => {
      if (!court || !court.session) return court;
      return {
        ...court,
        session: {
          ...court.session,
          startedAt: adjustDate(court.session.startedAt),
          scheduledEndAt: adjustDate(court.session.scheduledEndAt),
        },
      };
    });
  }

  // Adjust upcomingBlocks dates
  if (adjusted.upcomingBlocks) {
    adjusted.upcomingBlocks = adjusted.upcomingBlocks.map((block) => ({
      ...block,
      startTime: adjustDate(block.startTime),
      endTime: adjustDate(block.endTime),
    }));
  }

  // Adjust waitlist dates
  if (adjusted.waitlist) {
    adjusted.waitlist = adjusted.waitlist.map((entry) => ({
      ...entry,
      joinedAt: adjustDate(entry.joinedAt),
      deferredAt: adjustDate(entry.deferredAt),
    }));
  }

  return adjusted;
}

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
        // Adjust dates to today for time-independent tests
        const adjustedBoardState = adjustBoardDatesToToday(boardState);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(adjustedBoardState),
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
            session: {
              id: 'session-new-123',
              scheduled_end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            },
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
        // Adjust block dates to today for time-independent tests
        const adjustedBlocksData = adjustBlockDatesToToday(blocksData);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(adjustedBlocksData),
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

      case 'update-session-tournament':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            serverNow: new Date().toISOString(),
            message: 'Tournament flag updated',
          }),
        });

      case 'join-waitlist':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            serverNow: new Date().toISOString(),
            position: 1,
            waitlistId: 'waitlist-new-123',
            message: 'Added to waitlist',
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
