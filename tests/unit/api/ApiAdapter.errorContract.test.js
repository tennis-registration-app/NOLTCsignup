import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import ApiAdapter from '../../../src/lib/ApiAdapter.js';

/**
 * Characterization tests: lock de facto error contract of public get/post methods.
 *
 * These tests document existing behavior BEFORE any modifications.
 * If a test fails after changes, it means the public contract shifted.
 */

function createTestAdapter() {
  return new ApiAdapter({
    baseUrl: 'https://test.supabase.co/functions/v1',
    anonKey: 'test-anon-key',
  });
}

/** Stub fetch to return a response whose .json() throws (simulates HTML/garbage body) */
function stubFetchJsonFailure(message = 'Unexpected token < in JSON') {
  const mockFn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError(message); },
    text: async () => '<html>502 Bad Gateway</html>',
  });
  globalThis.fetch = mockFn;
  return mockFn;
}

describe('ApiAdapter public error contract (characterization)', () => {
  let adapter;

  beforeEach(() => {
    adapter = createTestAdapter();
  });

  afterEach(() => {
    restoreFetch();
  });

  // ─── A) post() success ─────────────────────────────────

  describe('post() success', () => {
    it('returns object with ok: true and response data fields', async () => {
      stubFetch({ ok: true, data: { sessionId: 42 }, serverNow: '2025-01-01T00:00:00Z' });

      const result = await adapter.post('/assign-court', { courtId: 5 });

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ sessionId: 42 });
      expect(result.serverNow).toBe('2025-01-01T00:00:00Z');
    });
  });

  // ─── B) post() with server returning { ok: false } ────

  describe('post() server error (ok: false)', () => {
    it('returns the raw response without throwing', async () => {
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court is occupied' });

      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(false);
      expect(result.code).toBe('COURT_OCCUPIED');
      expect(result.message).toBe('Court is occupied');
    });

    it('calls logger.error (which calls console.error) on !ok', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court is occupied' });

      await adapter.post('/assign-court', {});

      // logger.error calls console.error with formatted message + data
      expect(consoleSpy).toHaveBeenCalled();
      const firstArg = consoleSpy.mock.calls[0][0];
      expect(firstArg).toContain('[ApiAdapter]');
      expect(firstArg).toContain('/assign-court');
      expect(firstArg).toContain('failed');

      consoleSpy.mockRestore();
    });
  });

  // ─── C) post() network failure ─────────────────────────

  describe('post() network failure', () => {
    it('throws the fetch error (no try/catch in post)', async () => {
      stubFetchReject('Failed to fetch');

      await expect(adapter.post('/assign-court', {})).rejects.toThrow('Failed to fetch');
    });

    it('the thrown error is a TypeError (from fetch)', async () => {
      stubFetchReject('Failed to fetch');

      try {
        await adapter.post('/assign-court', {});
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });
  });

  // ─── D) post() JSON parse failure ──────────────────────

  describe('post() JSON parse failure', () => {
    it('throws the SyntaxError from response.json()', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      await expect(adapter.post('/assign-court', {})).rejects.toThrow(SyntaxError);
    });

    it('error message comes from the JSON parse failure', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      try {
        await adapter.post('/assign-court', {});
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('Unexpected token < in JSON');
      }
    });
  });

  // ─── E) get() success ──────────────────────────────────

  describe('get() success', () => {
    it('returns raw data with ok: true and response fields', async () => {
      stubFetch({ ok: true, data: { courts: [1, 2, 3] }, serverNow: '2025-01-01' });

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ courts: [1, 2, 3] });
      expect(result.serverNow).toBe('2025-01-01');
    });
  });

  // ─── F) get() server error (ok: false) ─────────────────

  describe('get() server error (ok: false)', () => {
    it('returns raw data with ok: false without throwing', async () => {
      stubFetch({ ok: false, code: 'NOT_FOUND', message: 'Resource not found' });

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });

    it('does NOT call console.error on !ok (unlike post)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: false, code: 'NOT_FOUND', message: 'Resource not found' });

      await adapter.get('/get-board');

      // get() has no logger.error call on !ok — only post() does
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ─── G) get() network failure ──────────────────────────

  describe('get() network failure', () => {
    it('throws the fetch error (no try/catch in get)', async () => {
      stubFetchReject('Network down');

      await expect(adapter.get('/get-board')).rejects.toThrow('Network down');
    });

    it('the thrown error is a TypeError (from fetch)', async () => {
      stubFetchReject('Network down');

      try {
        await adapter.get('/get-board');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });
  });

  // ─── H) get() JSON parse failure ───────────────────────

  describe('get() JSON parse failure', () => {
    it('throws the SyntaxError from response.json()', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      await expect(adapter.get('/get-board')).rejects.toThrow(SyntaxError);
    });

    it('error message comes from the JSON parse failure', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      try {
        await adapter.get('/get-board');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('Unexpected token < in JSON');
      }
    });
  });

  // ─── I) Console logging behavior summary ───────────────

  describe('console logging behavior', () => {
    it('post() on success: no console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: true, data: {} });

      await adapter.post('/test', {});

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('post() on !ok: console.error with [ApiAdapter] tag and response data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorResponse = { ok: false, code: 'ERR', message: 'fail' };
      stubFetch(errorResponse);

      await adapter.post('/test', {});

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      // logger.error('ApiAdapter', `POST /test failed`, data) →
      // console.error('[ApiAdapter] POST /test failed', data)
      expect(consoleSpy.mock.calls[0][0]).toContain('[ApiAdapter]');
      // Second arg is the response data object
      expect(consoleSpy.mock.calls[0][1]).toMatchObject({ ok: false, code: 'ERR' });

      consoleSpy.mockRestore();
    });

    it('get() on !ok: no console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: false, code: 'ERR', message: 'fail' });

      await adapter.get('/test');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
