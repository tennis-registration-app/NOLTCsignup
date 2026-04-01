/**
 * normalizeSession tests
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeSession } from '../../../../src/lib/normalize/normalizeSession.js';

vi.mock('../../../../src/lib/normalize/normalizeGroup.js', () => ({
  normalizeGroup: vi.fn((raw) => ({
    id: raw?.id || 'unknown',
    players: raw?.players || [],
    type: 'singles',
  })),
}));

describe('normalizeSession', () => {
  const serverNow = '2024-06-15T12:00:00Z';

  it('returns null for null input', () => {
    expect(normalizeSession(null as any, serverNow)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeSession(undefined as any, serverNow)).toBeNull();
  });

  it('normalizes camelCase fields', () => {
    const result = normalizeSession({
      id: 's1',
      courtNumber: 3,
      startedAt: '2024-06-15T10:00:00Z',
      scheduledEndAt: '2024-06-15T11:00:00Z',
    }, serverNow);
    expect(result!.id).toBe('s1');
    expect(result!.courtNumber).toBe(3);
    expect(result!.startedAt).toBe('2024-06-15T10:00:00Z');
    expect(result!.scheduledEndAt).toBe('2024-06-15T11:00:00Z');
  });

  it('normalizes snake_case fields', () => {
    const result = normalizeSession({
      sessionId: 's2',
      court_number: 5,
      started_at: '2024-06-15T10:00:00Z',
      scheduled_end_at: '2024-06-15T11:00:00Z',
    }, serverNow);
    expect(result!.id).toBe('s2');
    expect(result!.courtNumber).toBe(5);
  });

  it('calculates overtime when past scheduledEndAt', () => {
    const result = normalizeSession({
      id: 's3',
      scheduledEndAt: '2024-06-15T11:00:00Z', // before serverNow
    }, '2024-06-15T12:00:00Z');
    expect(result!.isOvertime).toBe(true);
  });

  it('is not overtime when before scheduledEndAt', () => {
    const result = normalizeSession({
      id: 's4',
      scheduledEndAt: '2024-06-15T13:00:00Z', // after serverNow
    }, '2024-06-15T12:00:00Z');
    expect(result!.isOvertime).toBe(false);
  });

  it('is not overtime when actualEndAt is set', () => {
    const result = normalizeSession({
      id: 's5',
      scheduledEndAt: '2024-06-15T11:00:00Z',
      actualEndAt: '2024-06-15T11:30:00Z',
    }, '2024-06-15T12:00:00Z');
    expect(result!.isOvertime).toBe(false);
  });

  it('validates endReason against END_REASONS', () => {
    const valid = normalizeSession({ id: 's6', endReason: 'cleared_early' }, serverNow);
    expect(valid!.endReason).toBe('cleared_early');

    const invalid = normalizeSession({ id: 's7', endReason: 'invalid_reason' }, serverNow);
    expect(invalid!.endReason).toBeNull();
  });

  it('uses snake_case end_reason', () => {
    const result = normalizeSession({ id: 's8', end_reason: 'completed' }, serverNow);
    expect(result!.endReason).toBe('completed');
  });

  it('preserves isTournament flag', () => {
    expect(normalizeSession({ id: 's9', isTournament: true }, serverNow).isTournament).toBe(true);
    expect(normalizeSession({ id: 's10', is_tournament: true }, serverNow).isTournament).toBe(true);
    expect(normalizeSession({ id: 's11' }, serverNow).isTournament).toBe(false);
  });

  it('uses session_id as fallback for id', () => {
    const result = normalizeSession({ session_id: 'sid-1' }, serverNow);
    expect(result!.id).toBe('sid-1');
  });

  it('defaults id to unknown', () => {
    expect(normalizeSession({}, serverNow).id).toBe('unknown');
  });

  it('uses endTime as fallback for scheduledEndAt', () => {
    const result = normalizeSession({ id: 's12', endTime: '2024-06-15T13:00:00Z' }, serverNow);
    expect(result!.scheduledEndAt).toBe('2024-06-15T13:00:00Z');
  });
});
