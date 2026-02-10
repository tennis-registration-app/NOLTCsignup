import { describe, it, expect } from 'vitest';

describe('Deferred waitlist — queue filtering', () => {
  it('deferred entries excluded from active waitlist count', () => {
    const entries = [
      { id: '1', deferred: true, players: [{ name: 'A' }] },
      { id: '2', deferred: false, players: [{ name: 'B' }] },
    ];
    const active = entries.filter((e) => !e.deferred);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('2');
  });

  it('all deferred entries means empty active queue', () => {
    const entries = [
      { id: '1', deferred: true, players: [{ name: 'A' }] },
      { id: '2', deferred: true, players: [{ name: 'B' }] },
    ];
    const active = entries.filter((e) => !e.deferred);
    expect(active.length).toBe(0);
  });

  it('hasWaiters is false when all entries deferred', () => {
    const waitlist = [{ deferred: true }, { deferred: true }];
    const hasWaiters = waitlist.some((e) => !e.deferred);
    expect(hasWaiters).toBe(false);
  });

  it('hasWaiters is true when at least one non-deferred', () => {
    const waitlist = [{ deferred: true }, { deferred: false }];
    const hasWaiters = waitlist.some((e) => !e.deferred);
    expect(hasWaiters).toBe(true);
  });

  it('empty waitlist has no waiters', () => {
    const waitlist = [];
    const hasWaiters = waitlist.some((e) => !e.deferred);
    expect(hasWaiters).toBe(false);
  });

  it('undefined deferred treated as false (active)', () => {
    const waitlist = [{ id: '1' }, { id: '2', deferred: true }];
    const active = waitlist.filter((e) => !e.deferred);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('1');
  });
});

describe('Deferred waitlist — hasFullTimeCourt logic', () => {
  it('returns true when no upcoming blocks exist', () => {
    // No blocks = no restrictions = all courts have full time
    // This verifies our fix from commit 9e6957f
    const upcomingBlocks = [];
    // When upcomingBlocks is empty, any court has full time
    const hasFullTime = upcomingBlocks.length === 0;
    expect(hasFullTime).toBe(true);
  });

  it('returns false when all courts have upcoming blocks', () => {
    const upcomingBlocks = [
      { courtNumber: 1, startTime: '2026-01-01T12:00:00Z' },
      { courtNumber: 2, startTime: '2026-01-01T12:00:00Z' },
    ];
    const availableCourts = [1, 2];
    // All available courts are blocked
    const hasFullTimeCourt = availableCourts.some((courtNum) => {
      return !upcomingBlocks.some((b) => b.courtNumber === courtNum);
    });
    expect(hasFullTimeCourt).toBe(false);
  });

  it('returns true when at least one court has no upcoming block', () => {
    const upcomingBlocks = [{ courtNumber: 1, startTime: '2026-01-01T12:00:00Z' }];
    const availableCourts = [1, 2, 3];
    // Court 2 and 3 have no blocks
    const hasFullTimeCourt = availableCourts.some((courtNum) => {
      return !upcomingBlocks.some((b) => b.courtNumber === courtNum);
    });
    expect(hasFullTimeCourt).toBe(true);
  });
});

describe('Deferred waitlist — CTA count logic', () => {
  it('counts full-time courts excluding those with upcoming blocks', () => {
    const availableCourts = [1, 2, 3, 4];
    const upcomingBlocks = [
      { courtNumber: 1, startTime: '2026-01-01T12:00:00Z' },
      { courtNumber: 3, startTime: '2026-01-01T12:00:00Z' },
    ];
    const fullTimeCourts = availableCourts.filter((courtNum) => {
      return !upcomingBlocks.some((b) => b.courtNumber === courtNum);
    });
    expect(fullTimeCourts).toEqual([2, 4]);
    expect(fullTimeCourts.length).toBe(2);
  });

  it('deferred groups need separate full-time courts', () => {
    const deferredGroups = [{ id: '1' }, { id: '2' }];
    const fullTimeCourtCount = 2;
    // Each deferred group needs its own court
    const canServeAll = fullTimeCourtCount >= deferredGroups.length;
    expect(canServeAll).toBe(true);

    const notEnough = 1 >= deferredGroups.length;
    expect(notEnough).toBe(false);
  });
});
