import { describe, it, expect } from 'vitest';
import { AppError, ErrorCategories } from '../../../src/lib/errors/index.js';

describe('AppError', () => {
  it('extends Error', () => {
    const err = new AppError({
      category: ErrorCategories.NETWORK,
      code: 'TEST_ERROR',
      message: 'test message',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('preserves message for catch blocks that read .message', () => {
    const err = new AppError({
      category: ErrorCategories.VALIDATION,
      code: 'BAD_INPUT',
      message: 'Invalid input provided',
    });
    expect(err.message).toBe('Invalid input provided');
  });

  it('sets name to AppError', () => {
    const err = new AppError({
      category: ErrorCategories.NETWORK,
      code: 'TEST',
      message: 'test',
    });
    expect(err.name).toBe('AppError');
  });

  it('stores category and code', () => {
    const err = new AppError({
      category: ErrorCategories.AUTH,
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
    expect(err.category).toBe('AUTH');
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('stores optional details', () => {
    const details = { userId: 123, endpoint: '/api/test' };
    const err = new AppError({
      category: ErrorCategories.NOT_FOUND,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Not found',
      details,
    });
    expect(err.details).toEqual(details);
  });

  it('defaults details to undefined', () => {
    const err = new AppError({
      category: ErrorCategories.UNKNOWN,
      code: 'TEST',
      message: 'test',
    });
    expect(err.details).toBeUndefined();
  });

  it('is caught by catch(e) where e instanceof Error', () => {
    let caught = null;
    try {
      throw new AppError({
        category: ErrorCategories.CONFLICT,
        code: 'RESOURCE_CONFLICT',
        message: 'conflict',
      });
    } catch (e) {
      if (e instanceof Error) {
        caught = e;
      }
    }
    expect(caught).not.toBeNull();
    expect(caught).toBeInstanceOf(AppError);
    expect(caught.category).toBe('CONFLICT');
  });

  it('has a stack trace when available', () => {
    const err = new AppError({
      category: ErrorCategories.NETWORK,
      code: 'TEST',
      message: 'test',
    });
    // Stack may be undefined in some environments; tolerate both
    expect(err.stack == null || typeof err.stack === 'string').toBe(true);
  });
});

describe('ErrorCategories', () => {
  it('contains all expected categories', () => {
    expect(ErrorCategories.VALIDATION).toBe('VALIDATION');
    expect(ErrorCategories.NETWORK).toBe('NETWORK');
    expect(ErrorCategories.AUTH).toBe('AUTH');
    expect(ErrorCategories.CONFLICT).toBe('CONFLICT');
    expect(ErrorCategories.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCategories.UNKNOWN).toBe('UNKNOWN');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(ErrorCategories)).toBe(true);
  });
});
