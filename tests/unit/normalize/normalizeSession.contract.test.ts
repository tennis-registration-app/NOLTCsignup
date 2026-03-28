/**
 * normalizeSession Contract Test
 *
 * Proves the normalizer↔schema contract:
 *   raw snake_case API response → normalizeSession() → SessionSchema validates
 *
 * This test prevents regression by verifying:
 * 1. normalizeSession produces output that satisfies SessionSchema
 * 2. The hotspot field scheduledEndAt is present in camelCase
 * 3. No snake_case keys leak into the normalized output
 * 4. Multiple wire-format variations are handled correctly
 */

import { describe, it, expect } from 'vitest';
import { normalizeSession } from '../../../src/lib/normalize/normalizeSession.js';
import { SessionSchema } from '../../../src/lib/schemas/domain.js';

// ============================================================
// Fixtures — realistic raw API shapes from get_court_board RPC
// ============================================================

/** Snake_case session as returned by the Supabase RPC */
function rawSnakeCaseSession() {
  return {
    id: 'sess-001',
    court_number: 3,
    group: {
      id: 'grp-001',
      players: [
        { member_id: 'm-1', display_name: 'Anna Sinner', is_guest: false },
        { member_id: 'm-2', display_name: 'Carlos Alcaraz', is_guest: false },
      ],
      group_type: 'singles',
    },
    started_at: '2025-06-15T09:00:00.000Z',
    scheduled_end_at: '2025-06-15T10:00:00.000Z',
    actual_end_at: null,
    end_reason: null,
    is_tournament: false,
  };
}

const SERVER_NOW = '2025-06-15T09:30:00.000Z';

// ============================================================
// A) Schema contract — normalizeSession output satisfies SessionSchema
// ============================================================

describe('normalizeSession schema contract', () => {
  it('normalized snake_case session satisfies SessionSchema', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, SERVER_NOW);

    const result = SessionSchema.safeParse(normalized);
    expect(result.success).toBe(true);
  });

  it('normalized output has all required SessionSchema keys', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized).toHaveProperty('id');
    expect(normalized).toHaveProperty('courtNumber');
    expect(normalized).toHaveProperty('group');
    expect(normalized).toHaveProperty('startedAt');
    expect(normalized).toHaveProperty('scheduledEndAt');
    expect(normalized).toHaveProperty('actualEndAt');
    expect(normalized).toHaveProperty('endReason');
    expect(normalized).toHaveProperty('isOvertime');
  });
});

// ============================================================
// B) Hotspot — scheduledEndAt camelCase contract
// ============================================================

describe('normalizeSession scheduledEndAt hotspot', () => {
  it('converts scheduled_end_at to scheduledEndAt', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized.scheduledEndAt).toBe('2025-06-15T10:00:00.000Z');
  });

  it('scheduled_end_at is absent from normalized output', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized).not.toHaveProperty('scheduled_end_at');
  });

  it('other snake_case keys are absent from normalized output', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, SERVER_NOW);

    const snakeCaseKeys = Object.keys(normalized).filter((k) => k.includes('_'));
    expect(snakeCaseKeys).toEqual([]);
  });
});

// ============================================================
// C) Wire-format variations — all accepted input spellings
// ============================================================

describe('normalizeSession wire-format variations', () => {
  it('accepts endTime as fallback for scheduled_end_at', () => {
    const raw = {
      ...rawSnakeCaseSession(),
      scheduled_end_at: undefined,
      endTime: '2025-06-15T10:00:00.000Z',
    };
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized.scheduledEndAt).toBe('2025-06-15T10:00:00.000Z');
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });

  it('accepts camelCase scheduledEndAt directly', () => {
    const raw = {
      ...rawSnakeCaseSession(),
      scheduled_end_at: undefined,
      scheduledEndAt: '2025-06-15T10:00:00.000Z',
    };
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized.scheduledEndAt).toBe('2025-06-15T10:00:00.000Z');
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });

  it('accepts end_time as final fallback', () => {
    const raw = {
      ...rawSnakeCaseSession(),
      scheduled_end_at: undefined,
      end_time: '2025-06-15T10:00:00.000Z',
    };
    const normalized = normalizeSession(raw, SERVER_NOW);

    expect(normalized.scheduledEndAt).toBe('2025-06-15T10:00:00.000Z');
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });
});

// ============================================================
// D) Derived fields — isOvertime calculation
// ============================================================

describe('normalizeSession overtime contract', () => {
  it('isOvertime is false when serverNow is before scheduledEndAt', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, '2025-06-15T09:30:00.000Z');

    expect(normalized.isOvertime).toBe(false);
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });

  it('isOvertime is true when serverNow is after scheduledEndAt', () => {
    const raw = rawSnakeCaseSession();
    const normalized = normalizeSession(raw, '2025-06-15T10:30:00.000Z');

    expect(normalized.isOvertime).toBe(true);
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });

  it('isOvertime is false when session has actualEndAt (completed)', () => {
    const raw = {
      ...rawSnakeCaseSession(),
      actual_end_at: '2025-06-15T09:55:00.000Z',
      end_reason: 'completed',
    };
    const normalized = normalizeSession(raw, '2025-06-15T10:30:00.000Z');

    expect(normalized.isOvertime).toBe(false);
    expect(SessionSchema.safeParse(normalized).success).toBe(true);
  });
});
