/**
 * courtHandlers — comprehensive callback tests
 *
 * Tests every exported callback from useCourtHandlers:
 *   saveCourtData, getAvailableCourts, clearCourt,
 *   assignCourtToGroup, changeCourt, sendGroupToWaitlist,
 *   deferWaitlistEntry, undoOvertimeAndClearPrevious,
 *   assignNextFromWaitlist, joinWaitlistDeferred
 *
 * Rules:
 *   - Pure delegation (no guard, no catch): 1 test (happy path)
 *   - Guard present: happy + guard-failure test
 *   - Catch present: happy + error test
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCourtHandlerDeps,
  renderHandlerHook,
} from '../../../../helpers/handlerTestHarness.js';
import { useCourtHandlers } from '../../../../../src/registration/appHandlers/handlers/courtHandlers.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../../../src/lib/types/domain.js', () => ({
  isCourtEligibleForGroup: vi.fn().mockReturnValue(true),
}));

const mockGetSelectableCourtsStrict = vi.fn().mockReturnValue([1, 2, 3]);
const mockGetFreeCourtsInfo = vi.fn().mockReturnValue({ free: [1, 2] });
vi.mock('../../../../../src/tennis/domain/availability.js', () => ({
  getSelectableCourtsStrict: (...args) => mockGetSelectableCourtsStrict(...args),
  getFreeCourtsInfo: (...args) => mockGetFreeCourtsInfo(...args),
}));

const mockToast = vi.fn();
vi.mock('../../../../../src/shared/utils/toast.js', () => ({
  toast: (...args) => mockToast(...args),
}));

vi.mock('../../../../../src/lib/storage.js', () => ({
  readJSON: vi.fn().mockReturnValue(null),
  readDataSafe: vi.fn().mockReturnValue({ courts: [], waitlist: [] }),
}));

vi.mock('../../../../../src/lib/constants.js', () => ({
  STORAGE: { DATA: 'tennisClubData', BLOCKS: 'tennisClubBlocks' },
}));

vi.mock('../../../../../src/shared/constants/toastMessages.js', () => ({
  COURT_CLEAR_FAILED: "Couldn't clear court — please try again",
}));

// ---- shared test state ----
let deps, mocks, result, unmount;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetSelectableCourtsStrict.mockReturnValue([1, 2, 3]);
  mockGetFreeCourtsInfo.mockReturnValue({ free: [1, 2] });
  ({ deps, mocks } = createCourtHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// 1. saveCourtData — deprecated, no guard, no catch → 1 test
// ============================================================
describe('saveCourtData', () => {
  it('returns true (deprecated no-op)', async () => {
    const ok = await result.current.saveCourtData({ courts: [] });
    expect(ok).toBe(true);
  });
});

// ============================================================
// 2. getAvailableCourts — no guard, try/catch → 2 tests
// ============================================================
describe('getAvailableCourts', () => {
  it('returns selectable courts from availability helpers', () => {
    const courts = result.current.getAvailableCourts(false);
    expect(mockGetSelectableCourtsStrict).toHaveBeenCalled();
    expect(courts).toEqual([1, 2, 3]);
  });

  it('returns [] when availability helper throws', () => {
    mockGetSelectableCourtsStrict.mockImplementation(() => {
      throw new Error('boom');
    });
    const courts = result.current.getAvailableCourts(false);
    expect(courts).toEqual([]);
  });
});

// ============================================================
// 3. clearCourt — delegates to clearViaService, checks res.success → 2 tests
// ============================================================
describe('clearCourt', () => {
  it('succeeds when endSession returns ok', async () => {
    // clearViaService looks up court by number in data.courts
    ({ deps, mocks } = createCourtHandlerDeps({
      state: {
        data: {
          courts: [{ number: 3, id: 'court-uuid-3', isAvailable: false }],
          waitlist: [],
          operatingHours: [],
        },
      },
    }));
    mocks.endSession.mockResolvedValue({ ok: true });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.clearCourt(3, 'Completed');

    expect(mocks.endSession).toHaveBeenCalledWith({
      courtId: 'court-uuid-3',
      reason: 'Completed',
    });
    // No error toast on success
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('toasts COURT_CLEAR_FAILED when endSession returns not-ok', async () => {
    ({ deps, mocks } = createCourtHandlerDeps({
      state: {
        data: {
          courts: [{ number: 5, id: 'court-uuid-5', isAvailable: false }],
          waitlist: [],
          operatingHours: [],
        },
      },
    }));
    mocks.endSession.mockResolvedValue({ ok: false, message: 'conflict' });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.clearCourt(5, 'Cleared');

    expect(mockToast).toHaveBeenCalledWith(
      "Couldn't clear court — please try again",
      { type: 'error' }
    );
  });
});

// ============================================================
// 4. assignCourtToGroup — pure delegation → 1 test
// ============================================================
describe('assignCourtToGroup', () => {
  it('delegates to assignCourtToGroupOrchestrated with deps', async () => {
    mocks.assignCourtToGroupOrchestrated.mockResolvedValue('ok');
    const ret = await result.current.assignCourtToGroup(4, 3);

    expect(mocks.assignCourtToGroupOrchestrated).toHaveBeenCalledTimes(1);
    const [courtNum, selectableCount, depsArg] = mocks.assignCourtToGroupOrchestrated.mock.calls[0];
    expect(courtNum).toBe(4);
    expect(selectableCount).toBe(3);
    // Verify deps object has expected shape
    expect(depsArg).toHaveProperty('state');
    expect(depsArg).toHaveProperty('actions');
    expect(depsArg).toHaveProperty('services');
    expect(depsArg).toHaveProperty('ui');
    expect(ret).toBe('ok');
  });
});

// ============================================================
// 5. changeCourt — pure delegation → 1 test
// ============================================================
describe('changeCourt', () => {
  it('delegates to changeCourtOrchestrated with state/setters', () => {
    result.current.changeCourt();

    expect(mocks.changeCourtOrchestrated).toHaveBeenCalledTimes(1);
    const arg = mocks.changeCourtOrchestrated.mock.calls[0][0];
    expect(arg).toHaveProperty('canChangeCourt');
    expect(arg).toHaveProperty('setOriginalCourtData');
    expect(arg).toHaveProperty('setShowSuccess');
    expect(arg).toHaveProperty('setIsChangingCourt');
    expect(arg).toHaveProperty('setCurrentScreen');
  });
});

// ============================================================
// 6. sendGroupToWaitlist — pure delegation → 1 test
// ============================================================
describe('sendGroupToWaitlist', () => {
  it('delegates to sendGroupToWaitlistOrchestrated', async () => {
    mocks.sendGroupToWaitlistOrchestrated.mockResolvedValue(undefined);
    const group = [{ name: 'Alice', id: '1' }];
    await result.current.sendGroupToWaitlist(group, { deferred: false });

    expect(mocks.sendGroupToWaitlistOrchestrated).toHaveBeenCalledTimes(1);
    const [g, d, opts] = mocks.sendGroupToWaitlistOrchestrated.mock.calls[0];
    expect(g).toBe(group);
    expect(d).toHaveProperty('backend');
    expect(d).toHaveProperty('isPlayerAlreadyPlaying');
    expect(opts).toEqual({ deferred: false });
  });
});

// ============================================================
// 7. deferWaitlistEntry — try/catch, always resetForm → 2 tests
// ============================================================
describe('deferWaitlistEntry', () => {
  it('toasts success and resets form on ok', async () => {
    mocks.deferWaitlistEntryCmd.mockResolvedValue({ ok: true });
    await result.current.deferWaitlistEntry('entry-42');

    expect(mocks.deferWaitlistEntryCmd).toHaveBeenCalledWith({
      entryId: 'entry-42',
      deferred: true,
    });
    expect(mockToast).toHaveBeenCalledWith(
      'Staying on waitlist — we will notify you when a full court opens',
      { type: 'success' }
    );
    expect(mocks.resetForm).toHaveBeenCalled();
  });

  it('toasts error and still resets form when command rejects', async () => {
    mocks.deferWaitlistEntryCmd.mockRejectedValue(new Error('network'));
    await result.current.deferWaitlistEntry('entry-99');

    expect(mockToast).toHaveBeenCalledWith(
      'Failed to defer — please try again',
      { type: 'error' }
    );
    expect(mocks.resetForm).toHaveBeenCalled();
  });
});

// ============================================================
// 8. undoOvertimeAndClearPrevious — guard + try/catch → 3 tests
// ============================================================
describe('undoOvertimeAndClearPrevious', () => {
  // Need courts in data for clearViaService (the fallback path)
  const withCourt = {
    state: {
      data: {
        courts: [{ number: 2, id: 'court-2', isAvailable: false }],
        waitlist: [],
        operatingHours: [],
      },
    },
  };

  it('calls undoOvertimeTakeover when displacement has ids', async () => {
    ({ deps, mocks } = createCourtHandlerDeps(withCourt));
    mocks.undoOvertimeTakeover.mockResolvedValue({ ok: true });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    const displacement = {
      displacedSessionId: 'ds-1',
      takeoverSessionId: 'tk-1',
    };
    await result.current.undoOvertimeAndClearPrevious(2, displacement);

    expect(mocks.undoOvertimeTakeover).toHaveBeenCalledWith({
      takeoverSessionId: 'tk-1',
      displacedSessionId: 'ds-1',
    });
    // Success path: no clearCourt fallback
    expect(mocks.endSession).not.toHaveBeenCalled();
  });

  it('falls back to clearCourt when no displacement provided', async () => {
    ({ deps, mocks } = createCourtHandlerDeps(withCourt));
    mocks.endSession.mockResolvedValue({ ok: true });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.undoOvertimeAndClearPrevious(2, null);

    expect(mocks.undoOvertimeTakeover).not.toHaveBeenCalled();
    // clearCourt → clearViaService → endSession
    expect(mocks.endSession).toHaveBeenCalledWith({
      courtId: 'court-2',
      reason: 'Bumped',
    });
  });

  it('falls back to clearCourt when undoOvertimeTakeover rejects', async () => {
    ({ deps, mocks } = createCourtHandlerDeps(withCourt));
    mocks.undoOvertimeTakeover.mockRejectedValue(new Error('500'));
    mocks.endSession.mockResolvedValue({ ok: true });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    const displacement = {
      displacedSessionId: 'ds-2',
      takeoverSessionId: 'tk-2',
    };
    await result.current.undoOvertimeAndClearPrevious(2, displacement);

    // Fallback to clearCourt after error
    expect(mocks.endSession).toHaveBeenCalledWith({
      courtId: 'court-2',
      reason: 'Bumped',
    });
  });
});

// ============================================================
// 9. assignNextFromWaitlist — guards + try/catch → 4 tests
// ============================================================
describe('assignNextFromWaitlist', () => {
  it('assigns first waiting entry to first available court', async () => {
    const board = {
      waitlist: [
        { id: 'w1', status: 'waiting', group: { players: [{ memberId: 'a' }] } },
      ],
      courts: [
        { id: 'c1', number: 1, isAvailable: true, isBlocked: false },
      ],
    };
    mocks.refresh.mockResolvedValue(board); // not used here
    // getBoard is on backend.queries — need to add it
    deps.services.backend.queries.getBoard = vi.fn().mockResolvedValue(board);
    mocks.assignFromWaitlist.mockResolvedValue({ ok: true });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.assignNextFromWaitlist();

    expect(mocks.assignFromWaitlist).toHaveBeenCalledWith({
      waitlistEntryId: 'w1',
      courtId: 'c1',
    });
    expect(mockToast).toHaveBeenCalledWith('Assigned to Court 1', { type: 'success' });
    expect(mocks.showAlertMessage).toHaveBeenCalledWith('Assigned to Court 1');
  });

  it('shows alert when no waiting entries', async () => {
    deps.services.backend.queries.getBoard = vi.fn().mockResolvedValue({
      waitlist: [{ id: 'w1', status: 'assigned' }],
      courts: [{ id: 'c1', number: 1, isAvailable: true, isBlocked: false }],
    });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.assignNextFromWaitlist();

    expect(mocks.showAlertMessage).toHaveBeenCalledWith('No entries waiting in queue');
    expect(mocks.assignFromWaitlist).not.toHaveBeenCalled();
  });

  it('shows alert when no courts available', async () => {
    deps.services.backend.queries.getBoard = vi.fn().mockResolvedValue({
      waitlist: [{ id: 'w1', status: 'waiting', group: { players: [{ memberId: 'a' }] } }],
      courts: [{ id: 'c1', number: 1, isAvailable: false, isBlocked: false }],
    });
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.assignNextFromWaitlist();

    expect(mocks.showAlertMessage).toHaveBeenCalledWith('No courts available');
    expect(mocks.assignFromWaitlist).not.toHaveBeenCalled();
  });

  it('shows alert when getBoard rejects', async () => {
    deps.services.backend.queries.getBoard = vi.fn().mockRejectedValue(new Error('timeout'));
    ({ result, unmount: unmount } = await renderHandlerHook(() => useCourtHandlers(deps)));

    await result.current.assignNextFromWaitlist();

    expect(mocks.showAlertMessage).toHaveBeenCalledWith('timeout');
  });
});

// ============================================================
// 10. joinWaitlistDeferred — try/catch, always resetForm → 2 tests
// ============================================================
describe('joinWaitlistDeferred', () => {
  it('delegates to sendGroupToWaitlist with deferred option, toasts, resets', async () => {
    mocks.sendGroupToWaitlistOrchestrated.mockResolvedValue(undefined);
    const group = [{ name: 'Bob', id: '2' }];
    await result.current.joinWaitlistDeferred(group);

    expect(mocks.sendGroupToWaitlistOrchestrated).toHaveBeenCalledTimes(1);
    const [, , opts] = mocks.sendGroupToWaitlistOrchestrated.mock.calls[0];
    expect(opts).toEqual({ deferred: true });
    expect(mockToast).toHaveBeenCalledWith(
      "You'll be notified when a full-time court is available",
      { type: 'success' }
    );
    expect(mocks.resetForm).toHaveBeenCalled();
  });

  it('toasts error and still resets form when sendGroupToWaitlist rejects', async () => {
    mocks.sendGroupToWaitlistOrchestrated.mockRejectedValue(new Error('fail'));
    const group = [{ name: 'Carol', id: '3' }];
    await result.current.joinWaitlistDeferred(group);

    expect(mockToast).toHaveBeenCalledWith(
      'Failed to join waitlist — please try again',
      { type: 'error' }
    );
    expect(mocks.resetForm).toHaveBeenCalled();
  });
});
