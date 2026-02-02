import { describe, it, expect } from 'vitest';
import {
  success,
  failure,
  wrapAsync,
} from '../../../src/registration/orchestration/helpers/resultNormalizer.js';

describe('resultNormalizer shape conformance', () => {
  describe('success()', () => {
    it('produces { ok: true, data } shape', () => {
      const result = success({ courts: [1, 2, 3] });
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ courts: [1, 2, 3] });
    });

    it('defaults data to null', () => {
      const result = success();
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('failure()', () => {
    it('produces { ok: false, error: { code, message } } shape', () => {
      const result = failure('COURT_NOT_FOUND', 'Court 5 not found');
      expect(result.ok).toBe(false);
      expect(result.error).toMatchObject({
        code: 'COURT_NOT_FOUND',
        message: 'Court 5 not found',
      });
    });

    it('details key exists (even if undefined)', () => {
      const result = failure('X', 'Y');
      expect('details' in result.error).toBe(true);
    });

    it('includes details when provided', () => {
      const result = failure('API_ERROR', 'Server error', { status: 500 });
      expect(result.error).toMatchObject({
        code: 'API_ERROR',
        message: 'Server error',
        details: { status: 500 },
      });
    });
  });

  describe('wrapAsync()', () => {
    it('wraps successful async function as success result', async () => {
      const result = await wrapAsync(async () => 'hello');
      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('wraps thrown error as failure result with UNEXPECTED_ERROR code', async () => {
      const result = await wrapAsync(async () => {
        throw new Error('boom');
      });
      expect(result.ok).toBe(false);
      expect(result.error).toMatchObject({
        code: 'UNEXPECTED_ERROR',
        message: 'boom',
      });
    });

    it('failure error shape has code, message, and details keys', async () => {
      const result = await wrapAsync(async () => {
        throw new Error('test error');
      });
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect('details' in result.error).toBe(true);
    });
  });
});
