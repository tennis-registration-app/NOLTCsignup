import { describe, it, expect } from 'vitest';
import { okResult, errResult } from '../../../src/lib/types/result.js';

describe('okResult', () => {
  it('creates a success result with data', () => {
    const result = okResult({ id: 1, name: 'test' });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ id: 1, name: 'test' });
  });

  it('works with null data', () => {
    const result = okResult(null);
    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });

  it('works with primitive data', () => {
    const result = okResult(42);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(42);
  });
});

describe('errResult', () => {
  it('creates an error result with code and message', () => {
    const result = errResult({
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Resource not found');
  });

  it('includes optional details', () => {
    const result = errResult({
      code: 'VALIDATION',
      message: 'Bad input',
      details: { field: 'email' },
    });
    expect(result.ok).toBe(false);
    expect(result.error.details).toEqual({ field: 'email' });
  });

  it('defaults details to undefined', () => {
    const result = errResult({
      code: 'UNKNOWN',
      message: 'Something failed',
    });
    expect(result.error.details).toBeUndefined();
  });
});
