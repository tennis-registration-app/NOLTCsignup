import { describe, it, expect } from 'vitest';
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
});
