import { describe, it, expect } from 'vitest';
import {
  getFirstWaitlistEntries,
  isMemberOnWaitlist,
  findWaitlistEntryByMember,
  getGroupTypeLabel,
} from '../../../../src/lib/domain/waitlistHelpers.js';

// ============================================================
// Minimal inline fixtures
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const player = (memberId: any) => ({ memberId });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const entry = (id: any, type: any, memberIds: any): any => ({
  id,
  group: {
    type,
    players: memberIds.map(player),
  },
});

const ENTRIES: any[] = [
  entry('wl-1', 'singles', ['M100']),
  entry('wl-2', 'doubles', ['M200', 'M201']),
  entry('wl-3', 'doubles', ['M300', 'M301', 'M302', 'M303']),
];

// ============================================================
// getFirstWaitlistEntries
// ============================================================
describe('getFirstWaitlistEntries', () => {
  it('returns first N entries', () => {
    expect(getFirstWaitlistEntries(ENTRIES, 2)).toEqual([ENTRIES[0], ENTRIES[1]]);
  });

  it('defaults to n=1', () => {
    expect(getFirstWaitlistEntries(ENTRIES)).toEqual([ENTRIES[0]]);
  });

  it('returns all when n > list length', () => {
    expect(getFirstWaitlistEntries(ENTRIES, 10)).toEqual(ENTRIES);
  });

  it('returns empty array when n=0', () => {
    expect(getFirstWaitlistEntries(ENTRIES, 0)).toEqual([]);
  });

  it('returns empty array for empty list', () => {
    expect(getFirstWaitlistEntries([], 3)).toEqual([]);
  });

  it('returns empty array when waitlist is not an array', () => {
    expect(getFirstWaitlistEntries(null as any, 1)).toEqual([]);
    expect(getFirstWaitlistEntries(undefined as any, 1)).toEqual([]);
    expect(getFirstWaitlistEntries('not-array' as any, 1)).toEqual([]);
  });
});

// ============================================================
// isMemberOnWaitlist
// ============================================================
describe('isMemberOnWaitlist', () => {
  it('returns true when member is in a group', () => {
    expect(isMemberOnWaitlist(ENTRIES, 'M200')).toBe(true);
  });

  it('returns true for member nested in multi-player group', () => {
    expect(isMemberOnWaitlist(ENTRIES, 'M302')).toBe(true);
  });

  it('returns false when member is not found', () => {
    expect(isMemberOnWaitlist(ENTRIES, 'M999')).toBe(false);
  });

  it('returns false for empty waitlist', () => {
    expect(isMemberOnWaitlist([], 'M100')).toBe(false);
  });

  it('returns false when waitlist is not an array', () => {
    expect(isMemberOnWaitlist(null as any, 'M100')).toBe(false);
  });

  it('returns false when memberId is falsy', () => {
    expect(isMemberOnWaitlist(ENTRIES, null as any)).toBe(false);
    expect(isMemberOnWaitlist(ENTRIES, '')).toBe(false);
    expect(isMemberOnWaitlist(ENTRIES, undefined as any)).toBe(false);
  });
});

// ============================================================
// findWaitlistEntryByMember
// ============================================================
describe('findWaitlistEntryByMember', () => {
  it('returns the entry containing the member', () => {
    expect(findWaitlistEntryByMember(ENTRIES, 'M200')).toBe(ENTRIES[1]);
  });

  it('returns first matching entry when member appears once', () => {
    expect(findWaitlistEntryByMember(ENTRIES, 'M100')).toBe(ENTRIES[0]);
  });

  it('returns undefined when member is not found', () => {
    expect(findWaitlistEntryByMember(ENTRIES, 'M999')).toBeUndefined();
  });

  it('returns undefined for empty waitlist', () => {
    expect(findWaitlistEntryByMember([], 'M100')).toBeUndefined();
  });

  it('returns undefined when waitlist is not an array', () => {
    expect(findWaitlistEntryByMember(null as any, 'M100')).toBeUndefined();
  });

  it('returns undefined when memberId is falsy', () => {
    expect(findWaitlistEntryByMember(ENTRIES, null as any)).toBeUndefined();
    expect(findWaitlistEntryByMember(ENTRIES, '')).toBeUndefined();
    expect(findWaitlistEntryByMember(ENTRIES, undefined as any)).toBeUndefined();
  });
});

// ============================================================
// getGroupTypeLabel
// ============================================================
describe('getGroupTypeLabel', () => {
  it('returns "Singles" for singles type', () => {
    expect(getGroupTypeLabel(ENTRIES[0])).toBe('Singles');
  });

  it('returns "Doubles" for doubles type', () => {
    expect(getGroupTypeLabel(ENTRIES[1])).toBe('Doubles');
  });

  it('returns "Group" for unknown type', () => {
    expect(getGroupTypeLabel(entry('x', 'mixed', ['M1']))).toBe('Group');
  });

  it('returns "Group" when entry is null', () => {
    expect(getGroupTypeLabel(null as any)).toBe('Group');
  });

  it('returns "Group" when entry is undefined', () => {
    expect(getGroupTypeLabel(undefined as any)).toBe('Group');
  });

  it('returns "Group" when group is missing', () => {
    expect(getGroupTypeLabel({} as any)).toBe('Group');
  });

  it('returns "Group" when group.type is missing', () => {
    expect(getGroupTypeLabel({ group: {} } as any)).toBe('Group');
  });
});
