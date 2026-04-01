/**
 * normalizeWaitlistEntry tests
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeWaitlistEntry } from '../../../../src/lib/normalize/normalizeWaitlistEntry.js';

vi.mock('../../../../src/lib/normalize/normalizeGroup.js', () => ({
  normalizeGroup: vi.fn((raw) => ({
    id: raw?.id || 'unknown',
    players: raw?.players || [],
    type: 'singles',
  })),
}));

describe('normalizeWaitlistEntry', () => {
  const serverNow = '2024-06-15T12:00:00Z';

  it('returns defaults for null', () => {
    const result = normalizeWaitlistEntry(null as any, serverNow);
    expect(result.id).toBe('unknown');
    expect(result.position).toBe(0);
    expect(result.minutesWaiting).toBe(0);
    expect(result.deferred).toBe(false);
  });

  it('normalizes camelCase fields', () => {
    const result = normalizeWaitlistEntry({
      id: 'w1',
      position: 2,
      joinedAt: '2024-06-15T11:30:00Z',
      minutesWaiting: 30,
      estimatedCourtTime: '2024-06-15T12:30:00Z',
      deferred: true,
    }, serverNow);
    expect(result.id).toBe('w1');
    expect(result.position).toBe(2);
    expect(result.joinedAt).toBe('2024-06-15T11:30:00Z');
    expect(result.minutesWaiting).toBe(30);
    expect(result.estimatedCourtTime).toBe('2024-06-15T12:30:00Z');
    expect(result.deferred).toBe(true);
  });

  it('normalizes snake_case fields', () => {
    const result = normalizeWaitlistEntry({
      entry_id: 'w2',
      queue_position: 3,
      joined_at: '2024-06-15T11:00:00Z',
      minutes_waiting: 60,
      estimated_court_time: '2024-06-15T13:00:00Z',
    }, serverNow);
    expect(result.id).toBe('w2');
    expect(result.position).toBe(3);
    expect(result.minutesWaiting).toBe(60);
  });

  it('calculates minutesWaiting from joinedAt when not provided', () => {
    const result = normalizeWaitlistEntry({
      id: 'w3',
      joinedAt: '2024-06-15T11:00:00Z', // 60 min before serverNow
    }, serverNow);
    expect(result.minutesWaiting).toBe(60);
  });

  it('uses createdAt as fallback for joinedAt', () => {
    const result = normalizeWaitlistEntry({
      id: 'w4',
      createdAt: '2024-06-15T11:30:00Z',
    }, serverNow);
    expect(result.joinedAt).toBe('2024-06-15T11:30:00Z');
  });

  it('uses created_at as fallback for joinedAt', () => {
    const result = normalizeWaitlistEntry({
      id: 'w5',
      created_at: '2024-06-15T11:45:00Z',
    }, serverNow);
    expect(result.joinedAt).toBe('2024-06-15T11:45:00Z');
  });

  it('uses entryId as fallback for id', () => {
    const result = normalizeWaitlistEntry({ entryId: 'eid-1' }, serverNow);
    expect(result.id).toBe('eid-1');
  });

  it('defaults deferred to false', () => {
    const result = normalizeWaitlistEntry({ id: 'w6' }, serverNow);
    expect(result.deferred).toBe(false);
  });

  it('defaults position to 0 when missing', () => {
    const result = normalizeWaitlistEntry({ id: 'w7' }, serverNow);
    expect(result.position).toBe(0);
  });
});
