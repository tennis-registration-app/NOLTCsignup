import { describe, it, expect } from 'vitest';
import {
  DomainError,
  isDomainError,
  ErrorCodes,
  normalizeServiceError,
} from '@lib/errors';

describe('DomainError', () => {
  it('creates error with code, message, and optional details', () => {
    const err = new DomainError('DB_ERROR', 'Database failed', {
      safeDetails: { service: 'test' },
      cause: new Error('original'),
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('DomainError');
    expect(err.code).toBe('DB_ERROR');
    expect(err.message).toBe('Database failed');
    expect(err.safeDetails).toEqual({ service: 'test' });
    expect(err.cause).toBeInstanceOf(Error);
  });

  it('isDomainError returns true for DomainError', () => {
    const err = new DomainError('UNKNOWN', 'test');
    expect(isDomainError(err)).toBe(true);
  });

  it('isDomainError returns false for plain Error', () => {
    expect(isDomainError(new Error('test'))).toBe(false);
  });
});

describe('normalizeServiceError', () => {
  it('returns same instance for existing DomainError (idempotent)', () => {
    const original = new DomainError('DB_ERROR', 'test');
    const result = normalizeServiceError(original);
    expect(result).toBe(original); // Same reference
  });

  it('wraps plain Error with UNKNOWN code and preserves message', () => {
    const original = new Error('Something went wrong');
    const result = normalizeServiceError(original);

    expect(isDomainError(result)).toBe(true);
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('Something went wrong');
    expect(result.cause).toBe(original);
  });

  it('wraps string thrown as UNKNOWN with string as message', () => {
    const result = normalizeServiceError('raw string error');

    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('raw string error');
  });

  it('detects Supabase-like error as DB_ERROR', () => {
    const supabaseErr = {
      code: 'PGRST116',
      message: 'No rows found',
      details: null,
      hint: null,
    };
    const result = normalizeServiceError(supabaseErr);

    expect(result.code).toBe('DB_ERROR');
    expect(result.message).toBe('No rows found');
  });

  it('detects network fetch error as NETWORK', () => {
    const fetchErr = new TypeError('Failed to fetch');
    const result = normalizeServiceError(fetchErr);

    expect(result.code).toBe('NETWORK');
  });

  it('attaches context to safeDetails', () => {
    const result = normalizeServiceError(new Error('test'), {
      service: 'courtsService',
      op: 'refreshCourtData',
    });

    expect(result.safeDetails).toEqual({
      service: 'courtsService',
      operation: 'refreshCourtData',
    });
  });

  it('respects valid codeOverride', () => {
    const result = normalizeServiceError(new Error('transform failed'), {
      codeOverride: 'TRANSFORM_ERROR',
    });

    expect(result.code).toBe('TRANSFORM_ERROR');
  });

  it('ignores invalid codeOverride and falls back to detection', () => {
    const result = normalizeServiceError(new Error('test'), {
      codeOverride: 'INVALID_CODE',
    });

    expect(result.code).toBe('UNKNOWN'); // Detected, not invalid override
  });

  it('handles null/undefined error gracefully', () => {
    const result = normalizeServiceError(null);

    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('An unexpected error occurred');
  });
});
