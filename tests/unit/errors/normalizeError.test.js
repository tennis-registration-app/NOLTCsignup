import { describe, it, expect } from 'vitest';
import { normalizeError } from '../../../src/lib/errors/normalizeError.js';
import { AppError } from '../../../src/lib/errors/AppError.js';

describe('normalizeError', () => {
  // ── AppError input ──────────────────────────────────────

  it('AppError → preserves category, code, message, details', () => {
    const err = new AppError({
      category: 'VALIDATION',
      code: 'MISSING_MEMBER_NUMBER',
      message: 'Member has no member number',
      details: { field: 'memberNumber' },
    });

    const meta = normalizeError(err);

    expect(meta.message).toBe('Member has no member number');
    expect(meta.category).toBe('VALIDATION');
    expect(meta.code).toBe('MISSING_MEMBER_NUMBER');
    expect(meta.details).toEqual({ field: 'memberNumber' });
    expect(meta.isAppError).toBe(true);
  });

  it('AppError without details → details is undefined', () => {
    const err = new AppError({
      category: 'NOT_FOUND',
      code: 'MEMBER_NOT_FOUND',
      message: 'Could not find member',
    });

    const meta = normalizeError(err);

    expect(meta.category).toBe('NOT_FOUND');
    expect(meta.code).toBe('MEMBER_NOT_FOUND');
    expect(meta.details).toBeUndefined();
    expect(meta.isAppError).toBe(true);
  });

  // ── Plain Error input ───────────────────────────────────

  it('plain Error → message preserved, category UNKNOWN, isAppError false', () => {
    const err = new Error('Something broke');

    const meta = normalizeError(err);

    expect(meta.message).toBe('Something broke');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.code).toBeNull();
    expect(meta.details).toBeNull();
    expect(meta.isAppError).toBe(false);
  });

  it('Error with empty message → message is empty string', () => {
    const err = new Error('');

    const meta = normalizeError(err);

    expect(meta.message).toBe('');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.isAppError).toBe(false);
  });

  // ── Non-Error inputs ───────────────────────────────────

  it('string input → message is the string', () => {
    const meta = normalizeError('network timeout');

    expect(meta.message).toBe('network timeout');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.code).toBeNull();
    expect(meta.details).toBeNull();
    expect(meta.isAppError).toBe(false);
  });

  it('number input → message is String(number)', () => {
    const meta = normalizeError(42);

    expect(meta.message).toBe('42');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.isAppError).toBe(false);
  });

  it('null input → fallback message', () => {
    const meta = normalizeError(null);

    expect(meta.message).toBe('null');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.isAppError).toBe(false);
  });

  it('undefined input → String(undefined)', () => {
    const meta = normalizeError(undefined);

    expect(meta.message).toBe('undefined');
    expect(meta.category).toBe('UNKNOWN');
    expect(meta.isAppError).toBe(false);
  });

  // ── instanceof chain ───────────────────────────────────

  it('AppError is also instanceof Error → AppError branch wins', () => {
    const err = new AppError({
      category: 'CONFLICT',
      code: 'COURT_OCCUPIED',
      message: 'Court taken',
    });

    // Verify AppError extends Error
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);

    // normalizeError should use the AppError branch
    const meta = normalizeError(err);
    expect(meta.isAppError).toBe(true);
    expect(meta.category).toBe('CONFLICT');
  });
});
