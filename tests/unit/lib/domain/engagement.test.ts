/**
 * engagement.js — Domain-level player engagement lookup tests
 *
 * Tests all 3 exported functions + all branches.
 */

import { describe, it, expect } from 'vitest';
import {
  findEngagementByMemberId,
  buildEngagementIndex,
  getEngagementMessage,
} from '../../../../src/lib/domain/engagement.js';

// ── Fixtures ────────────────────────────────────────────────
function makeBoard({ courts = [], waitlist = [] } = {}) {
  return { courts, waitlist };
}

function makeCourt(number, players = [], groupId = 'g1') {
  return {
    number,
    session: { group: { id: groupId, players } },
  };
}

function makeWaitlistEntry(position, players = [], groupId = 'wg1') {
  return {
    position,
    group: { id: groupId, players },
  };
}

function makePlayer(memberId, displayName = 'Player') {
  return { memberId, displayName };
}

// ── findEngagementByMemberId ────────────────────────────────
describe('findEngagementByMemberId', () => {
  it('returns null for null board', () => {
    expect(findEngagementByMemberId(null, 'm1')).toBeNull();
  });

  it('returns null for null memberId', () => {
    expect(findEngagementByMemberId(makeBoard(), null)).toBeNull();
  });

  it('returns null for empty string memberId', () => {
    expect(findEngagementByMemberId(makeBoard(), '')).toBeNull();
  });

  it('returns null when member not found', () => {
    const board = makeBoard({
      courts: [makeCourt(1, [makePlayer('m1')])],
    });
    expect(findEngagementByMemberId(board, 'm99')).toBeNull();
  });

  it('finds member on court', () => {
    const board = makeBoard({
      courts: [makeCourt(3, [makePlayer('m1', 'John')], 'g5')],
    });
    const result = findEngagementByMemberId(board, 'm1');
    expect(result).toEqual({
      kind: 'court',
      courtNumber: 3,
      groupId: 'g5',
      displayName: 'John',
    });
  });

  it('finds member on waitlist', () => {
    const board = makeBoard({
      courts: [makeCourt(1, [makePlayer('m2')])],
      waitlist: [makeWaitlistEntry(2, [makePlayer('m1', 'Jane')], 'wg3')],
    });
    const result = findEngagementByMemberId(board, 'm1');
    expect(result).toEqual({
      kind: 'waitlist',
      waitlistPosition: 2,
      groupId: 'wg3',
      displayName: 'Jane',
    });
  });

  it('prefers court over waitlist if on both', () => {
    const board = makeBoard({
      courts: [makeCourt(1, [makePlayer('m1', 'CourtPlayer')])],
      waitlist: [makeWaitlistEntry(1, [makePlayer('m1', 'WaitPlayer')])],
    });
    const result = findEngagementByMemberId(board, 'm1');
    expect(result!.kind).toBe('court');
  });

  it('handles missing courts array', () => {
    const board = { waitlist: [makeWaitlistEntry(1, [makePlayer('m1')])] };
    const result = findEngagementByMemberId(board, 'm1');
    expect(result!.kind).toBe('waitlist');
  });

  it('handles missing waitlist array', () => {
    const board = { courts: [makeCourt(1, [makePlayer('m1')])] };
    const result = findEngagementByMemberId(board, 'm1');
    expect(result!.kind).toBe('court');
  });

  it('handles court with no session', () => {
    const board = makeBoard({ courts: [{ number: 1 }] });
    expect(findEngagementByMemberId(board, 'm1')).toBeNull();
  });

  it('handles waitlist entry with no group', () => {
    const board = makeBoard({ waitlist: [{ position: 1 }] });
    expect(findEngagementByMemberId(board, 'm1')).toBeNull();
  });
});

// ── buildEngagementIndex ────────────────────────────────────
describe('buildEngagementIndex', () => {
  it('returns empty map for null board', () => {
    const index = buildEngagementIndex(null);
    expect(index).toBeInstanceOf(Map);
    expect(index.size).toBe(0);
  });

  it('returns empty map for board with no players', () => {
    const board = makeBoard({ courts: [{ number: 1 }], waitlist: [] });
    expect(buildEngagementIndex(board).size).toBe(0);
  });

  it('indexes court players', () => {
    const board = makeBoard({
      courts: [makeCourt(2, [makePlayer('m1', 'Alice'), makePlayer('m2', 'Bob')], 'g1')],
    });
    const index = buildEngagementIndex(board);
    expect(index.size).toBe(2);
    expect(index.get('m1')).toEqual({
      kind: 'court',
      courtNumber: 2,
      groupId: 'g1',
      displayName: 'Alice',
    });
  });

  it('indexes waitlist players', () => {
    const board = makeBoard({
      waitlist: [makeWaitlistEntry(3, [makePlayer('m3', 'Carol')], 'wg2')],
    });
    const index = buildEngagementIndex(board);
    expect(index.get('m3')).toEqual({
      kind: 'waitlist',
      waitlistPosition: 3,
      groupId: 'wg2',
      displayName: 'Carol',
    });
  });

  it('skips players without memberId', () => {
    const board = makeBoard({
      courts: [makeCourt(1, [{ displayName: 'Guest' }])],
    });
    expect(buildEngagementIndex(board).size).toBe(0);
  });

  it('handles missing courts/waitlist arrays', () => {
    const board = {};
    expect(buildEngagementIndex(board).size).toBe(0);
  });

  it('indexes across multiple courts and waitlist entries', () => {
    const board = makeBoard({
      courts: [
        makeCourt(1, [makePlayer('m1')]),
        makeCourt(2, [makePlayer('m2')]),
      ],
      waitlist: [
        makeWaitlistEntry(1, [makePlayer('m3')]),
        makeWaitlistEntry(2, [makePlayer('m4')]),
      ],
    });
    expect(buildEngagementIndex(board).size).toBe(4);
  });
});

// ── getEngagementMessage ────────────────────────────────────
describe('getEngagementMessage', () => {
  it('returns empty string for null engagement', () => {
    expect(getEngagementMessage(null)).toBe('');
  });

  it('returns empty string for undefined engagement', () => {
    expect(getEngagementMessage(undefined)).toBe('');
  });

  it('returns court message with display name', () => {
    const msg = getEngagementMessage({ kind: 'court', courtNumber: 5, displayName: 'Alice' });
    expect(msg).toBe('Alice is already playing on Court 5');
  });

  it('returns court message with fallback name', () => {
    const msg = getEngagementMessage({ kind: 'court', courtNumber: 1 });
    expect(msg).toBe('Player is already playing on Court 1');
  });

  it('returns waitlist message with display name', () => {
    const msg = getEngagementMessage({ kind: 'waitlist', waitlistPosition: 3, displayName: 'Bob' });
    expect(msg).toBe('Bob is already on the waitlist (position 3)');
  });

  it('returns waitlist message with fallback name', () => {
    const msg = getEngagementMessage({ kind: 'waitlist', waitlistPosition: 1 });
    expect(msg).toBe('Player is already on the waitlist (position 1)');
  });

  it('returns generic message for unknown kind', () => {
    const msg = getEngagementMessage({ kind: 'other' });
    expect(msg).toBe('Player is already engaged');
  });
});
