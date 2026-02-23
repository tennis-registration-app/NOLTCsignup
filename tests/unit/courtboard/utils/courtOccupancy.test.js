/**
 * courtOccupancy — isCourtOccupied tests
 *
 * Pure function, no DOM/window/storage dependencies.
 */

import { describe, it, expect } from 'vitest';
import { isCourtOccupied } from '../../../../src/courtboard/utils/courtOccupancy.js';

describe('isCourtOccupied', () => {
  // --- truthy cases ---

  it('returns true when court.isOccupied is true', () => {
    expect(isCourtOccupied({ isOccupied: true })).toBe(true);
  });

  it('returns true when session.group.players has entries', () => {
    const court = {
      isOccupied: false,
      session: { group: { players: [{ name: 'Alice' }] } },
    };
    expect(isCourtOccupied(court)).toBe(true);
  });

  it('returns true when session.participants has entries (API wire format)', () => {
    const court = {
      isOccupied: false,
      session: { participants: [{ id: 'p1' }] },
    };
    expect(isCourtOccupied(court)).toBe(true);
  });

  it('returns true when isOccupied is true even with no session', () => {
    expect(isCourtOccupied({ isOccupied: true, session: null })).toBe(true);
  });

  it('returns true when both players and participants exist', () => {
    const court = {
      session: {
        group: { players: [{ name: 'Alice' }] },
        participants: [{ id: 'p1' }],
      },
    };
    expect(isCourtOccupied(court)).toBe(true);
  });

  // --- falsy cases ---

  it('returns false for null court', () => {
    expect(isCourtOccupied(null)).toBe(false);
  });

  it('returns false for undefined court', () => {
    expect(isCourtOccupied(undefined)).toBe(false);
  });

  it('returns false for empty court object', () => {
    expect(isCourtOccupied({})).toBe(false);
  });

  it('returns false when isOccupied is false and no session', () => {
    expect(isCourtOccupied({ isOccupied: false })).toBe(false);
  });

  it('returns false when session exists but has no group or participants', () => {
    expect(isCourtOccupied({ session: {} })).toBe(false);
  });

  it('returns false when session.group exists but has no players', () => {
    expect(isCourtOccupied({ session: { group: {} } })).toBe(false);
  });

  it('returns false when session.group.players is empty array', () => {
    expect(isCourtOccupied({ session: { group: { players: [] } } })).toBe(false);
  });

  it('returns false when session.participants is empty array', () => {
    expect(isCourtOccupied({ session: { participants: [] } })).toBe(false);
  });

  it('returns false when isOccupied is false and all arrays empty', () => {
    const court = {
      isOccupied: false,
      session: {
        group: { players: [] },
        participants: [],
      },
    };
    expect(isCourtOccupied(court)).toBe(false);
  });
});
