/**
 * normalizeCourt tests
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeCourt } from '../../../../src/lib/normalize/normalizeCourt.js';

// Mock session and block normalizers
vi.mock('../../../../src/lib/normalize/normalizeSession.js', () => ({
  normalizeSession: vi.fn((raw, serverNow) => {
    if (!raw) return null;
    return {
      id: raw.id || raw.session_id || 'unknown',
      courtNumber: raw.court_number || 0,
      group: { id: 'g1', players: [], type: 'singles' },
      startedAt: raw.started_at || '',
      scheduledEndAt: raw.scheduled_end_at || '',
      actualEndAt: raw.actual_end_at || null,
      endReason: null,
      isOvertime: false,
      isTournament: raw.is_tournament ?? false,
    };
  }),
}));

vi.mock('../../../../src/lib/normalize/normalizeBlock.js', () => ({
  normalizeBlock: vi.fn((raw, serverNow) => {
    if (!raw) return null;
    return {
      id: raw.id || raw.block_id || 'unknown',
      courtNumber: raw.court_number || 0,
      startsAt: raw.starts_at || '',
      endsAt: raw.ends_at || '',
      reason: raw.title || '',
      blockType: raw.block_type || undefined,
      isActive: true,
    };
  }),
}));

describe('normalizeCourt', () => {
  const serverNow = '2024-06-15T12:00:00Z';

  it('returns default court for null', () => {
    const result = normalizeCourt(null, serverNow);
    expect(result.id).toBe('');
    expect(result.number).toBe(0);
    expect(result.isAvailable).toBe(true);
    expect(result.session).toBeNull();
    expect(result.block).toBeNull();
  });

  it('normalizes court with number field', () => {
    const result = normalizeCourt({ court_id: 'c1', number: 5, status: 'available' }, serverNow);
    expect(result.id).toBe('c1');
    expect(result.number).toBe(5);
    expect(result.isAvailable).toBe(true);
  });

  it('uses court_number as fallback', () => {
    const result = normalizeCourt({ id: 'c2', court_number: 7 }, serverNow);
    expect(result.number).toBe(7);
  });

  it('parses number from name string', () => {
    const result = normalizeCourt({ id: 'c3', name: 'Court 8' }, serverNow);
    expect(result.number).toBe(8);
  });

  it('handles nested session format', () => {
    const result = normalizeCourt({
      court_id: 'c4',
      number: 1,
      session: { id: 's1', court_number: 1 },
      status: 'occupied',
    }, serverNow);
    expect(result.session).not.toBeNull();
    expect(result.isOccupied).toBe(true);
  });

  it('handles flattened session format (session_id)', () => {
    const result = normalizeCourt({
      court_id: 'c5',
      number: 2,
      session_id: 's2',
      started_at: '2024-06-15T10:00:00Z',
      scheduled_end_at: '2024-06-15T11:00:00Z',
      session_type: 'doubles',
      status: 'occupied',
    }, serverNow);
    expect(result.session).not.toBeNull();
    expect(result.session.id).toBe('s2');
  });

  it('handles nested block format', () => {
    const result = normalizeCourt({
      court_id: 'c6',
      number: 3,
      block: { id: 'b1', court_number: 3, starts_at: 's', ends_at: 'e', title: 'Lesson' },
      status: 'blocked',
    }, serverNow);
    expect(result.block).not.toBeNull();
    expect(result.isBlocked).toBe(true);
  });

  it('handles flattened block format (block_id)', () => {
    const result = normalizeCourt({
      court_id: 'c7',
      number: 4,
      block_id: 'b2',
      block_title: 'Maintenance',
      block_starts_at: '2024-06-15T10:00:00Z',
      block_ends_at: '2024-06-15T14:00:00Z',
      block_type: 'maintenance',
      status: 'blocked',
    }, serverNow);
    expect(result.block).not.toBeNull();
    expect(result.isBlocked).toBe(true);
  });

  it('derives isAvailable from status', () => {
    expect(normalizeCourt({ number: 1, status: 'available' }, serverNow).isAvailable).toBe(true);
    expect(normalizeCourt({ number: 1, status: 'occupied' }, serverNow).isAvailable).toBe(false);
    expect(normalizeCourt({ number: 1, status: 'blocked' }, serverNow).isAvailable).toBe(false);
  });

  it('uses isOccupied/is_occupied override', () => {
    const result = normalizeCourt({ number: 1, isOccupied: true }, serverNow);
    expect(result.isOccupied).toBe(true);
    expect(result.isAvailable).toBe(false);
  });

  it('uses isBlocked/is_blocked override', () => {
    const result = normalizeCourt({ number: 1, isBlocked: true }, serverNow);
    expect(result.isBlocked).toBe(true);
    expect(result.isAvailable).toBe(false);
  });

  it('detects overtime from status', () => {
    const result = normalizeCourt({ number: 1, status: 'overtime' }, serverNow);
    expect(result.isOvertime).toBe(true);
    expect(result.isOccupied).toBe(true);
  });

  it('generates fallback id from number', () => {
    const result = normalizeCourt({ number: 9 }, serverNow);
    expect(result.id).toBe('court-9');
  });

  it('propagates isTournament from session', () => {
    const result = normalizeCourt({
      number: 1,
      session: { id: 's1', is_tournament: true },
      status: 'occupied',
    }, serverNow);
    expect(result.isTournament).toBe(true);
  });
});
