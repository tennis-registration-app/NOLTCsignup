/**
 * groupHandlers — comprehensive callback tests
 *
 * Tests every exported callback from useGroupHandlers:
 *   findMemberNumber, addFrequentPartner, sameGroup,
 *   handleSuggestionClick, handleGroupSuggestionClick,
 *   handleAddPlayerSuggestionClick, handleGroupSelectCourt,
 *   handleStreakAcknowledge, handleGroupJoinWaitlist
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
  createGroupHandlerDeps,
  renderHandlerHook,
} from '../../../../helpers/handlerTestHarness.js';
import { useGroupHandlers } from '../../../../../src/registration/appHandlers/handlers/groupHandlers.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockIsValidPlayer = vi.fn().mockReturnValue(true);
vi.mock('@lib', () => ({
  DataValidation: {
    isValidPlayer: (...args) => mockIsValidPlayer(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('../../../../../src/shared/utils/toast.js', () => ({
  toast: (...args) => mockToast(...args),
}));

vi.mock('../../../../../src/shared/constants/toastMessages.js', () => ({
  ALREADY_IN_GROUP: (name) => `${name} is already in your group`,
}));

// ---- shared test state ----
let deps, mocks, result, unmount;

beforeEach(async () => {
  vi.clearAllMocks();
  mockIsValidPlayer.mockReturnValue(true);
  ({ deps, mocks } = createGroupHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// 1. findMemberNumber — pure lookup, no guard, no catch → 2 tests
// ============================================================
describe('findMemberNumber', () => {
  it('returns member number when id matches a family member', async () => {
    ({ deps, mocks } = createGroupHandlerDeps({
      derived: {
        memberDatabase: {
          '1234': { familyMembers: [{ id: 'uuid-a' }] },
        },
      },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));

    expect(result.current.findMemberNumber('uuid-a')).toBe('1234');
  });

  it('returns empty string when player not found', () => {
    expect(result.current.findMemberNumber('nonexistent')).toBe('');
  });
});

// ============================================================
// 2. addFrequentPartner — multi-guard → 2 tests
// ============================================================
describe('addFrequentPartner', () => {
  it('adds valid player to group', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      memberNumber: '100',
      memberId: 'p1',
      phone: '555-1234',
      ranking: 4.0,
      winRate: 0.6,
      accountId: 'acc-1',
    };
    result.current.addFrequentPartner(player);

    expect(mocks.setCurrentGroup).toHaveBeenCalledTimes(1);
    const newGroup = mocks.setCurrentGroup.mock.calls[0][0];
    expect(newGroup).toHaveLength(1);
    expect(newGroup[0].name).toBe('Alice');
    expect(newGroup[0].id).toBe('p1');
  });

  it('shows alert when DataValidation.isValidPlayer returns false', () => {
    mockIsValidPlayer.mockReturnValue(false);
    result.current.addFrequentPartner({ id: null, name: null });

    expect(mocks.showAlertMessage).toHaveBeenCalledWith(
      'Invalid player data. Please try again.'
    );
    expect(mocks.setCurrentGroup).not.toHaveBeenCalled();
  });

  it('shows alert when group is full', async () => {
    const fullGroup = Array.from({ length: 4 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    ({ deps, mocks } = createGroupHandlerDeps({
      groupGuest: { currentGroup: fullGroup },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));

    result.current.addFrequentPartner({
      id: 'p5',
      name: 'Extra',
      memberNumber: '999',
    });

    expect(mocks.showAlertMessage).toHaveBeenCalledWith(
      'Group is full (max 4 players)'
    );
    expect(mocks.setCurrentGroup).not.toHaveBeenCalled();
  });
});

// ============================================================
// 3. sameGroup — pure comparison, no guard, no catch → 1 test
// ============================================================
describe('sameGroup', () => {
  it('returns true for groups with same players in any order', () => {
    const a = [
      { id: '1', name: 'Alice', memberId: 'm1' },
      { id: '2', name: 'Bob', memberId: 'm2' },
    ];
    const b = [
      { id: '2', name: 'Bob', memberId: 'm2' },
      { id: '1', name: 'Alice', memberId: 'm1' },
    ];
    expect(result.current.sameGroup(a, b)).toBe(true);
  });

  it('returns false for groups with different sizes', () => {
    expect(
      result.current.sameGroup(
        [{ id: '1', name: 'Alice' }],
        [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
      )
    ).toBe(false);
  });
});

// ============================================================
// 4. handleSuggestionClick — pure delegation → 1 test
// ============================================================
describe('handleSuggestionClick', () => {
  it('delegates to handleSuggestionClickOrchestrated with deps', async () => {
    const suggestion = { memberNumber: '100', member: { id: 'p1', name: 'Alice' } };
    await result.current.handleSuggestionClick(suggestion);

    expect(mocks.handleSuggestionClickOrchestrated).toHaveBeenCalledTimes(1);
    const [s, d] = mocks.handleSuggestionClickOrchestrated.mock.calls[0];
    expect(s).toBe(suggestion);
    expect(d).toHaveProperty('currentGroup');
    expect(d).toHaveProperty('backend');
    expect(d).toHaveProperty('setCurrentScreen');
    expect(d).toHaveProperty('isPlayerAlreadyPlaying');
  });
});

// ============================================================
// 5. handleGroupSuggestionClick — thin wrapper → 1 test
// ============================================================
describe('handleGroupSuggestionClick', () => {
  it('delegates to handleSuggestionClick orchestrator', async () => {
    const suggestion = { memberNumber: '200', member: { id: 'p2', name: 'Bob' } };
    await result.current.handleGroupSuggestionClick(suggestion);

    expect(mocks.handleSuggestionClickOrchestrated).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 6. handleAddPlayerSuggestionClick — pure delegation → 1 test
// ============================================================
describe('handleAddPlayerSuggestionClick', () => {
  it('delegates to handleAddPlayerSuggestionClickOrchestrated with deps', async () => {
    const suggestion = { memberNumber: '300', member: { id: 'p3', name: 'Carol' } };
    await result.current.handleAddPlayerSuggestionClick(suggestion);

    expect(mocks.handleAddPlayerSuggestionClickOrchestrated).toHaveBeenCalledTimes(1);
    const [s, d] = mocks.handleAddPlayerSuggestionClickOrchestrated.mock.calls[0];
    expect(s).toBe(suggestion);
    expect(d).toHaveProperty('currentGroup');
    expect(d).toHaveProperty('guardAddPlayerEarly');
    expect(d).toHaveProperty('guardAgainstGroupDuplicate');
    expect(d).toHaveProperty('CONSTANTS');
  });
});

// ============================================================
// 7. handleGroupSelectCourt — streak guard + mobile branch → 3 tests
// ============================================================
describe('handleGroupSelectCourt', () => {
  it('navigates to court screen in standard flow', () => {
    result.current.handleGroupSelectCourt();

    expect(mocks.setCurrentScreen).toHaveBeenCalledWith('court', 'selectCourtButton');
    expect(mocks.setShowStreakModal).not.toHaveBeenCalled();
  });

  it('shows streak modal when streak >= 3 and not acknowledged', async () => {
    ({ deps, mocks } = createGroupHandlerDeps({
      streak: { registrantStreak: 5, streakAcknowledged: false },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));

    result.current.handleGroupSelectCourt();

    expect(mocks.setShowStreakModal).toHaveBeenCalledWith(true);
    expect(mocks.setCurrentScreen).not.toHaveBeenCalled();
    expect(mocks.assignCourtToGroup).not.toHaveBeenCalled();
  });

  it('assigns preselected court in mobile flow', async () => {
    ({ deps, mocks } = createGroupHandlerDeps({
      mobile: { mobileFlow: true, preselectedCourt: 7 },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));

    result.current.handleGroupSelectCourt();

    expect(mocks.assignCourtToGroup).toHaveBeenCalledWith(7);
    expect(mocks.setCurrentScreen).not.toHaveBeenCalled();
  });
});

// ============================================================
// 8. handleStreakAcknowledge — mobile branch → 2 tests
// ============================================================
describe('handleStreakAcknowledge', () => {
  it('sets acknowledged and navigates to court screen', () => {
    result.current.handleStreakAcknowledge();

    expect(mocks.setStreakAcknowledged).toHaveBeenCalledWith(true);
    expect(mocks.setShowStreakModal).toHaveBeenCalledWith(false);
    expect(mocks.setCurrentScreen).toHaveBeenCalledWith('court', 'selectCourtButton');
  });

  it('assigns preselected court in mobile flow', async () => {
    ({ deps, mocks } = createGroupHandlerDeps({
      mobile: { mobileFlow: true, preselectedCourt: 3 },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGroupHandlers(deps)));

    result.current.handleStreakAcknowledge();

    expect(mocks.setStreakAcknowledged).toHaveBeenCalledWith(true);
    expect(mocks.assignCourtToGroup).toHaveBeenCalledWith(3);
    expect(mocks.setCurrentScreen).not.toHaveBeenCalled();
  });
});

// ============================================================
// 9. handleGroupJoinWaitlist — try/catch + timer → 2 tests
// ============================================================
describe('handleGroupJoinWaitlist', () => {
  it('calls sendGroupToWaitlist, shows success, sets reset timer', async () => {
    vi.useFakeTimers();
    mocks.sendGroupToWaitlist.mockResolvedValue(undefined);
    await result.current.handleGroupJoinWaitlist();

    expect(mocks.sendGroupToWaitlist).toHaveBeenCalledWith([]);
    expect(mocks.setShowSuccess).toHaveBeenCalledWith(true);
    expect(mocks.clearSuccessResetTimer).toHaveBeenCalled();

    // Timer fires after AUTO_RESET_SUCCESS_MS
    vi.advanceTimersByTime(5000);
    expect(mocks.resetForm).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('catches error and still sets up reset timer', async () => {
    vi.useFakeTimers();
    mocks.sendGroupToWaitlist.mockRejectedValue(new Error('network'));
    await result.current.handleGroupJoinWaitlist();

    // Error caught — no throw
    expect(mocks.clearSuccessResetTimer).toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(mocks.resetForm).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
