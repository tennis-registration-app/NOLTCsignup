/**
 * guestHandlers — comprehensive callback tests
 *
 * Tests every exported callback from useGuestHandlers:
 *   validateGuestName, handleToggleGuestForm,
 *   handleGuestNameChange, handleAddGuest
 *
 * Rules:
 *   - Pure function (no guard, no catch): happy + failure
 *   - Guard present: happy + guard failure
 *   - Catch present: happy + error test
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createGuestHandlerDeps,
  renderHandlerHook,
} from '../../../../helpers/handlerTestHarness.js';
import { useGuestHandlers } from '../../../../../src/registration/appHandlers/handlers/guestHandlers.js';

// ---- module mocks ----
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../../../src/platform/prefsStorage.js', () => ({
  getCache: vi.fn().mockReturnValue([]),
  setCache: vi.fn(),
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
  ({ deps, mocks } = createGuestHandlerDeps());
  ({ result, unmount } = await renderHandlerHook(() => useGuestHandlers(deps)));
});

afterEach(() => {
  unmount();
});

// ============================================================
// 1. validateGuestName — pure function → 2 tests
// ============================================================
describe('validateGuestName', () => {
  it('returns true for valid two-word name', () => {
    expect(result.current.validateGuestName('John Smith')).toBe(true);
  });

  it('returns false for single word name', () => {
    expect(result.current.validateGuestName('John')).toBe(false);
  });

  it('returns false for name with short word', () => {
    expect(result.current.validateGuestName('J Smith')).toBe(false);
  });
});

// ============================================================
// 2. handleToggleGuestForm — branch (open/close) → 2 tests
// ============================================================
describe('handleToggleGuestForm', () => {
  it('opens guest form and sets default sponsor', () => {
    result.current.handleToggleGuestForm();

    expect(mocks.setShowGuestForm).toHaveBeenCalledWith(true);
    expect(mocks.setShowAddPlayer).toHaveBeenCalledWith(true);
    expect(mocks.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
    expect(mocks.setAddPlayerSearch).toHaveBeenCalledWith('');
    // Default sponsor set from memberNumber
    expect(mocks.setGuestSponsor).toHaveBeenCalledWith('1234');
  });

  it('closes guest form and resets fields when already open', async () => {
    ({ deps, mocks } = createGuestHandlerDeps({
      groupGuest: { showGuestForm: true },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGuestHandlers(deps)));

    result.current.handleToggleGuestForm();

    expect(mocks.setShowGuestForm).toHaveBeenCalledWith(false);
    expect(mocks.setGuestName).toHaveBeenCalledWith('');
    expect(mocks.setGuestSponsor).toHaveBeenCalledWith('');
    expect(mocks.setShowGuestNameError).toHaveBeenCalledWith(false);
    expect(mocks.setShowSponsorError).toHaveBeenCalledWith(false);
    expect(mocks.setShowAddPlayer).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// 3. handleGuestNameChange — simple setter → 1 test
// ============================================================
describe('handleGuestNameChange', () => {
  it('sets guest name and clears error', () => {
    result.current.handleGuestNameChange({ target: { value: 'Jane Doe' } });

    expect(mocks.markUserTyping).toHaveBeenCalled();
    expect(mocks.setGuestName).toHaveBeenCalledWith('Jane Doe');
    expect(mocks.setShowGuestNameError).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// 4. handleAddGuest — multi-guard + try/catch → 3 tests
// ============================================================
describe('handleAddGuest', () => {
  it('adds guest to group with valid name', async () => {
    ({ deps, mocks } = createGuestHandlerDeps({
      groupGuest: {
        guestName: 'Jane Doe',
        currentGroup: [{ id: 'p1', name: 'Alice', memberNumber: '1234', isGuest: false }],
      },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGuestHandlers(deps)));

    await result.current.handleAddGuest();

    expect(mocks.setCurrentGroup).toHaveBeenCalledTimes(1);
    const newGroup = mocks.setCurrentGroup.mock.calls[0][0];
    expect(newGroup).toHaveLength(2);
    expect(newGroup[1]).toMatchObject({
      name: 'Jane Doe',
      memberNumber: 'GUEST',
      isGuest: true,
      sponsor: '1234',
    });
    // Form reset
    expect(mocks.setGuestName).toHaveBeenCalledWith('');
    expect(mocks.setShowGuestForm).toHaveBeenCalledWith(false);
    expect(mocks.incrementGuestCounter).toHaveBeenCalled();
  });

  it('shows name error when name is invalid', async () => {
    ({ deps, mocks } = createGuestHandlerDeps({
      groupGuest: { guestName: 'X' },
    }));
    ({ result, unmount } = await renderHandlerHook(() => useGuestHandlers(deps)));

    await result.current.handleAddGuest();

    expect(mocks.setShowGuestNameError).toHaveBeenCalledWith(true);
    expect(mocks.setCurrentGroup).not.toHaveBeenCalled();
  });

  it('resets form when guardAgainstGroupDuplicate fails', async () => {
    ({ deps, mocks } = createGuestHandlerDeps({
      groupGuest: {
        guestName: 'Jane Doe',
        currentGroup: [{ id: 'p1', name: 'Alice', memberNumber: '1234' }],
      },
    }));
    mocks.guardAgainstGroupDuplicate.mockReturnValue(false);
    ({ result, unmount } = await renderHandlerHook(() => useGuestHandlers(deps)));

    await result.current.handleAddGuest();

    expect(mockToast).toHaveBeenCalledWith(
      'Jane Doe is already in your group',
      { type: 'warning' }
    );
    expect(mocks.setShowGuestForm).toHaveBeenCalledWith(false);
    expect(mocks.setCurrentGroup).not.toHaveBeenCalled();
  });
});
