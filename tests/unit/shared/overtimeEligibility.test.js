import { describe, it, expect } from 'vitest';
import {
  computeRegistrationCourtSelection,
  computePlayableCourts,
} from '../../../src/shared/courts/overtimeEligibility.js';

describe('computeRegistrationCourtSelection', () => {
  it('returns empty selection for null/undefined courts', () => {
    const result = computeRegistrationCourtSelection(null);
    expect(result.selectableCourts).toEqual([]);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns empty selection for empty courts array', () => {
    const result = computeRegistrationCourtSelection([]);
    expect(result.selectableCourts).toEqual([]);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns available courts excluding blocked ones', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: true, isBlocked: true, isOvertime: false },
      { number: 3, isAvailable: false, isBlocked: false, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns overtime courts when no primary courts available', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    // No free courts, so overtime courts become selectable
    expect(result.selectableCourts).toHaveLength(2);
    expect(result.selectableCourts.every((sc) => sc.reason === 'overtime_fallback')).toBe(true);
    expect(result.showingOvertimeCourts).toBe(true);
  });

  it('prioritizes primary courts over overtime courts', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    // Only free court is selectable, overtime not included
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('excludes blocked overtime courts', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: true, isOvertime: true },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    // Only unblocked overtime court is selectable
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(2);
  });

  it('builds eligibility map correctly', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: false, isBlocked: true, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.eligibilityByCourtNumber[1].eligible).toBe(true);
    expect(result.eligibilityByCourtNumber[2].eligible).toBe(false);
  });

  it('handles null entries in courts array', () => {
    const courts = [null, { number: 2, isAvailable: true, isBlocked: false }];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.selectableCourts).toHaveLength(1);
  });

  it('handles mixed null and undefined entries safely', () => {
    const courts = [
      null,
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      undefined,
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.selectableCourts.map((sc) => sc.number)).toEqual([1, 2]);
  });

  // Contract: output preserves input ordering (no implicit sort)
  it('preserves input order in output arrays', () => {
    const courts = [
      { number: 5, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.selectableCourts.map((sc) => sc.number)).toEqual([5, 2, 8]);
  });

  it('eligibilityByCourtNumber reflects correct selection state', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // primary
      { number: 2, isAvailable: true, isBlocked: true, isOvertime: false }, // blocked
      { number: 3, isAvailable: false, isBlocked: false, isOvertime: true }, // overtime (not eligible - primaries exist)
    ];
    const result = computeRegistrationCourtSelection(courts);

    // Available unblocked court is eligible
    expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });

    // Blocked court is not eligible
    expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: false });

    // Overtime court not eligible when primaries exist
    expect(result.eligibilityByCourtNumber[3]).toMatchObject({ eligible: false });
  });

  it('eligibilityByCourtNumber marks overtime courts eligible when no primaries', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true },
      { number: 2, isAvailable: false, isBlocked: true, isOvertime: true }, // blocked
    ];
    const result = computeRegistrationCourtSelection(courts);

    // Overtime court eligible when showing overtime
    expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });

    // Blocked overtime still not eligible
    expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: false });
  });

  // Tests for upcomingBlocks and 20-minute threshold
  describe('with upcomingBlocks (20-min threshold)', () => {
    it('shows overtime when free court has block starting in <= 5 minutes (excluded from selectable)', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Free court has <= 5 min, excluded from selectableCourts entirely
      // Only overtime court is in selectableCourts
      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(2);
      expect(result.showingOvertimeCourts).toBe(true);
    });

    it('does NOT show overtime when free court has block starting in > 20 minutes', () => {
      const now = new Date();
      const in25Minutes = new Date(now.getTime() + 25 * 60000).toISOString();
      const in90Minutes = new Date(now.getTime() + 90 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in25Minutes, endTime: in90Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Free court has >= 20 min, so showingOvertimeCourts should be false
      expect(result.selectableCourts).toHaveLength(1);
      expect(result.showingOvertimeCourts).toBe(false);

      // Only primary court should be eligible
      expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });
      expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: false });
    });

    it('does NOT show overtime when free court has no block (no regression)', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = []; // No blocks

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.showingOvertimeCourts).toBe(false);
      expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });
      expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: false });
    });

    it('shows overtime when no free courts exist (no regression)', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Only overtime court is selectable
      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(2);
      expect(result.selectableCourts[0].reason).toBe('overtime_fallback');
      expect(result.showingOvertimeCourts).toBe(true);
      expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: true });
    });

    it('block on different court does not affect usability', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      // Block is on court 3, not court 1
      const upcomingBlocks = [
        { courtNumber: 3, startTime: in5Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court 1 has no block, so showingOvertimeCourts should be false
      expect(result.showingOvertimeCourts).toBe(false);
      expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });
    });

    it('handles multiple free courts with mixed block times', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in25Minutes = new Date(now.getTime() + 25 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 5 min
        { number: 2, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 25 min
        { number: 3, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
        { courtNumber: 2, startTime: in25Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court 2 has >= 20 min, so showingOvertimeCourts should be false
      expect(result.showingOvertimeCourts).toBe(false);
      // Both primary courts are eligible
      expect(result.eligibilityByCourtNumber[1]).toMatchObject({ eligible: true });
      expect(result.eligibilityByCourtNumber[2]).toMatchObject({ eligible: true });
      // Overtime not eligible since usable primary exists
      expect(result.eligibilityByCourtNumber[3]).toMatchObject({ eligible: false });
    });
  });

  // Tests for the new enriched API (selectableCourts, getSelectableForGroup, etc.)
  describe('selectableCourts metadata', () => {
    it('free court with no block has null minutesAvailable', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0]).toMatchObject({
        number: 1,
        reason: 'free',
        minutesAvailable: null,
        isUsable: true,
      });
    });

    it('free court with block has correct minutesAvailable', () => {
      const now = new Date();
      const in30Minutes = new Date(now.getTime() + 30 * 60000).toISOString();
      const in90Minutes = new Date(now.getTime() + 90 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in30Minutes, endTime: in90Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(1);
      expect(result.selectableCourts[0].reason).toBe('free');
      // Allow 1 minute margin for test execution time
      expect(result.selectableCourts[0].minutesAvailable).toBeGreaterThanOrEqual(29);
      expect(result.selectableCourts[0].minutesAvailable).toBeLessThanOrEqual(31);
      expect(result.selectableCourts[0].isUsable).toBe(true);
    });

    it('free court with block in < 20 min marked as not usable', () => {
      const now = new Date();
      const in10Minutes = new Date(now.getTime() + 10 * 60000).toISOString();
      const in90Minutes = new Date(now.getTime() + 90 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in10Minutes, endTime: in90Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].isUsable).toBe(false);
    });

    it('overtime court included when free court has <= 5 min (excluded)', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 5 min
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Free court with <= 5 min is excluded, only overtime in selectableCourts
      expect(result.showingOvertimeCourts).toBe(true);
      expect(result.selectableCourts).toHaveLength(1);

      const overtimeCourt = result.selectableCourts.find((sc) => sc.number === 2);

      expect(overtimeCourt.reason).toBe('overtime_fallback');
      expect(overtimeCourt.minutesAvailable).toBe(null);
      expect(overtimeCourt.isUsable).toBe(true);
    });

    it('overtime court NOT included when usable free court exists', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.showingOvertimeCourts).toBe(false);
      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(1);
    });

    it('court with 3 min before block → not in selectableCourts', () => {
      const now = new Date();
      const in3Minutes = new Date(now.getTime() + 3 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in3Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court with <= 5 min is excluded from selectableCourts entirely
      expect(result.selectableCourts).toHaveLength(0);
    });

    it('court with 5 min before block → not in selectableCourts', () => {
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in5Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court with <= 5 min is excluded from selectableCourts entirely
      expect(result.selectableCourts).toHaveLength(0);
    });

    it('court with 6 min before block → in selectableCourts', () => {
      const now = new Date();
      const in6Minutes = new Date(now.getTime() + 6 * 60000).toISOString();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in6Minutes, endTime: in60Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court with > 5 min is included in selectableCourts
      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(1);
      // But not usable (< 20 min)
      expect(result.selectableCourts[0].isUsable).toBe(false);
    });

    it('court with no block → in selectableCourts', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.selectableCourts).toHaveLength(1);
      expect(result.selectableCourts[0].number).toBe(1);
      expect(result.selectableCourts[0].minutesAvailable).toBe(null);
      expect(result.selectableCourts[0].isUsable).toBe(true);
    });
  });

  describe('getSelectableForGroup (singles-only Court 8 filtering)', () => {
    it('filters out Court 8 for doubles (4 players)', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Both courts in selectableCourts
      expect(result.selectableCourts).toHaveLength(2);

      // But for 4 players (doubles), Court 8 is filtered out
      const doublesSelectable = result.getSelectableForGroup(4);
      expect(doublesSelectable).toHaveLength(1);
      expect(doublesSelectable[0].number).toBe(1);
    });

    it('includes Court 8 for singles (2 players)', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // For 2 players (singles), Court 8 is included
      const singlesSelectable = result.getSelectableForGroup(2);
      expect(singlesSelectable).toHaveLength(2);
      expect(singlesSelectable.map((sc) => sc.number)).toContain(8);
    });

    it('returns all selectable for doubles on non-Court-8 courts', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 3, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      const doublesSelectable = result.getSelectableForGroup(4);
      expect(doublesSelectable).toHaveLength(3);
    });

    it('Court 8 free, doubles group → overtime courts offered', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court 8 is free, so showingOvertimeCourts is false
      expect(result.showingOvertimeCourts).toBe(false);

      // But for doubles, Court 8 is not eligible, so overtime should be offered
      const doublesSelectable = result.getSelectableForGroup(4);
      expect(doublesSelectable).toHaveLength(1);
      expect(doublesSelectable[0].number).toBe(2);
      expect(doublesSelectable[0].reason).toBe('overtime_fallback');
    });

    it('Court 8 free, singles group → Court 8 offered, no overtime', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // For singles, Court 8 is eligible
      const singlesSelectable = result.getSelectableForGroup(2);
      expect(singlesSelectable).toHaveLength(1);
      expect(singlesSelectable[0].number).toBe(8);
      expect(singlesSelectable[0].reason).toBe('free');
    });

    it('Court 8 free + other free court, doubles → other free court offered', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 3, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // For doubles, Court 1 is eligible (Court 8 is not)
      const doublesSelectable = result.getSelectableForGroup(4);
      expect(doublesSelectable).toHaveLength(1);
      expect(doublesSelectable[0].number).toBe(1);
      expect(doublesSelectable[0].reason).toBe('free');
    });

    it('No free courts, doubles → overtime offered (existing behavior)', () => {
      const courts = [
        { number: 1, isAvailable: false, isBlocked: false, isOvertime: true },
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // No free courts, so overtime is shown
      expect(result.showingOvertimeCourts).toBe(true);

      // Both overtime courts are offered for doubles
      const doublesSelectable = result.getSelectableForGroup(4);
      expect(doublesSelectable).toHaveLength(2);
      expect(doublesSelectable.every((sc) => sc.reason === 'overtime_fallback')).toBe(true);
    });
  });

  describe('countFullTimeForGroup', () => {
    it('singles needs 65 min (60 + 5 buffer)', () => {
      const now = new Date();
      const in60Minutes = new Date(now.getTime() + 60 * 60000).toISOString();
      const in70Minutes = new Date(now.getTime() + 70 * 60000).toISOString();
      const in120Minutes = new Date(now.getTime() + 120 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 60 min
        { number: 2, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 70 min
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in60Minutes, endTime: in120Minutes },
        { courtNumber: 2, startTime: in70Minutes, endTime: in120Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // For singles (2 players), need 65 min
      // Court 1: ~60 min available → NOT full time
      // Court 2: ~70 min available → full time
      expect(result.countFullTimeForGroup(2)).toBe(1);
    });

    it('doubles needs 95 min (90 + 5 buffer)', () => {
      const now = new Date();
      const in90Minutes = new Date(now.getTime() + 90 * 60000).toISOString();
      const in100Minutes = new Date(now.getTime() + 100 * 60000).toISOString();
      const in150Minutes = new Date(now.getTime() + 150 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 90 min
        { number: 2, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 100 min
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in90Minutes, endTime: in150Minutes },
        { courtNumber: 2, startTime: in100Minutes, endTime: in150Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // For doubles (4 players), need 95 min
      // Court 1: ~90 min available → NOT full time
      // Court 2: ~100 min available → full time
      expect(result.countFullTimeForGroup(4)).toBe(1);
    });

    it('court with no block is always full time', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.countFullTimeForGroup(2)).toBe(1);
      expect(result.countFullTimeForGroup(4)).toBe(1);
    });

    it('filters Court 8 for doubles in full time count', () => {
      const courts = [
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Court 8 available with no block
      expect(result.countFullTimeForGroup(2)).toBe(1); // Singles OK
      expect(result.countFullTimeForGroup(4)).toBe(0); // Doubles not allowed on Court 8
    });
  });

  describe('CTA scenarios', () => {
    it('deferred group with restricted free + unrestricted overtime → overtime counts', () => {
      const now = new Date();
      const in30Minutes = new Date(now.getTime() + 30 * 60000).toISOString();
      const in120Minutes = new Date(now.getTime() + 120 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 30 min
        { number: 2, isAvailable: false, isBlocked: false, isOvertime: true }, // no block
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in30Minutes, endTime: in120Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // Free court has 30 min (usable for 20 min threshold but not full time for doubles 95 min)
      // showingOvertimeCourts should be false since free court is usable
      expect(result.showingOvertimeCourts).toBe(false);

      // For deferred doubles group (4 players), need full-time courts (95 min)
      // Court 1: 30 min → NOT full time
      // So no full-time courts available in selectable
      expect(result.countFullTimeForGroup(4)).toBe(0);
    });

    it('non-deferred group can use time-restricted court', () => {
      const now = new Date();
      const in25Minutes = new Date(now.getTime() + 25 * 60000).toISOString();
      const in120Minutes = new Date(now.getTime() + 120 * 60000).toISOString();

      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false }, // block in 25 min
      ];
      const upcomingBlocks = [
        { courtNumber: 1, startTime: in25Minutes, endTime: in120Minutes },
      ];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      // 25 min >= 20 min threshold, so court is usable
      expect(result.countSelectableForGroup(4)).toBe(1);

      // But not full time for doubles (needs 95 min)
      expect(result.countFullTimeForGroup(4)).toBe(0);

      // Full time for nothing actually since 25 < 65 (singles) and 25 < 95 (doubles)
      expect(result.countFullTimeForGroup(2)).toBe(0);
    });

    it('countSelectableForGroup returns correct count', () => {
      const courts = [
        { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 2, isAvailable: true, isBlocked: false, isOvertime: false },
        { number: 8, isAvailable: true, isBlocked: false, isOvertime: false },
      ];
      const upcomingBlocks = [];

      const result = computeRegistrationCourtSelection(courts, upcomingBlocks);

      expect(result.countSelectableForGroup(2)).toBe(3); // Singles can use all 3
      expect(result.countSelectableForGroup(4)).toBe(2); // Doubles can't use Court 8
    });
  });
});

describe('computePlayableCourts', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns empty for null/undefined courts', () => {
    const result = computePlayableCourts(null, [], now);
    expect(result.playableCourts).toEqual([]);
    expect(result.playableCourtNumbers).toEqual([]);
  });

  it('returns empty for empty courts array', () => {
    const result = computePlayableCourts([], [], now);
    expect(result.playableCourts).toEqual([]);
  });

  it('filters out null/undefined entries', () => {
    const courts = [null, { number: 2, session: null }, undefined];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourts).toHaveLength(1);
    expect(result.playableCourtNumbers).toContain(2);
  });

  it('excludes courts with active sessions', () => {
    const courts = [
      {
        number: 1,
        session: { scheduledEndAt: '2024-01-15T11:00:00Z' }, // ends in future
      },
      { number: 2, session: null },
    ];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourtNumbers).toEqual([2]);
  });

  it('includes courts in overtime as playable', () => {
    const courts = [
      {
        number: 1,
        isOvertime: true,
        session: { scheduledEndAt: '2024-01-15T09:00:00Z' }, // ended 1 hour ago
      },
    ];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourtNumbers).toContain(1);
  });

  it('excludes courts with active blocks', () => {
    const courts = [{ number: 1, session: null }, { number: 2, session: null }];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    const result = computePlayableCourts(courts, blocks, now);
    expect(result.playableCourtNumbers).toEqual([2]);
  });

  it('builds eligibility map with reasons', () => {
    const courts = [
      { number: 1, session: null, isBlocked: true },
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } },
    ];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    const result = computePlayableCourts(courts, blocks, now);
    expect(result.eligibilityByCourtNumber[1].eligible).toBe(false);
    expect(result.eligibilityByCourtNumber[1].reason).toBe('blocked');
    expect(result.eligibilityByCourtNumber[2].eligible).toBe(false);
    expect(result.eligibilityByCourtNumber[2].reason).toBe('occupied');
  });
});
