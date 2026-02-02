import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import { AppError } from '../../../src/lib/errors/index.js';

/*
 * IMPORT NOTE: ApiAdapter has both named and default export.
 * Using default export.
 */
import ApiAdapter from '../../../src/lib/ApiAdapter.js';

/*
 * CONSTRUCTOR NOTE: Constructor takes options with fallbacks to API_CONFIG.
 * We pass baseUrl and anonKey to override config.
 */
function createTestAdapter() {
  return new ApiAdapter({
    baseUrl: 'https://test.supabase.co/functions/v1',
    anonKey: 'test-anon-key',
  });
}

describe('ApiAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = createTestAdapter();
  });

  afterEach(() => {
    restoreFetch();
  });

  // ─── _fetch (regular method, not private) ─────────────
  // These test the AppError contract from HR8.

  describe('_fetch — AppError contract (HR8 integration)', () => {
    it('returns parsed envelope on success', async () => {
      const envelope = { ok: true, data: { courts: [1, 2, 3] } };
      stubFetch(envelope);

      const result = await adapter._fetch('/get-board');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ courts: [1, 2, 3] });
    });

    it('throws AppError(NETWORK/API_ERROR) when envelope ok is false', async () => {
      stubFetch({ ok: false, error: 'Court not found' });

      try {
        await adapter._fetch('/get-board');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('NETWORK');
        expect(e.code).toBe('API_ERROR');
        expect(e.message).toBe('Court not found');
      }
    });

    it('uses fallback message when envelope error is empty', async () => {
      stubFetch({ ok: false });

      try {
        await adapter._fetch('/test');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.message).toBe('API request failed');
      }
    });

    it('throws AppError(NETWORK/FETCH_FAILED) on network failure', async () => {
      stubFetchReject('Failed to fetch');

      try {
        await adapter._fetch('/get-board');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.category).toBe('NETWORK');
        expect(e.code).toBe('FETCH_FAILED');
        expect(e.message).toBe('Failed to fetch');
      }
    });

    it('does not double-wrap AppError (passthrough)', async () => {
      const original = new AppError({
        category: 'AUTH',
        code: 'UNAUTHORIZED',
        message: 'Token expired',
      });

      const { vi } = await import('vitest');
      globalThis.fetch = vi.fn().mockRejectedValue(original);

      try {
        await adapter._fetch('/protected');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBe(original); // Same reference
        expect(e.category).toBe('AUTH');
        expect(e.code).toBe('UNAUTHORIZED');
      }
    });

    it('constructs correct URL and headers', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await adapter._fetch('/get-board');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url, options] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/get-board');
      expect(options.headers.Authorization).toBe('Bearer test-anon-key');
      expect(options.headers['Content-Type']).toBe('application/json');
    });
  });

  // ─── get() — public, used by TennisBackend queries ────
  // CRITICAL: get() does NOT throw on !data.ok — it returns
  // the raw envelope. This is the production contract.

  describe('get — returns envelope without throwing', () => {
    it('returns success envelope as-is', async () => {
      const envelope = { ok: true, data: { courts: [1, 2] } };
      stubFetch(envelope);

      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ courts: [1, 2] });
    });

    it('returns failure envelope without throwing', async () => {
      const envelope = { ok: false, error: 'Something went wrong' };
      stubFetch(envelope);

      // This MUST NOT throw — that's the contract
      const result = await adapter.get('/get-board');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('throws on network failure (fetch rejects)', async () => {
      stubFetchReject('Network down');

      // Network failures should still throw (fetch itself rejects)
      await expect(adapter.get('/get-board')).rejects.toThrow();
    });

    it('constructs correct URL and headers', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await adapter.get('/get-board');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url, options] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/get-board');
      expect(options.method).toBe('GET');
      expect(options.headers.Authorization).toBe('Bearer test-anon-key');
    });
  });

  // ─── post() — public, used by TennisBackend commands ──
  // CRITICAL: post() does NOT throw on !data.ok — it returns
  // the raw envelope. Same contract as get().

  describe('post — sends body and returns envelope without throwing', () => {
    it('sends JSON body with correct method', async () => {
      const mockFn = stubFetch({ ok: true, data: { id: 1 } });

      await adapter.post('/assign-court', { courtId: 5, players: ['A'] });

      expect(mockFn).toHaveBeenCalledOnce();
      const [, options] = mockFn.mock.calls[0];
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.courtId).toBe(5);
    });

    it('adds device_id and device_type to body', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await adapter.post('/assign-court', { courtId: 5 });

      const [, options] = mockFn.mock.calls[0];
      const body = JSON.parse(options.body);
      // getDeviceContext() adds device_id and device_type
      expect('device_id' in body).toBe(true);
      expect('device_type' in body).toBe(true);
    });

    it('returns success envelope as-is', async () => {
      const envelope = { ok: true, data: { sessionId: 42 } };
      stubFetch(envelope);

      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ sessionId: 42 });
    });

    it('returns failure envelope without throwing', async () => {
      const envelope = { ok: false, error: 'Court already assigned' };
      stubFetch(envelope);

      // This MUST NOT throw — that's the contract
      const result = await adapter.post('/assign-court', {});

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Court already assigned');
    });

    it('throws on network failure (fetch rejects)', async () => {
      stubFetchReject('Network down');

      await expect(adapter.post('/assign-court', {})).rejects.toThrow();
    });
  });
});
