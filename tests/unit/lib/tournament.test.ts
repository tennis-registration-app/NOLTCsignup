import { describe, it, expect } from 'vitest';
import { normalizeSession } from '../../../src/lib/normalize/normalizeSession.js';
import { normalizeCourt } from '../../../src/lib/normalize/normalizeCourt.js';

describe('Tournament — normalizeSession', () => {
  it('sets isTournament true from snake_case API response', () => {
    const session = normalizeSession(
      {
        is_tournament: true,
        scheduled_end_at: '2026-01-01T12:00:00Z',
        started_at: '2026-01-01T11:00:00Z',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(session.isTournament).toBe(true);
  });

  it('sets isTournament false by default', () => {
    const session = normalizeSession(
      {
        scheduled_end_at: '2026-01-01T12:00:00Z',
        started_at: '2026-01-01T11:00:00Z',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(session.isTournament).toBe(false);
  });

  it('accepts camelCase isTournament', () => {
    const session = normalizeSession(
      {
        isTournament: true,
        scheduled_end_at: '2026-01-01T12:00:00Z',
        started_at: '2026-01-01T11:00:00Z',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(session.isTournament).toBe(true);
  });

  it('prefers snake_case is_tournament over camelCase', () => {
    // is_tournament ?? isTournament — snake_case wins if present
    const session = normalizeSession(
      {
        is_tournament: false,
        isTournament: true,
        scheduled_end_at: '2026-01-01T12:00:00Z',
        started_at: '2026-01-01T11:00:00Z',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(session.isTournament).toBe(false);
  });
});

describe('Tournament — normalizeCourt', () => {
  it('exposes isTournament at court level from nested session', () => {
    const court = normalizeCourt(
      {
        number: 5,
        session: {
          id: 'sess-1',
          is_tournament: true,
          scheduled_end_at: '2026-01-01T12:00:00Z',
          started_at: '2026-01-01T11:00:00Z',
        },
      },
      '2026-01-01T11:30:00Z'
    );
    expect(court.isTournament).toBe(true);
  });

  it('exposes isTournament from flattened session format', () => {
    const court = normalizeCourt(
      {
        number: 3,
        session_id: 'sess-2',
        is_tournament: true,
        scheduled_end_at: '2026-01-01T12:00:00Z',
        started_at: '2026-01-01T11:00:00Z',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(court.isTournament).toBe(true);
  });

  it('sets isTournament false when no session', () => {
    const court = normalizeCourt(
      {
        number: 7,
        status: 'available',
      },
      '2026-01-01T11:30:00Z'
    );
    expect(court.isTournament).toBe(false);
  });

  it('sets isTournament false when session has no tournament flag', () => {
    const court = normalizeCourt(
      {
        number: 2,
        session: {
          id: 'sess-3',
          scheduled_end_at: '2026-01-01T12:00:00Z',
          started_at: '2026-01-01T11:00:00Z',
        },
      },
      '2026-01-01T11:30:00Z'
    );
    expect(court.isTournament).toBe(false);
  });
});
