/**
 * normalizeBoard tests
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeBoard } from '../../../../src/lib/normalize/normalizeBoard.js';

// Mock normalizeCourt & normalizeWaitlistEntry to isolate normalizeBoard
vi.mock('../../../../src/lib/normalize/normalizeCourt.js', () => ({
  normalizeCourt: vi.fn((raw, serverNow) => ({
    id: raw.court_id || raw.id || '',
    number: raw.number || raw.court_number || 0,
    isOccupied: raw.status === 'occupied',
    isBlocked: raw.status === 'blocked',
    isOvertime: false,
    isAvailable: raw.status === 'available',
    isTournament: false,
    session: null,
    block: raw.status === 'blocked' ? { startsAt: 'start', endsAt: 'end', reason: 'test', isActive: true } : null,
  })),
}));

vi.mock('../../../../src/lib/normalize/normalizeWaitlistEntry.js', () => ({
  normalizeWaitlistEntry: vi.fn((raw) => ({
    id: raw.id || 'unknown',
    position: raw.position ?? 0,
    group: { players: [], type: 'singles', id: raw.id },
    joinedAt: '',
    minutesWaiting: 0,
    estimatedCourtTime: null,
    deferred: false,
  })),
}));

describe('normalizeBoard', () => {
  it('returns empty board for null', () => {
    const result = normalizeBoard(null);
    expect(result.courts).toEqual([]);
    expect(result.waitlist).toEqual([]);
    expect(result.serverNow).toBeTruthy();
  });

  it('returns empty board for undefined', () => {
    const result = normalizeBoard(undefined);
    expect(result.courts).toEqual([]);
    expect(result.waitlist).toEqual([]);
  });

  it('normalizes courts array', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [
        { court_id: 'c1', number: 1, status: 'available' },
        { court_id: 'c2', number: 2, status: 'occupied' },
      ],
    });
    expect(result.courts).toHaveLength(2);
    expect(result.courts[0].number).toBe(1);
    expect(result.courts[1].number).toBe(2);
  });

  it('normalizes waitlist', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [],
      waitlist: [
        { id: 'w1', position: 2 },
        { id: 'w2', position: 1 },
      ],
    });
    expect(result.waitlist).toHaveLength(2);
    // Should be sorted by position
    expect(result.waitlist[0].position).toBeLessThanOrEqual(result.waitlist[1].position);
  });

  it('uses waitingGroups as fallback for waitlist', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [],
      waitingGroups: [{ id: 'w1', position: 1 }],
    });
    expect(result.waitlist).toHaveLength(1);
  });

  it('extracts active blocks from courts', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [
        { court_id: 'c1', number: 3, status: 'blocked' },
        { court_id: 'c2', number: 4, status: 'available' },
      ],
    });
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].courtNumber).toBe(3);
  });

  it('normalizes upcomingBlocks', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [],
      upcomingBlocks: [
        { id: 'b1', courtNumber: 5, startsAt: 's', endsAt: 'e', title: 'Lesson', blockType: 'lesson' },
      ],
    });
    expect(result.upcomingBlocks).toHaveLength(1);
    expect(result.upcomingBlocks[0].courtNumber).toBe(5);
    expect(result.upcomingBlocks[0].isActive).toBe(false);
  });

  it('passes through operatingHours', () => {
    const hours = [{ day: 0, opens: '08:00' }];
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [],
      operatingHours: hours,
    });
    expect(result.operatingHours).toBe(hours);
  });

  it('defaults operatingHours to empty array', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: [],
    });
    expect(result.operatingHours).toEqual([]);
  });

  it('handles non-array courts gracefully', () => {
    const result = normalizeBoard({
      serverNow: '2024-01-01T12:00:00Z',
      courts: 'not-array',
    });
    expect(result.courts).toEqual([]);
  });
});
