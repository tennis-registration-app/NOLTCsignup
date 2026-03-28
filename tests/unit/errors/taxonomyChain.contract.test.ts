/**
 * Taxonomy Chain Contract Test
 *
 * Proves the end-to-end error taxonomy chain:
 *   DenialCode → mapResponseToCategory → AppError → normalizeError
 *
 * This test prevents regression by verifying:
 * 1. Every DenialCode maps to a valid ErrorCategory
 * 2. AppError preserves category/code through normalizeError
 * 3. The full chain from denial code to normalized metadata is lossless
 * 4. The public API surface of each module is stable
 */

import { describe, it, expect } from 'vitest';
import { AppError } from '../../../src/lib/errors/AppError.js';
import { ErrorCategories } from '../../../src/lib/errors/errorCategories.js';
import { mapResponseToCategory } from '../../../src/lib/errors/mapResponseToCategory.js';
import { normalizeError } from '../../../src/lib/errors/normalizeError.js';
import { DenialCodes } from '../../../src/lib/backend/types.js';

// ============================================================
// A) Public API surface stability
// ============================================================

describe('error module public API', () => {
  it('ErrorCategories has exactly 6 categories', () => {
    const keys = Object.keys(ErrorCategories);
    expect(keys).toHaveLength(6);
    expect(keys.sort()).toEqual(
      ['AUTH', 'CONFLICT', 'NETWORK', 'NOT_FOUND', 'UNKNOWN', 'VALIDATION'].sort()
    );
  });

  it('ErrorCategories is frozen', () => {
    expect(Object.isFrozen(ErrorCategories)).toBe(true);
  });

  it('DenialCodes has exactly 14 codes', () => {
    const keys = Object.keys(DenialCodes);
    expect(keys).toHaveLength(14);
  });

  it('DenialCodes values are self-referencing strings', () => {
    for (const [key, value] of Object.entries(DenialCodes)) {
      expect(key).toBe(value);
    }
  });

  it('AppError extends Error', () => {
    const err = new AppError({
      category: 'UNKNOWN',
      code: 'TEST',
      message: 'test',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('normalizeError returns the 5 expected fields', () => {
    const meta = normalizeError(new Error('test'));
    expect(Object.keys(meta).sort()).toEqual(
      ['category', 'code', 'details', 'isAppError', 'message'].sort()
    );
  });
});

// ============================================================
// B) Full chain: DenialCode → category → AppError → normalizeError
// ============================================================

describe('taxonomy chain: DenialCode → AppError → normalizeError', () => {
  // For each DenialCode, simulate what TennisQueries does:
  //   1. mapResponseToCategory(code) → category
  //   2. throw new AppError({ category, code, message })
  //   3. normalizeError(err) → meta
  //   4. Verify meta preserves category and code

  const ALL_CODES = Object.values(DenialCodes);

  it.each(ALL_CODES)('%s → category preserved through full chain', (denialCode) => {
    // Step 1: Map code to category (as TennisQueries does)
    const category = mapResponseToCategory(denialCode);

    // Verify category is a valid ErrorCategory
    expect(Object.values(ErrorCategories)).toContain(category);

    // Step 2: Create AppError (as TennisQueries/Commands do)
    const err = new AppError({
      category,
      code: denialCode,
      message: `Simulated error for ${denialCode}`,
    });

    // Step 3: Normalize (as orchestrators do in catch blocks)
    const meta = normalizeError(err);

    // Step 4: Verify chain is lossless
    expect(meta.category).toBe(category);
    expect(meta.code).toBe(denialCode);
    expect(meta.message).toBe(`Simulated error for ${denialCode}`);
    expect(meta.isAppError).toBe(true);
  });
});

// ============================================================
// C) Category distribution — snapshot of the current mapping
// ============================================================

describe('category distribution snapshot', () => {
  it('CONFLICT has 5 codes', () => {
    const conflictCodes = Object.values(DenialCodes).filter(
      (c) => mapResponseToCategory(c) === 'CONFLICT'
    );
    expect(conflictCodes).toHaveLength(5);
    expect(conflictCodes.sort()).toEqual([
      'COURT_BLOCKED',
      'COURT_OCCUPIED',
      'MEMBER_ALREADY_PLAYING',
      'MEMBER_ON_WAITLIST',
      'SESSION_ALREADY_ENDED',
    ]);
  });

  it('VALIDATION has 4 codes', () => {
    const validationCodes = Object.values(DenialCodes).filter(
      (c) => mapResponseToCategory(c) === 'VALIDATION'
    );
    expect(validationCodes).toHaveLength(4);
    expect(validationCodes.sort()).toEqual([
      'INVALID_MEMBER',
      'INVALID_REQUEST',
      'OUTSIDE_GEOFENCE',
      'OUTSIDE_OPERATING_HOURS',
    ]);
  });

  it('NOT_FOUND has 3 codes', () => {
    const notFoundCodes = Object.values(DenialCodes).filter(
      (c) => mapResponseToCategory(c) === 'NOT_FOUND'
    );
    expect(notFoundCodes).toHaveLength(3);
    expect(notFoundCodes.sort()).toEqual([
      'COURT_NOT_FOUND',
      'SESSION_NOT_FOUND',
      'WAITLIST_ENTRY_NOT_FOUND',
    ]);
  });

  it('UNKNOWN has 2 codes', () => {
    const unknownCodes = Object.values(DenialCodes).filter(
      (c) => mapResponseToCategory(c) === 'UNKNOWN'
    );
    expect(unknownCodes).toHaveLength(2);
    expect(unknownCodes.sort()).toEqual(['INTERNAL_ERROR', 'QUERY_ERROR']);
  });

  it('5 + 4 + 3 + 2 = 14 (all codes accounted for)', () => {
    expect(5 + 4 + 3 + 2).toBe(Object.keys(DenialCodes).length);
  });
});

// ============================================================
// D) normalizeError preserves non-AppError inputs
// ============================================================

describe('normalizeError graceful degradation', () => {
  it('plain Error → UNKNOWN category, code null', () => {
    const meta = normalizeError(new Error('boom'));
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.code).toBeNull();
    expect(meta.isAppError).toBe(false);
    expect(meta.message).toBe('boom');
  });

  it('string → UNKNOWN category, code null', () => {
    const meta = normalizeError('network timeout');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.code).toBeNull();
    expect(meta.isAppError).toBe(false);
  });

  it('AppError category survives round-trip through normalizeError', () => {
    for (const cat of Object.values(ErrorCategories)) {
      const err = new AppError({ category: cat, code: 'TEST', message: 'test' });
      const meta = normalizeError(err);
      expect(meta.category).toBe(cat);
    }
  });
});
