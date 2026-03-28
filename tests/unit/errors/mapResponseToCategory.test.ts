import { describe, it, expect } from 'vitest';
import { mapResponseToCategory } from '../../../src/lib/errors/mapResponseToCategory.js';
import { DenialCodes } from '../../../src/lib/backend/types.js';

describe('mapResponseToCategory', () => {
  // ── CONFLICT: resource contention ────────────────────────

  it.each([
    [DenialCodes.COURT_OCCUPIED, 'CONFLICT'],
    [DenialCodes.COURT_BLOCKED, 'CONFLICT'],
    [DenialCodes.MEMBER_ALREADY_PLAYING, 'CONFLICT'],
    [DenialCodes.MEMBER_ON_WAITLIST, 'CONFLICT'],
    [DenialCodes.SESSION_ALREADY_ENDED, 'CONFLICT'],
  ])('%s → %s', (code, expected) => {
    expect(mapResponseToCategory(code)).toBe(expected);
  });

  // ── VALIDATION: business rules, bad input ────────────────

  it.each([
    [DenialCodes.OUTSIDE_OPERATING_HOURS, 'VALIDATION'],
    [DenialCodes.OUTSIDE_GEOFENCE, 'VALIDATION'],
    [DenialCodes.INVALID_MEMBER, 'VALIDATION'],
    [DenialCodes.INVALID_REQUEST, 'VALIDATION'],
  ])('%s → %s', (code, expected) => {
    expect(mapResponseToCategory(code)).toBe(expected);
  });

  // ── NOT_FOUND: resource doesn't exist ────────────────────

  it.each([
    [DenialCodes.COURT_NOT_FOUND, 'NOT_FOUND'],
    [DenialCodes.WAITLIST_ENTRY_NOT_FOUND, 'NOT_FOUND'],
    [DenialCodes.SESSION_NOT_FOUND, 'NOT_FOUND'],
  ])('%s → %s', (code, expected) => {
    expect(mapResponseToCategory(code)).toBe(expected);
  });

  // ── UNKNOWN: server errors ──────────────────────────────

  it.each([
    [DenialCodes.QUERY_ERROR, 'UNKNOWN'],
    [DenialCodes.INTERNAL_ERROR, 'UNKNOWN'],
  ])('%s → %s', (code, expected) => {
    expect(mapResponseToCategory(code)).toBe(expected);
  });

  // ── Edge cases ──────────────────────────────────────────

  it('unknown code → UNKNOWN', () => {
    expect(mapResponseToCategory('NEVER_SEEN_BEFORE')).toBe('UNKNOWN');
  });

  it('null → UNKNOWN', () => {
    expect(mapResponseToCategory(null)).toBe('UNKNOWN');
  });

  it('undefined → UNKNOWN', () => {
    expect(mapResponseToCategory(undefined)).toBe('UNKNOWN');
  });

  it('empty string → UNKNOWN', () => {
    expect(mapResponseToCategory('')).toBe('UNKNOWN');
  });

  // ── Exhaustiveness: all 14 DenialCodes are covered ──────

  it('covers every DenialCode', () => {
    const allCodes = Object.values(DenialCodes);
    expect(allCodes.length).toBe(14);

    for (const code of allCodes) {
      const result = mapResponseToCategory(code);
      expect(['CONFLICT', 'VALIDATION', 'NOT_FOUND', 'UNKNOWN']).toContain(result);
    }
  });
});
