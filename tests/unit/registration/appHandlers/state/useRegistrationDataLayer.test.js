/**
 * useRegistrationDataLayer — hook wiring tests
 *
 * Tests:
 *   A) loadData callback (parallel fetch, setter updates, court selection, error)
 *   B) Subscription effect (setup, board update propagation)
 *   C) Subscription cleanup (unsubscribe on unmount)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHandlerHook } from '../../../../helpers/handlerTestHarness.js';
import { useRegistrationDataLayer } from '../../../../../src/registration/appHandlers/state/useRegistrationDataLayer.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ---- test helpers ----
function createDeps(overrides = {}) {
  let subscriptionCallback;
  const mockUnsubscribe = vi.fn();

  const deps = {
    backend: {
      queries: {
        getBoard: vi.fn().mockResolvedValue({
          courts: [{ number: 1, isAvailable: true }],
          waitlist: [{ id: 'w1' }],
          operatingHours: { open: '07:00', close: '21:00' },
        }),
        subscribeToBoardChanges: vi.fn((cb) => {
          subscriptionCallback = cb;
          return mockUnsubscribe;
        }),
      },
      directory: {
        getAllMembers: vi.fn().mockResolvedValue([
          { id: 'm1', name: 'Alice' },
          { id: 'm2', name: 'Bob' },
        ]),
      },
    },
    setData: vi.fn(),
    setAvailableCourts: vi.fn(),
    setOperatingHours: vi.fn(),
    setApiMembers: vi.fn(),
    data: { courts: [], waitlist: [], recentlyCleared: ['court-5'] },
    computeRegistrationCourtSelection: vi.fn().mockReturnValue({
      selectableCourts: [{ number: 1 }, { number: 3 }],
    }),
    ...overrides,
  };

  return {
    deps,
    mockUnsubscribe,
    getSubscriptionCallback: () => subscriptionCallback,
  };
}

// ---- shared test state ----
let deps, result, unmount, mockUnsubscribe, getSubscriptionCallback;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ deps, mockUnsubscribe, getSubscriptionCallback } = createDeps());
  ({ result, unmount } = await renderHandlerHook(() => useRegistrationDataLayer(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// A) loadData callback
// ============================================================
describe('loadData', () => {
  it('calls getBoard and getAllMembers in parallel', async () => {
    await result.current.loadData();

    expect(deps.backend.queries.getBoard).toHaveBeenCalledTimes(1);
    expect(deps.backend.directory.getAllMembers).toHaveBeenCalledTimes(1);
  });

  it('calls setData with merged board data preserving recentlyCleared', async () => {
    await result.current.loadData();

    // setData called with updater function (first call for board data)
    expect(deps.setData).toHaveBeenCalled();
    const firstUpdater = deps.setData.mock.calls[0][0];
    const merged = firstUpdater({ existing: true });
    expect(merged).toMatchObject({
      existing: true,
      courts: [{ number: 1, isAvailable: true }],
      waitlist: [{ id: 'w1' }],
      recentlyCleared: ['court-5'],
    });
  });

  it('calls setOperatingHours when boardData has operatingHours', async () => {
    await result.current.loadData();

    expect(deps.setOperatingHours).toHaveBeenCalledWith({ open: '07:00', close: '21:00' });
  });

  it('skips setOperatingHours when boardData lacks operatingHours', async () => {
    deps.backend.queries.getBoard.mockResolvedValue({
      courts: [],
      waitlist: [],
    });
    await result.current.loadData();

    expect(deps.setOperatingHours).not.toHaveBeenCalled();
  });

  it('calls setApiMembers with members array', async () => {
    await result.current.loadData();

    expect(deps.setApiMembers).toHaveBeenCalledWith([
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ]);
  });

  it('skips setApiMembers when members is not an array', async () => {
    deps.backend.directory.getAllMembers.mockResolvedValue(null);
    await result.current.loadData();

    expect(deps.setApiMembers).not.toHaveBeenCalled();
  });

  it('calls computeRegistrationCourtSelection with courts and empty blocks', async () => {
    await result.current.loadData();

    expect(deps.computeRegistrationCourtSelection).toHaveBeenCalledWith(
      [{ number: 1, isAvailable: true }],
      []
    );
  });

  it('calls setAvailableCourts with selectable court numbers', async () => {
    await result.current.loadData();

    expect(deps.setAvailableCourts).toHaveBeenCalledWith([1, 3]);
  });

  it('calls setData a second time with courtSelection', async () => {
    await result.current.loadData();

    // Second setData call merges courtSelection
    const secondUpdater = deps.setData.mock.calls[1][0];
    const merged = secondUpdater({ existing: true });
    expect(merged).toMatchObject({
      existing: true,
      courtSelection: { selectableCourts: [{ number: 1 }, { number: 3 }] },
    });
  });

  it('logs error and does not crash on getBoard rejection', async () => {
    const { logger } = await import('../../../../../src/lib/logger.js');
    deps.backend.queries.getBoard.mockRejectedValue(new Error('network down'));

    await result.current.loadData();

    expect(logger.error).toHaveBeenCalledWith(
      'DataLayer',
      'Failed to load data',
      expect.any(Error)
    );
    // setAvailableCourts not called with bad data
    expect(deps.setAvailableCourts).not.toHaveBeenCalled();
  });
});

// ============================================================
// B) Subscription effect (mount)
// ============================================================
describe('subscription setup', () => {
  it('calls subscribeToBoardChanges on mount with pollIntervalMs', () => {
    expect(deps.backend.queries.subscribeToBoardChanges).toHaveBeenCalledTimes(1);
    expect(deps.backend.queries.subscribeToBoardChanges).toHaveBeenCalledWith(
      expect.any(Function),
      { pollIntervalMs: 5000 }
    );
  });

  it('updates setData when subscription callback fires with board data', () => {
    const cb = getSubscriptionCallback();
    const boardUpdate = {
      courts: [{ number: 2 }],
      waitlist: [{ id: 'w2' }],
      blocks: [{ id: 'b1' }],
      upcomingBlocks: [{ id: 'ub1' }],
      operatingHours: { open: '08:00', close: '20:00' },
    };

    cb(boardUpdate);

    // setData called with updater
    const updater = deps.setData.mock.calls[deps.setData.mock.calls.length - 2][0];
    const merged = updater({ existing: true });
    expect(merged).toMatchObject({
      existing: true,
      courts: [{ number: 2 }],
      waitlist: [{ id: 'w2' }],
      blocks: [{ id: 'b1' }],
      upcomingBlocks: [{ id: 'ub1' }],
    });
  });

  it('updates setOperatingHours when subscription board has operatingHours', () => {
    const cb = getSubscriptionCallback();
    cb({ courts: [], waitlist: [], operatingHours: { open: '06:00', close: '22:00' } });

    expect(deps.setOperatingHours).toHaveBeenCalledWith({ open: '06:00', close: '22:00' });
  });

  it('calls computeRegistrationCourtSelection with courts and upcomingBlocks from subscription', () => {
    const cb = getSubscriptionCallback();
    const courts = [{ number: 4 }];
    const upcomingBlocks = [{ id: 'ub2' }];
    cb({ courts, waitlist: [], upcomingBlocks });

    expect(deps.computeRegistrationCourtSelection).toHaveBeenCalledWith(courts, upcomingBlocks);
  });

  it('updates setAvailableCourts from subscription court selection', () => {
    const cb = getSubscriptionCallback();
    deps.computeRegistrationCourtSelection.mockReturnValue({
      selectableCourts: [{ number: 5 }, { number: 7 }],
    });

    cb({ courts: [{ number: 5 }, { number: 7 }], waitlist: [] });

    expect(deps.setAvailableCourts).toHaveBeenCalledWith([5, 7]);
  });
});

// ============================================================
// C) Subscription cleanup (unmount)
// ============================================================
describe('subscription cleanup', () => {
  it('calls unsubscribe on unmount', () => {
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
