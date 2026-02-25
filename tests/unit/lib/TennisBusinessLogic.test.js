import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/lib/court-blocks.js', () => ({
  getCourtBlockStatus: vi.fn(() => null),
}));

import { getCourtBlockStatus } from '../../../src/lib/court-blocks.js';
import { TennisBusinessLogic } from '../../../src/lib/TennisBusinessLogic.js';

describe('TennisBusinessLogic.formatPlayerDisplayName', () => {
  it('returns empty string for null/undefined', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName(null)).toBe('');
    expect(TennisBusinessLogic.formatPlayerDisplayName(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName('')).toBe('');
  });

  it('returns first name for single word name', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName('John')).toBe('John');
  });

  it('formats two-word name as initial + last name', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName('John Smith')).toBe('J. Smith');
  });

  it('formats three-word name using first initial and last name', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName('John Paul Smith')).toBe('J. Smith');
  });

  it('handles extra whitespace', () => {
    expect(TennisBusinessLogic.formatPlayerDisplayName('  John   Smith  ')).toBe('J. Smith');
  });
});

describe('TennisBusinessLogic.checkGroupOverlap', () => {
  it('returns no overlap for null/undefined groups', () => {
    const result = TennisBusinessLogic.checkGroupOverlap(null, null);
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingPlayers).toEqual([]);
  });

  it('returns no overlap for empty groups', () => {
    const result = TennisBusinessLogic.checkGroupOverlap([], []);
    expect(result.hasOverlap).toBe(false);
  });

  it('returns no overlap for disjoint groups', () => {
    const group1 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const group2 = [{ id: '3', name: 'C' }, { id: '4', name: 'D' }];
    const result = TennisBusinessLogic.checkGroupOverlap(group1, group2);
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingCount).toBe(0);
  });

  it('detects overlapping players', () => {
    const group1 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const group2 = [{ id: '2', name: 'B' }, { id: '3', name: 'C' }];
    const result = TennisBusinessLogic.checkGroupOverlap(group1, group2);
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingCount).toBe(1);
    expect(result.overlappingPlayers[0].id).toBe('2');
  });

  it('detects exact match', () => {
    const group1 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const group2 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const result = TennisBusinessLogic.checkGroupOverlap(group1, group2);
    expect(result.hasOverlap).toBe(true);
    expect(result.isExactMatch).toBe(true);
  });

  it('detects subset relationship', () => {
    const group1 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }, { id: '3', name: 'C' }];
    const group2 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const result = TennisBusinessLogic.checkGroupOverlap(group1, group2);
    expect(result.hasOverlap).toBe(true);
    expect(result.isSubset).toBe(true);
    expect(result.isSuperset).toBe(false);
  });

  it('detects superset relationship', () => {
    const group1 = [{ id: '1', name: 'A' }];
    const group2 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    const result = TennisBusinessLogic.checkGroupOverlap(group1, group2);
    expect(result.hasOverlap).toBe(true);
    expect(result.isSuperset).toBe(true);
    expect(result.isSubset).toBe(false);
  });
});

describe('TennisBusinessLogic.calculateGameDuration', () => {
  it('returns singles duration for 1-3 players', () => {
    // Default singles is 60 minutes from config
    expect(TennisBusinessLogic.calculateGameDuration(1)).toBe(60);
    expect(TennisBusinessLogic.calculateGameDuration(2)).toBe(60);
    expect(TennisBusinessLogic.calculateGameDuration(3)).toBe(60);
  });

  it('returns doubles duration for 4 players', () => {
    // Default doubles is 90 minutes from config (DOUBLES_DURATION_MIN)
    expect(TennisBusinessLogic.calculateGameDuration(4)).toBe(90);
  });

  it('accepts custom duration parameters', () => {
    expect(TennisBusinessLogic.calculateGameDuration(2, 45, 90, 4)).toBe(45);
    expect(TennisBusinessLogic.calculateGameDuration(4, 45, 90, 4)).toBe(90);
  });
});

describe('TennisBusinessLogic.isPlayerAlreadyPlaying', () => {
  it('returns not playing for null data', () => {
    const result = TennisBusinessLogic.isPlayerAlreadyPlaying('123', null);
    expect(result.isPlaying).toBe(false);
  });

  it('returns not playing for empty data', () => {
    const result = TennisBusinessLogic.isPlayerAlreadyPlaying('123', { courts: [], waitlist: [] });
    expect(result.isPlaying).toBe(false);
  });

  it('detects player on court', () => {
    const data = {
      courts: [
        {
          number: 1,
          session: {
            group: {
              players: [{ memberId: '123', displayName: 'John' }],
            },
          },
        },
      ],
      waitlist: [],
    };
    const result = TennisBusinessLogic.isPlayerAlreadyPlaying('123', data);
    expect(result.isPlaying).toBe(true);
    expect(result.location).toBe('court');
    expect(result.courtNumber).toBe(1);
  });

  it('detects player on waitlist', () => {
    const data = {
      courts: [],
      waitlist: [
        {
          position: 1,
          group: {
            players: [{ memberId: '456', displayName: 'Jane' }],
          },
        },
      ],
    };
    const result = TennisBusinessLogic.isPlayerAlreadyPlaying('456', data);
    expect(result.isPlaying).toBe(true);
    expect(result.location).toBe('waiting');
    expect(result.position).toBe(1);
  });

  it('detects player in current group', () => {
    const data = { courts: [], waitlist: [] };
    const currentGroup = [{ id: '789', name: 'Bob' }];
    const result = TennisBusinessLogic.isPlayerAlreadyPlaying('789', data, currentGroup);
    expect(result.isPlaying).toBe(true);
    expect(result.location).toBe('current');
  });
});

describe('TennisBusinessLogic.sameGroup', () => {
  it('returns true for identical groups', () => {
    const a = [{ memberId: '1', name: 'A' }];
    const b = [{ memberId: '1', name: 'A' }];
    expect(TennisBusinessLogic.sameGroup(a, b)).toBe(true);
  });

  it('returns false for different size groups', () => {
    const a = [{ memberId: '1', name: 'A' }];
    const b = [{ memberId: '1', name: 'A' }, { memberId: '2', name: 'B' }];
    expect(TennisBusinessLogic.sameGroup(a, b)).toBe(false);
  });

  it('returns true for same players in different order', () => {
    const a = [{ memberId: '1', name: 'A' }, { memberId: '2', name: 'B' }];
    const b = [{ memberId: '2', name: 'B' }, { memberId: '1', name: 'A' }];
    expect(TennisBusinessLogic.sameGroup(a, b)).toBe(true);
  });

  it('compares case-insensitively', () => {
    const a = [{ name: 'John Smith' }];
    const b = [{ name: 'john smith' }];
    expect(TennisBusinessLogic.sameGroup(a, b)).toBe(true);
  });

  it('handles empty arrays', () => {
    expect(TennisBusinessLogic.sameGroup([], [])).toBe(true);
  });

  it('handles undefined defaults', () => {
    expect(TennisBusinessLogic.sameGroup(undefined, undefined)).toBe(true);
  });

  it('compares by id when memberId missing', () => {
    const a = [{ id: '100' }];
    const b = [{ id: '100' }];
    expect(TennisBusinessLogic.sameGroup(a, b)).toBe(true);
  });
});

// ── calculateEstimatedWaitTime ──────────────────────────────
describe('TennisBusinessLogic.calculateEstimatedWaitTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 for null courts', () => {
    expect(TennisBusinessLogic.calculateEstimatedWaitTime(1, null, new Date())).toBe(0);
  });

  it('returns 0 for non-array courts', () => {
    expect(TennisBusinessLogic.calculateEstimatedWaitTime(1, 'bad', new Date())).toBe(0);
  });

  it('returns 0 for position < 1', () => {
    expect(TennisBusinessLogic.calculateEstimatedWaitTime(0, [], new Date())).toBe(0);
  });

  it('returns 0 for position 1 when no courts have end times', () => {
    expect(TennisBusinessLogic.calculateEstimatedWaitTime(1, [null, null], new Date())).toBe(0);
  });

  it('calculates wait time based on court session end times', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const courts = [
      { session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() } },
      { session: { scheduledEndAt: new Date('2025-01-15T11:00:00Z').toISOString() } },
    ];
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(1, courts, now);
    expect(result).toBe(30); // First court ends in 30 min
  });

  it('calculates for position 2 with sorted court end times', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const courts = [
      { session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() } },
      { session: { scheduledEndAt: new Date('2025-01-15T11:00:00Z').toISOString() } },
    ];
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(2, courts, now);
    expect(result).toBe(60); // Second court ends in 60 min
  });

  it('uses block status end time when no session', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    getCourtBlockStatus.mockReturnValue({
      endTime: new Date('2025-01-15T10:45:00Z').toISOString(),
    });
    const courts = [{}]; // No session but has block
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(1, courts, now);
    expect(result).toBe(45);
  });

  it('estimates based on rounds when position exceeds court count', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const courts = [
      { session: { scheduledEndAt: new Date('2025-01-15T10:30:00Z').toISOString() } },
    ];
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(3, courts, now, 75);
    // rounds = ceil(3/1) = 3, baseWait = 30 + (3-1)*75 = 180
    expect(result).toBeGreaterThan(100);
  });

  it('estimates without end times for positions > 1', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const courts = [null, null, null]; // 3 free courts
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(4, courts, now, 75);
    // position=4, courtsAvailable=3, rounds=ceil(4/3)=2
    // courtEndTimes.length === 0, so formula: ceil(((4-1)/3)*75) = ceil(75) = 75
    expect(result).toBe(75);
  });

  it('skips null courts in end time calculation', () => {
    const now = new Date('2025-01-15T10:00:00Z');
    const courts = [
      null,
      { session: { scheduledEndAt: new Date('2025-01-15T10:20:00Z').toISOString() } },
    ];
    const result = TennisBusinessLogic.calculateEstimatedWaitTime(1, courts, now);
    expect(result).toBe(20);
  });
});

// ── getOriginalEndTimeForGroup ──────────────────────────────
describe('TennisBusinessLogic.getOriginalEndTimeForGroup', () => {
  it('returns null for empty players', () => {
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup([], [])).toBeNull();
  });

  it('returns null for empty recentlyCleared', () => {
    const players = [{ memberId: '1', name: 'A' }];
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup(players, [])).toBeNull();
  });

  it('returns null for non-array players', () => {
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup(null, [])).toBeNull();
  });

  it('returns null for non-array recentlyCleared', () => {
    const players = [{ memberId: '1', name: 'A' }];
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup(players, null)).toBeNull();
  });

  it('returns originalEndTime when exact group match found', () => {
    const futureTime = new Date(Date.now() + 3600000).toISOString();
    const players = [{ memberId: '1', name: 'Alice' }];
    const recentlyCleared = [
      {
        players: [{ memberId: '1', name: 'Alice' }],
        originalEndTime: futureTime,
      },
    ];
    const result = TennisBusinessLogic.getOriginalEndTimeForGroup(players, recentlyCleared);
    expect(result).toBe(futureTime);
  });

  it('returns null when session has expired', () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString();
    const players = [{ memberId: '1', name: 'Alice' }];
    const recentlyCleared = [
      {
        players: [{ memberId: '1', name: 'Alice' }],
        originalEndTime: pastTime,
      },
    ];
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup(players, recentlyCleared)).toBeNull();
  });

  it('returns null when groups do not match', () => {
    const futureTime = new Date(Date.now() + 3600000).toISOString();
    const players = [{ memberId: '1', name: 'Alice' }];
    const recentlyCleared = [
      {
        players: [{ memberId: '2', name: 'Bob' }],
        originalEndTime: futureTime,
      },
    ];
    expect(TennisBusinessLogic.getOriginalEndTimeForGroup(players, recentlyCleared)).toBeNull();
  });
});
