import { describe, it, expect } from 'vitest';
import { isCourtEligibleForGroup, SINGLES_ONLY_COURT_NUMBERS } from '../../../src/lib/types/domain.js';

describe('isCourtEligibleForGroup', () => {
  it('allows 1 player on Court 8', () => {
    expect(isCourtEligibleForGroup(8, 1)).toBe(true);
  });

  it('allows 2 players on Court 8', () => {
    expect(isCourtEligibleForGroup(8, 2)).toBe(true);
  });

  it('allows 3 players on Court 8', () => {
    expect(isCourtEligibleForGroup(8, 3)).toBe(true);
  });

  it('rejects 4 players on Court 8', () => {
    expect(isCourtEligibleForGroup(8, 4)).toBe(false);
  });

  it('allows 4 players on non-restricted court', () => {
    expect(isCourtEligibleForGroup(5, 4)).toBe(true);
  });

  it('allows 0 players on Court 8 (edge case)', () => {
    expect(isCourtEligibleForGroup(8, 0)).toBe(true);
  });
});

describe('SINGLES_ONLY_COURT_NUMBERS', () => {
  it('contains Court 8', () => {
    expect(SINGLES_ONLY_COURT_NUMBERS).toContain(8);
  });
});
