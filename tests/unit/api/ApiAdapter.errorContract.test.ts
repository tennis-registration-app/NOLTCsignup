import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import ApiAdapter from '../../../src/lib/ApiAdapter.js';

/**
 * Error contract tests for ApiAdapter public get/post methods.
 *
 * Phase 1 (characterization): locked original behavior.
 * Phase 2 (current): verifies structured error metadata on failures.
 *
 * Backward compatibility assertions are preserved — old fields still present.
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

describe('ApiAdapter public error contract', () => {
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

    it('does not include .error on success', async () => {
      stubFetch({ ok: true, data: {} });

      const result = await adapter.post('/test', {});

      expect(result.error).toBeUndefined();
    });
  });

  // ─── B) post() with server returning { ok: false } ────

  describe('post() server error (ok: false)', () => {
    it('returns the raw response fields without throwing (backward compat)', async () => {
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court is occupied' });

      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(false);
      expect(result.code).toBe('COURT_OCCUPIED');
      expect(result.message).toBe('Court is occupied');
    });

    it('includes structured .error with category from mapResponseToCategory', async () => {
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court is occupied' });

      const result = await adapter.post('/assign-court', {});

      expect(result.error).toEqual({
        category: 'CONFLICT',
        code: 'COURT_OCCUPIED',
        message: 'Court is occupied',
      });
    });

    it('uses API_ERROR code and UNKNOWN category when server sends no code', async () => {
      stubFetch({ ok: false, message: 'Something went wrong' });

      const result = await adapter.post('/test', {});

      expect(result.error).toEqual({
        category: 'UNKNOWN',
        code: 'API_ERROR',
        message: 'Something went wrong',
      });
    });

    it('falls back to data.error string when no message field', async () => {
      stubFetch({ ok: false, error: 'Legacy error string' });

      const result = await adapter.post('/test', {});

      expect(result.error.message).toBe('Legacy error string');
    });

    it('falls back to "Request failed" when neither message nor error exists', async () => {
      stubFetch({ ok: false });

      const result = await adapter.post('/test', {});

      expect(result.error.message).toBe('Request failed');
    });

    it('calls logger.error (which calls console.error) on !ok', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court is occupied' });

      await adapter.post('/assign-court', {});

      expect(consoleSpy).toHaveBeenCalled();
      const firstArg = consoleSpy.mock.calls[0][0];
      expect(firstArg).toContain('[ApiAdapter]');
      expect(firstArg).toContain('/assign-court');
      expect(firstArg).toContain('failed');

      consoleSpy.mockRestore();
    });

    it('preserves extra server fields (serverNow, etc.)', async () => {
      stubFetch({ ok: false, code: 'ERR', message: 'fail', serverNow: '2025-01-01' });

      const result = await adapter.post('/test', {});

      expect(result.serverNow).toBe('2025-01-01');
    });
  });

  // ─── C) post() network failure ─────────────────────────

  describe('post() network failure', () => {
    it('returns {ok: false} instead of throwing (caught by try/catch)', async () => {
      stubFetchReject('Failed to fetch');

      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(false);
    });

    it('includes structured .error with NETWORK category', async () => {
      stubFetchReject('Failed to fetch');

      const result = await adapter.post('/assign-court', {});

      expect(result.error).toEqual({
        category: 'NETWORK',
        code: 'FETCH_FAILED',
        message: 'Failed to fetch',
      });
    });

    it('includes message at top level', async () => {
      stubFetchReject('Failed to fetch');

      const result = await adapter.post('/assign-court', {});

      expect(result.message).toBe('Failed to fetch');
    });
  });

  // ─── D) post() JSON parse failure ──────────────────────

  describe('post() JSON parse failure', () => {
    it('returns {ok: false} instead of throwing (caught by try/catch)', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(false);
    });

    it('includes structured .error with NETWORK category', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      const result = await adapter.post('/assign-court', {});

      expect(result.error).toEqual({
        category: 'NETWORK',
        code: 'FETCH_FAILED',
        message: 'Unexpected token < in JSON',
      });
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

    it('does not include .error on success', async () => {
      stubFetch({ ok: true, data: {} });

      const result = await adapter.get('/test');

      expect(result.error).toBeUndefined();
    });
  });

  // ─── F) get() server error (ok: false) ─────────────────

  describe('get() server error (ok: false)', () => {
    it('returns raw data with ok: false without throwing (backward compat)', async () => {
      stubFetch({ ok: false, code: 'NOT_FOUND', message: 'Resource not found' });

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });

    it('includes structured .error with category from mapResponseToCategory', async () => {
      stubFetch({ ok: false, code: 'COURT_NOT_FOUND', message: 'Court not found' });

      const result = await adapter.get('/get-board');

      expect(result.error).toEqual({
        category: 'NOT_FOUND',
        code: 'COURT_NOT_FOUND',
        message: 'Court not found',
      });
    });

    it('does NOT call console.error on !ok (unlike post)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      stubFetch({ ok: false, code: 'NOT_FOUND', message: 'Resource not found' });

      await adapter.get('/get-board');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ─── G) get() network failure ──────────────────────────

  describe('get() network failure', () => {
    it('returns {ok: false} instead of throwing (caught by try/catch)', async () => {
      stubFetchReject('Network down');

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(false);
    });

    it('includes structured .error with NETWORK category', async () => {
      stubFetchReject('Network down');

      const result = await adapter.get('/get-board');

      expect(result.error).toEqual({
        category: 'NETWORK',
        code: 'FETCH_FAILED',
        message: 'Network down',
      });
    });
  });

  // ─── H) get() JSON parse failure ───────────────────────

  describe('get() JSON parse failure', () => {
    it('returns {ok: false} instead of throwing (caught by try/catch)', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(false);
    });

    it('includes structured .error with NETWORK category', async () => {
      stubFetchJsonFailure('Unexpected token < in JSON');

      const result = await adapter.get('/get-board');

      expect(result.error).toEqual({
        category: 'NETWORK',
        code: 'FETCH_FAILED',
        message: 'Unexpected token < in JSON',
      });
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
      expect(consoleSpy.mock.calls[0][0]).toContain('[ApiAdapter]');

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
