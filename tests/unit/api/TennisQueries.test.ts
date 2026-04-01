import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import ApiAdapter from '../../../src/lib/ApiAdapter.js';
import { AppError } from '../../../src/lib/errors/AppError.js';

/*
 * Mock @supabase/supabase-js BEFORE importing TennisQueries.
 * The constructor calls createClient() which needs a valid URL/key
 * and creates a real WebSocket connection — not suitable for unit tests.
 * We replace it with a minimal stub that satisfies the constructor.
 */
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {},
  }),
}));

import { TennisQueries } from '../../../src/lib/backend/TennisQueries.js';

function createTestStack() {
  const adapter = new ApiAdapter({
    baseUrl: 'https://test.supabase.co/functions/v1',
    anonKey: 'test-anon-key',
  });
  const queries = new TennisQueries(adapter);
  return { adapter, queries };
}

/**
 * Minimal valid board API response.
 * Court shape matches E2E fixture: { number, status, session, block }
 */
function minimalBoardResponse() {
  return {
    ok: true,
    serverNow: '2025-01-23T10:00:00Z',
    courts: [
      { number: 1, status: 'available', session: null, block: null },
      { number: 2, status: 'available', session: null, block: null },
    ],
    waitlist: [],
    upcomingBlocks: [],
    operatingHours: { opensAt: '07:00', closesAt: '21:00' },
  };
}

describe('TennisQueries', () => {
  let queries: TennisQueries;

  beforeEach(() => {
    const stack = createTestStack();
    queries = stack.queries;
  });

  afterEach(() => {
    restoreFetch();
  });

  // ─── getBoard (normalization chain) ───────────────────

  describe('getBoard', () => {
    it('calls /get-board endpoint', async () => {
      const mockFn = stubFetch(minimalBoardResponse());

      await queries.getBoard();

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/get-board');
    });

    it('returns normalized board with expected shape', async () => {
      stubFetch(minimalBoardResponse());

      const board = await queries.getBoard();

      expect(board).toHaveProperty('serverNow');
      expect(board).toHaveProperty('courts');
      expect(board).toHaveProperty('waitlist');
      expect(board).toHaveProperty('operatingHours');
      expect(Array.isArray(board.courts)).toBe(true);
      expect(Array.isArray(board.waitlist)).toBe(true);
    });

    it('preserves court data through normalization', async () => {
      stubFetch(minimalBoardResponse());

      const board = await queries.getBoard();

      expect(board.courts.length).toBe(2);
      const court = board.courts.find((c) => c.number === 1);
      expect(court).toBeDefined();
      expect(court!.number).toBe(1);
    });

    it('attaches _raw reference to original response', async () => {
      stubFetch(minimalBoardResponse());

      const board = await queries.getBoard();

      expect(board._raw).toBeDefined();
      expect(board._raw).toMatchObject({ ok: true });
    });

    it('caches board in _lastBoard', async () => {
      stubFetch(minimalBoardResponse());

      expect(queries.getLastBoard()).toBeNull();

      await queries.getBoard();

      expect(queries.getLastBoard()).toBeDefined();
      expect(queries.getLastBoard()).toHaveProperty('courts');
    });

    it('throws Error on response.ok === false', async () => {
      // getBoard reads response.message for the error text
      stubFetch({ ok: false, message: 'Service unavailable' });

      await expect(queries.getBoard()).rejects.toThrow('Service unavailable');
    });

    it('throws with fallback message when response.message is empty', async () => {
      stubFetch({ ok: false });

      await expect(queries.getBoard()).rejects.toThrow('Failed to load board');
    });

    it('throws on network failure', async () => {
      stubFetchReject('Network down');

      await expect(queries.getBoard()).rejects.toThrow(/Network down/);
    });

    // ─── AppError taxonomy chain contract ──────────────────

    it('thrown error is instanceof AppError with category + code', async () => {
      stubFetch({ ok: false, code: 'COURT_NOT_FOUND', message: 'Court not found' });

      try {
        await queries.getBoard();
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('NOT_FOUND');
        expect(e.code).toBe('COURT_NOT_FOUND');
        expect(e.message).toBe('Court not found');
      }
    });

    it('maps known denial code to correct category', async () => {
      stubFetch({ ok: false, code: 'COURT_OCCUPIED', message: 'Court in use' });

      try {
        await queries.getBoard();
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.category).toBe('CONFLICT');
        expect(e.code).toBe('COURT_OCCUPIED');
      }
    });

    it('falls back to UNKNOWN category when no code in response', async () => {
      stubFetch({ ok: false, message: 'Something went wrong' });

      try {
        await queries.getBoard();
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.category).toBe('UNKNOWN');
        expect(e.code).toBe('QUERY_FAILED');
        expect(e.message).toBe('Something went wrong');
      }
    });

    it('falls back to QUERY_FAILED code and default message when response is bare', async () => {
      stubFetch({ ok: false });

      try {
        await queries.getBoard();
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.category).toBe('UNKNOWN');
        expect(e.code).toBe('QUERY_FAILED');
        expect(e.message).toBe('Failed to load board');
      }
    });

    it('handles empty courts array gracefully', async () => {
      const response = minimalBoardResponse();
      response.courts = [];
      stubFetch(response);

      const board = await queries.getBoard();

      expect(board.courts).toEqual([]);
    });
  });

  // ─── getFrequentPartners (passthrough contrast) ──────

  describe('getFrequentPartners', () => {
    it('calls /get-frequent-partners via POST with member_id', async () => {
      const mockFn = stubFetch({ ok: true, partners: [] });

      await queries.getFrequentPartners('M001');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url, options] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/get-frequent-partners');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.member_id).toBe('M001');
    });

    it('returns raw response unchanged (passthrough)', async () => {
      const envelope = { ok: true, partners: ['A', 'B'] };
      stubFetch(envelope);

      const result = await queries.getFrequentPartners('M001');

      expect(result).toEqual(envelope);
    });

    it('returns failure envelope without throwing', async () => {
      const envelope = { ok: false, error: 'Member not found' };
      stubFetch(envelope);

      const result = await queries.getFrequentPartners('INVALID');

      expect(result.ok).toBe(false);
      // .error is now the structured error object (overwrites the original string)
      expect(result.error).toEqual({
        category: 'UNKNOWN',
        code: 'API_ERROR',
        message: 'Member not found',
      });
    });
  });

  // ─── caching ─────────────────────────────────────────

  describe('caching', () => {
    it('getLastBoard returns null before any fetch', () => {
      expect(queries.getLastBoard()).toBeNull();
    });

    it('refresh populates lastBoard cache', async () => {
      stubFetch(minimalBoardResponse());

      await queries.refresh();

      const cached = queries.getLastBoard();
      expect(cached).not.toBeNull();
      expect(cached).toHaveProperty('courts');
    });
  });
});
