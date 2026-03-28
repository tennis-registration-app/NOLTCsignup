/**
 * useRegistrationHelpers + validateGroupCompat unit tests
 *
 * Tests pure helper functions: guardAgainstGroupDuplicate,
 * getCourtsOccupiedForClearing, clearSuccessResetTimer, guardAddPlayerEarly,
 * and the standalone validateGroupCompat export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useRegistrationHelpers,
  validateGroupCompat,
} from '../../../../../src/registration/appHandlers/state/useRegistrationHelpers.js';

// Mock dependencies
vi.mock('../../../../../src/lib/domain/engagement.js', () => ({
  findEngagementByMemberId: vi.fn(),
  getEngagementMessage: vi.fn().mockReturnValue('Player is already engaged'),
}));
vi.mock('../../../../../src/tennis/domain/roster.js', () => ({
  normalizeName: vi.fn((s) => (s || '').toString().trim().toLowerCase()),
}));
vi.mock('../../../../../src/tennis/domain/waitlist.js', () => ({
  validateGroup: vi.fn(),
}));
vi.mock('../../../../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
}));
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function createHelpers(overrides = {}) {
  const deps = {
    data: { courts: [], waitlist: [] },
    setIsUserTyping: vi.fn(),
    successResetTimerRef: { current: null },
    typingTimeoutRef: { current: null },
    ...overrides,
  };
  return useRegistrationHelpers(deps);
}

// ── getCourtData ───────────────────────────────────────────────
describe('getCourtData', () => {
  it('returns the data reference', () => {
    const data = { courts: [{ number: 1 }], waitlist: [] };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtData()).toBe(data);
  });
});

// ── clearSuccessResetTimer ─────────────────────────────────────
describe('clearSuccessResetTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears an active timer', () => {
    const ref = { current: setTimeout(() => {}, 5000) };
    const helpers = createHelpers({ successResetTimerRef: ref });
    helpers.clearSuccessResetTimer();
    expect(ref.current).toBeNull();
  });

  it('does nothing when no timer is set', () => {
    const ref = { current: null };
    const helpers = createHelpers({ successResetTimerRef: ref });
    helpers.clearSuccessResetTimer();
    expect(ref.current).toBeNull();
  });
});

// ── markUserTyping ─────────────────────────────────────────────
describe('markUserTyping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets isUserTyping to true immediately', () => {
    const setIsUserTyping = vi.fn();
    const helpers = createHelpers({ setIsUserTyping });
    helpers.markUserTyping();
    expect(setIsUserTyping).toHaveBeenCalledWith(true);
  });

  it('sets isUserTyping to false after 3 seconds', () => {
    const setIsUserTyping = vi.fn();
    const helpers = createHelpers({ setIsUserTyping });
    helpers.markUserTyping();
    vi.advanceTimersByTime(3000);
    expect(setIsUserTyping).toHaveBeenCalledWith(false);
  });
});

// ── getCourtsOccupiedForClearing ───────────────────────────────
describe('getCourtsOccupiedForClearing', () => {
  it('returns court numbers with sessions', () => {
    const data = {
      courts: [
        { number: 1, session: { id: 's1' }, isBlocked: false },
        { number: 2, session: null, isBlocked: false },
        { number: 3, isOccupied: true, isBlocked: false },
      ],
      waitlist: [],
    };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([1, 3]);
  });

  it('excludes blocked courts', () => {
    const data = {
      courts: [
        { number: 1, session: { id: 's1' }, isBlocked: true },
        { number: 2, session: { id: 's2' }, isBlocked: false },
      ],
      waitlist: [],
    };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([2]);
  });

  it('returns empty array when no courts are occupied', () => {
    const data = { courts: [{ number: 1 }], waitlist: [] };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([]);
  });

  it('returns sorted court numbers', () => {
    const data = {
      courts: [
        { number: 5, session: {}, isBlocked: false },
        { number: 2, session: {}, isBlocked: false },
        { number: 8, session: {}, isBlocked: false },
      ],
      waitlist: [],
    };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([2, 5, 8]);
  });

  it('handles missing courts array', () => {
    const helpers = createHelpers({ data: {} });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([]);
  });

  it('skips null entries in courts array without crashing', () => {
    const data = {
      courts: [
        null,
        { number: 2, session: { id: 's1' }, isBlocked: false },
        null,
        { number: 4, isOccupied: true, isBlocked: false },
        null,
      ],
      waitlist: [],
    };
    const helpers = createHelpers({ data });
    expect(helpers.getCourtsOccupiedForClearing()).toEqual([2, 4]);
  });
});

// ── guardAddPlayerEarly ────────────────────────────────────────
describe('guardAddPlayerEarly', () => {
  let findEngagementByMemberId;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../../../../src/lib/domain/engagement.js');
    findEngagementByMemberId = mod.findEngagementByMemberId;
  });

  it('returns true when player has no engagement', () => {
    findEngagementByMemberId.mockReturnValue(null);
    const helpers = createHelpers();
    const getBoardData = () => ({ courts: [], waitlist: [] });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(true);
  });

  it('returns false when player is on court', () => {
    findEngagementByMemberId.mockReturnValue({ kind: 'court', courtNumber: 3 });
    const helpers = createHelpers();
    const getBoardData = () => ({ courts: [], waitlist: [] });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(false);
  });

  it('returns true for waitlist player at eligible position', () => {
    findEngagementByMemberId.mockReturnValue({ kind: 'waitlist', waitlistPosition: 1 });
    const helpers = createHelpers();
    const getBoardData = () => ({
      courts: [{ isAvailable: true }, { isAvailable: false }],
      waitlist: [],
    });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(true);
  });

  it('returns false for waitlist player beyond eligible position', () => {
    findEngagementByMemberId.mockReturnValue({ kind: 'waitlist', waitlistPosition: 3 });
    const helpers = createHelpers();
    const getBoardData = () => ({
      courts: [{ isAvailable: true }],
      waitlist: [],
    });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(false);
  });

  it('uses overtime courts as fallback availability', () => {
    findEngagementByMemberId.mockReturnValue({ kind: 'waitlist', waitlistPosition: 1 });
    const helpers = createHelpers();
    const getBoardData = () => ({
      courts: [{ isAvailable: false, isOvertime: true }],
      waitlist: [],
    });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(true);
  });

  it('allows position 2 when 2+ courts available', () => {
    findEngagementByMemberId.mockReturnValue({ kind: 'waitlist', waitlistPosition: 2 });
    const helpers = createHelpers();
    const getBoardData = () => ({
      courts: [{ isAvailable: true }, { isAvailable: true }],
      waitlist: [],
    });
    expect(helpers.guardAddPlayerEarly(getBoardData, { id: 'p1' })).toBe(true);
  });

  it('uses memberId from player object', () => {
    findEngagementByMemberId.mockReturnValue(null);
    const helpers = createHelpers();
    const getBoardData = () => ({ courts: [], waitlist: [] });
    helpers.guardAddPlayerEarly(getBoardData, { memberId: 'mid-1' });
    expect(findEngagementByMemberId).toHaveBeenCalledWith(
      expect.anything(),
      'mid-1'
    );
  });
});

// ── guardAgainstGroupDuplicate ─────────────────────────────────
describe('guardAgainstGroupDuplicate', () => {
  it('returns true when player is not in group', () => {
    const helpers = createHelpers();
    const group = [{ name: 'Alice', memberId: 'm1' }];
    expect(helpers.guardAgainstGroupDuplicate({ name: 'Bob', memberId: 'm2' }, group)).toBe(true);
  });

  it('returns false when memberId matches', () => {
    const helpers = createHelpers();
    const group = [{ name: 'Alice', memberId: 'm1' }];
    expect(helpers.guardAgainstGroupDuplicate({ name: 'Different', memberId: 'm1' }, group)).toBe(false);
  });

  it('returns false when name matches (case-insensitive)', () => {
    const helpers = createHelpers();
    const group = [{ name: 'Alice Smith' }];
    expect(helpers.guardAgainstGroupDuplicate({ name: 'alice smith' }, group)).toBe(false);
  });

  it('returns true for empty group', () => {
    const helpers = createHelpers();
    expect(helpers.guardAgainstGroupDuplicate({ name: 'Alice' }, [])).toBe(true);
  });

  it('handles string players in group', () => {
    const helpers = createHelpers();
    const group = ['Alice'];
    expect(helpers.guardAgainstGroupDuplicate('alice', group)).toBe(false);
  });
});

// ── validateGroupCompat ────────────────────────────────────────
describe('validateGroupCompat', () => {
  let domainValidateGroup;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../../../../src/tennis/domain/waitlist.js');
    domainValidateGroup = mod.validateGroup;
  });

  it('delegates to domain validator when available', () => {
    domainValidateGroup.mockReturnValue({ ok: true, errors: [] });
    const result = validateGroupCompat([{ name: 'Alice' }], 0);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('normalizes domain validator output', () => {
    domainValidateGroup.mockReturnValue({ ok: false, errors: 'single error' });
    const result = validateGroupCompat([{ name: 'Alice' }], 0);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(['single error']);
  });

  it('falls through to local validator when domain throws', () => {
    domainValidateGroup.mockImplementation(() => { throw new Error('bad'); });
    const result = validateGroupCompat([{ name: 'Alice' }], 0);
    expect(result.ok).toBe(true);
  });

  it('rejects empty group with no guests', () => {
    domainValidateGroup.mockReturnValue(undefined); // force fallthrough
    const result = validateGroupCompat([], 0);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Enter at least one player.');
  });

  it('accepts group with 1 named player', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const result = validateGroupCompat([{ name: 'Alice' }], 0);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects group exceeding 4 players', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const players = [
      { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' },
    ];
    const result = validateGroupCompat(players, 0);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Maximum group size is 4.');
  });

  it('accepts guests via separate guests field', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const result = validateGroupCompat([], 1);
    expect(result.ok).toBe(true);
  });

  it('accepts guests via isGuest flag in players array', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const result = validateGroupCompat([{ name: 'Guest', isGuest: true }], 0);
    expect(result.ok).toBe(true);
  });

  it('rejects negative guests', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const result = validateGroupCompat([{ name: 'Alice' }], -1);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Guests must be 0 or more.');
  });

  it('handles null players array', () => {
    domainValidateGroup.mockReturnValue(undefined);
    const result = validateGroupCompat(null, 0);
    expect(result.ok).toBe(false);
  });

  it('does not double-count guest rows and guest field', () => {
    domainValidateGroup.mockReturnValue(undefined);
    // 2 named + 1 guest row + guests=1 → effectiveGuests = max(1,1) = 1, total = 3
    const result = validateGroupCompat(
      [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Guest', isGuest: true }],
      1
    );
    expect(result.ok).toBe(true);
  });
});
