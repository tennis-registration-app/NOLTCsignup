import { describe, it, expect } from 'vitest';
import { success, failure, wrapAsync } from '../../../../src/registration/orchestration/helpers/resultNormalizer.js';

describe('resultNormalizer', () => {
  describe('success', () => {
    it('returns ok: true with null data by default', () => {
      const result = success();
      expect(result).toEqual({ ok: true, data: null });
    });

    it('returns ok: true with provided data', () => {
      const result = success({ courtNumber: 5 });
      expect(result).toEqual({ ok: true, data: { courtNumber: 5 } });
    });
  });

  describe('failure', () => {
    it('returns ok: false with error code and message', () => {
      const result = failure('VALIDATION_ERROR', 'Invalid court');
      expect(result).toEqual({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid court' },
      });
    });

    it('includes details when provided', () => {
      const result = failure('API_ERROR', 'Request failed', { status: 500 });
      expect(result).toEqual({
        ok: false,
        error: { code: 'API_ERROR', message: 'Request failed', details: { status: 500 } },
      });
    });
  });

  describe('wrapAsync', () => {
    it('returns success when function resolves', async () => {
      const result = await wrapAsync(async () => 'data');
      expect(result).toEqual({ ok: true, data: 'data' });
    });

    it('returns failure when function throws', async () => {
      const result = await wrapAsync(async () => {
        throw new Error('Something went wrong');
      });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('UNEXPECTED_ERROR');
      expect(result.error.message).toBe('Something went wrong');
    });
  });
});
