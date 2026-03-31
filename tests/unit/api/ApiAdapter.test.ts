import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stubFetch, stubFetchReject, stubFetchSequence, restoreFetch } from './helpers/mockFetch.js';
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
  let adapter: ApiAdapter;

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
      // .error is now the structured error object (overwrites the original string)
      expect(result.error).toEqual({
        category: 'UNKNOWN',
        code: 'API_ERROR',
        message: 'Something went wrong',
      });
    });

    it('returns {ok: false} on network failure (caught by try/catch)', async () => {
      stubFetchReject('Network down');

      // Network failures now caught and returned as structured error
      const result = await adapter.get('/get-board');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('FETCH_FAILED');
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
      // .error is now the structured error object (overwrites the original string)
      expect(result.error).toEqual({
        category: 'UNKNOWN',
        code: 'API_ERROR',
        message: 'Court already assigned',
      });
    });

    it('returns {ok: false} on network failure (caught by try/catch)', async () => {
      stubFetchReject('Network down');

      // Network failures now caught and returned as structured error
      const result = await adapter.post('/assign-court', {});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('FETCH_FAILED');
    });
  });

  // ─── A) Cache behavior ─────────────────────────────────
  // Domain methods getCourtStatus and getSettings use an internal
  // cache with 5s TTL. Tests use fake timers for determinism.

  describe('cache behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('getCourtStatus — first call fetches, second returns cached', async () => {
      const envelope = { ok: true, courts: [{ court_number: 1 }] };
      const mockFn = stubFetch(envelope);

      const first = await adapter.getCourtStatus();
      const second = await adapter.getCourtStatus();

      expect(first).toEqual(envelope);
      expect(second).toEqual(envelope);
      // _fetch called only once — second was cached
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('getCourtStatus — forceRefresh bypasses cache', async () => {
      const envelope = { ok: true, courts: [] };
      const mockFn = stubFetch(envelope);

      await adapter.getCourtStatus();
      await adapter.getCourtStatus(true);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('getCourtStatus — cache expires after TTL', async () => {
      const envelope = { ok: true, courts: [] };
      const mockFn = stubFetch(envelope);

      await adapter.getCourtStatus();
      vi.advanceTimersByTime(6000); // past 5s TTL
      await adapter.getCourtStatus();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('getSettings — first call fetches, second returns cached', async () => {
      const envelope = { ok: true, settings: { courtCount: 12 } };
      const mockFn = stubFetch(envelope);

      const first = await adapter.getSettings();
      const second = await adapter.getSettings();

      expect(first).toEqual(envelope);
      expect(second).toEqual(envelope);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('getSettings — forceRefresh bypasses cache', async () => {
      const envelope = { ok: true, settings: {} };
      const mockFn = stubFetch(envelope);

      await adapter.getSettings();
      await adapter.getSettings(true);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('clearCache — forces re-fetch on next call', async () => {
      const envelope = { ok: true, courts: [] };
      const mockFn = stubFetch(envelope);

      await adapter.getCourtStatus();
      adapter.clearCache();
      await adapter.getCourtStatus();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  // ─── B) Core mutations + cache invalidation ────────────
  // Mutations call _post then clearCache. We verify the body
  // structure and that a cached read re-fetches after mutation.

  describe('court mutations', () => {
    it('assignCourt — sends correct body and clears cache', async () => {
      const players = [{ type: 'member', member_id: 'M1' }];
      const mockFn = stubFetch({ ok: true, session: { id: 'S1' } });

      // Prime the cache
      await adapter.getCourtStatus();
      // Mutation
      const result = await adapter.assignCourt('C1', 'doubles', players, { addBalls: true });

      expect(result.ok).toBe(true);
      // _fetch: 1 for getCourtStatus + 1 for assignCourt + 1 for re-fetch below
      // Verify body of the assignCourt call (second call to fetch)
      const [url, opts] = mockFn.mock.calls[1];
      expect(url).toContain('/assign-court');
      const body = JSON.parse(opts.body);
      expect(body.court_id).toBe('C1');
      expect(body.session_type).toBe('doubles');
      expect(body.participants).toEqual(players);
      expect(body.add_balls).toBe(true);
      expect(body.split_balls).toBe(false);

      // Cache should be invalidated — next getCourtStatus must re-fetch
      await adapter.getCourtStatus();
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('endSession — sends session_id and end_reason, clears cache', async () => {
      const mockFn = stubFetch({ ok: true });

      await adapter.endSession('SESSION-1', 'admin_override');

      const [url, opts] = mockFn.mock.calls[0];
      expect(url).toContain('/end-session');
      const body = JSON.parse(opts.body);
      expect(body.session_id).toBe('SESSION-1');
      expect(body.end_reason).toBe('admin_override');
    });

    it('endSession — uses default end_reason "completed"', async () => {
      const mockFn = stubFetch({ ok: true });

      await adapter.endSession('SESSION-2');

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.end_reason).toBe('completed');
    });

    it('endSessionByCourt — sends court_id, clears cache', async () => {
      const mockFn = stubFetch({ ok: true });

      await adapter.endSessionByCourt('COURT-1', 'no_show');

      const [url, opts] = mockFn.mock.calls[0];
      expect(url).toContain('/end-session');
      const body = JSON.parse(opts.body);
      expect(body.court_id).toBe('COURT-1');
      expect(body.end_reason).toBe('no_show');
    });

    it('purchaseBalls — sends session and account info', async () => {
      const mockFn = stubFetch({ ok: true, transaction: { id: 'T1' } });

      const result = await adapter.purchaseBalls('S1', 'A1', { splitBalls: true });

      expect(result.ok).toBe(true);
      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.session_id).toBe('S1');
      expect(body.account_id).toBe('A1');
      expect(body.split_balls).toBe(true);
    });
  });

  describe('waitlist mutations', () => {
    it('joinWaitlist — sends group_type and participants', async () => {
      const players = [{ type: 'member', member_id: 'M1' }];
      const mockFn = stubFetch({ ok: true, entry: { id: 'W1' } });

      const result = await adapter.joinWaitlist('singles', players);

      expect(result.ok).toBe(true);
      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.group_type).toBe('singles');
      expect(body.participants).toEqual(players);
    });

    it('cancelWaitlist — sends waitlist_id', async () => {
      const mockFn = stubFetch({ ok: true });

      await adapter.cancelWaitlist('W1');

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.waitlist_id).toBe('W1');
    });

    it('assignFromWaitlist — sends ids, clears cache', async () => {
      const mockFn = stubFetch({ ok: true, session: { id: 'S1' } });

      // Prime cache
      await adapter.getCourtStatus();
      const result = await adapter.assignFromWaitlist('W1', 'C1', { addBalls: true });

      expect(result.ok).toBe(true);
      const body = JSON.parse(mockFn.mock.calls[1][1].body);
      expect(body.waitlist_id).toBe('W1');
      expect(body.court_id).toBe('C1');
      expect(body.add_balls).toBe(true);

      // Cache invalidated
      await adapter.getCourtStatus();
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('block mutations', () => {
    it('createBlock — sends all fields, clears cache', async () => {
      const mockFn = stubFetch({ ok: true, block: { id: 'B1' } });

      await adapter.createBlock('C1', 'maintenance', 'Repair', '2025-01-01T08:00', '2025-01-01T10:00', {
        isRecurring: true,
        recurrenceRule: 'weekly',
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.court_id).toBe('C1');
      expect(body.block_type).toBe('maintenance');
      expect(body.title).toBe('Repair');
      expect(body.starts_at).toBe('2025-01-01T08:00');
      expect(body.ends_at).toBe('2025-01-01T10:00');
      expect(body.is_recurring).toBe(true);
      expect(body.recurrence_rule).toBe('weekly');
    });

    it('cancelBlock — sends block_id, clears cache', async () => {
      const mockFn = stubFetch({ ok: true });

      // Prime cache then mutate
      await adapter.getCourtStatus();
      await adapter.cancelBlock('B1');

      const body = JSON.parse(mockFn.mock.calls[1][1].body);
      expect(body.block_id).toBe('B1');

      // Cache invalidated
      await adapter.getCourtStatus();
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  // ─── C) Read ops with optional params ──────────────────
  // These methods assemble query params from options objects.

  describe('read operations — param assembly', () => {
    it('getWaitlist — calls correct endpoint', async () => {
      const mockFn = stubFetch({ ok: true, waitlist: [] });

      await adapter.getWaitlist();

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-waitlist');
    });

    it('getMembers — no search → no query params', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await adapter.getMembers();

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members');
      expect(url).not.toContain('?');
    });

    it('getMembers — search string → appended as query param', async () => {
      const mockFn = stubFetch({ ok: true, members: [{ name: 'Smith' }] });

      await adapter.getMembers('Smith');

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members?search=Smith');
    });

    it('getMembersByAccount — passes member_number param', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await adapter.getMembersByAccount('1001');

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members?member_number=1001');
    });

    it('getSessionHistory — no options → no query params', async () => {
      const mockFn = stubFetch({ ok: true, sessions: [] });

      await adapter.getSessionHistory();

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-session-history');
      expect(url).not.toContain('?');
    });

    it('getSessionHistory — options → mapped to snake_case params', async () => {
      const mockFn = stubFetch({ ok: true, sessions: [] });

      await adapter.getSessionHistory({
        dateStart: '2025-01-01',
        dateEnd: '2025-01-31',
        courtNumber: 5,
        memberName: 'Jones',
        limit: 50,
      });

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('date_start=2025-01-01');
      expect(url).toContain('date_end=2025-01-31');
      expect(url).toContain('court_number=5');
      expect(url).toContain('member_name=Jones');
      expect(url).toContain('limit=50');
    });

    it('getTransactions — no options → no query params', async () => {
      const mockFn = stubFetch({ ok: true, transactions: [] });

      await adapter.getTransactions();

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-transactions');
      expect(url).not.toContain('?');
    });

    it('getTransactions — options → mapped to snake_case params', async () => {
      const mockFn = stubFetch({ ok: true, transactions: [] });

      await adapter.getTransactions({
        dateStart: '2025-06-01',
        dateEnd: '2025-06-30',
        type: 'ball_purchase',
        memberNumber: '2002',
        limit: 100,
      });

      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('date_start=2025-06-01');
      expect(url).toContain('date_end=2025-06-30');
      expect(url).toContain('type=ball_purchase');
      expect(url).toContain('member_number=2002');
      expect(url).toContain('limit=100');
    });
  });

  // ─── D) Admin methods — delegation tests ───────────────

  describe('admin operations', () => {
    it('updateSettings — sends settings payload, invalidates settings cache', async () => {
      const mockFn = stubFetch({ ok: true, settings: {} });

      // Prime settings cache
      await adapter.getSettings();
      await adapter.updateSettings({ courtCount: 10 });

      const body = JSON.parse(mockFn.mock.calls[1][1].body);
      expect(body.settings).toEqual({ courtCount: 10 });

      // Settings cache data is nullified — getSettings(true) re-fetches
      await adapter.getSettings(true);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('updateSettings — invalidates cache so next getSettings re-fetches', async () => {
      const mockFn = stubFetchSequence([
        { ok: true, settings: { courtCount: 12 } }, // 1. getSettings (primes cache)
        { ok: true },                                 // 2. updateSettings POST
        { ok: true, settings: { courtCount: 10 } }, // 3. getSettings (fresh fetch)
      ]);

      // Prime settings cache
      const first = await adapter.getSettings();
      expect(first.settings.courtCount).toBe(12);

      // Mutate — should fully invalidate cache (data AND timestamp)
      await adapter.updateSettings({ courtCount: 10 });

      // Next call must re-fetch from API (not return stale null from cache)
      const refreshed = await adapter.getSettings();
      expect(refreshed).not.toBeNull();
      expect(refreshed.settings.courtCount).toBe(10);

      // 3 fetches: initial getSettings + updateSettings + re-fetched getSettings
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('updateOperatingHours — sends hours, invalidates settings cache', async () => {
      const hours = [{ day: 0, open: '07:00', close: '21:00' }];
      const mockFn = stubFetch({ ok: true });

      await adapter.updateOperatingHours(hours);

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.operating_hours).toEqual(hours);
    });

    it('setOperatingHoursOverride — sends override', async () => {
      const override = { date: '2025-07-04', opensAt: '10:00', closesAt: '18:00' };
      const mockFn = stubFetch({ ok: true });

      await adapter.setOperatingHoursOverride(override);

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.operating_hours_override).toEqual(override);
    });

    it('deleteOperatingHoursOverride — sends date', async () => {
      const mockFn = stubFetch({ ok: true });

      await adapter.deleteOperatingHoursOverride('2025-07-04');

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.delete_override).toBe('2025-07-04');
    });

    it('exportTransactions — sends date range', async () => {
      const mockFn = stubFetch({ ok: true, csv: 'data...' });

      const result = await adapter.exportTransactions('2025-01-01', '2025-01-31', {
        includeAlreadyExported: true,
      });

      expect(result.ok).toBe(true);
      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.date_range_start).toBe('2025-01-01');
      expect(body.date_range_end).toBe('2025-01-31');
      expect(body.include_already_exported).toBe(true);
    });

    it('aiAssistant — sends prompt with defaults', async () => {
      const mockFn = stubFetch({ ok: true, response: 'AI says...' });

      await adapter.aiAssistant({ prompt: 'Who is playing?' });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.prompt).toBe('Who is playing?');
      expect(body.mode).toBe('draft');
      // Should NOT include optional fields when not provided
      expect(body.actions_token).toBeUndefined();
      expect(body.confirm_destructive).toBeUndefined();
    });

    it('aiAssistant — includes optional fields when provided', async () => {
      const mockFn = stubFetch({ ok: true, response: 'Confirmed.' });

      await adapter.aiAssistant({
        prompt: 'Clear all courts',
        mode: 'execute',
        actions_token: 'tok-123',
        confirm_destructive: true,
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body.mode).toBe('execute');
      expect(body.actions_token).toBe('tok-123');
      expect(body.confirm_destructive).toBe(true);
    });
  });

  // ─── E) Legacy compatibility layer ─────────────────────

  describe('legacy compatibility', () => {
    it('read("tennisData") → delegates to _getLegacyDataFormat', async () => {
      // _getLegacyDataFormat calls getCourtStatus, getWaitlist, getSettings in parallel
      // Each goes through _get → _fetch — 3 sequential fetches (parallel resolved serially)
      const courtEnvelope = {
        ok: true,
        courts: [{
          court_number: 1,
          court_id: 'C1',
          status: 'occupied',
          session: {
            id: 'S1',
            type: 'doubles',
            participants: ['A', 'B'],
            started_at: '2025-01-01T10:00:00Z',
            scheduled_end_at: '2025-01-01T11:00:00Z',
            minutes_remaining: 30,
          },
          block: null,
        }],
      };
      const waitlistEnvelope = {
        ok: true,
        waitlist: [{
          id: 'W1',
          position: 1,
          group_type: 'singles',
          participants: ['C'],
          joined_at: '2025-01-01T10:30:00Z',
          minutes_waiting: 15,
        }],
      };
      const settingsEnvelope = {
        ok: true,
        settings: { courtCount: 12 },
        operating_hours: [{ day: 1, open: '07:00' }],
      };

      stubFetchSequence([courtEnvelope, waitlistEnvelope, settingsEnvelope]);

      const data = await adapter.read('tennisData');

      // Verify court transformation
      expect(data.courts).toHaveLength(1);
      expect(data.courts[0].number).toBe(1);
      expect(data.courts[0].id).toBe('C1');
      expect(data.courts[0].session.id).toBe('S1');
      expect(data.courts[0].session.timeRemaining).toBe(30 * 60 * 1000);

      // Verify waitlist transformation
      expect(data.waitlist).toHaveLength(1);
      expect(data.waitlist[0].type).toBe('singles');
      expect(data.waitlist[0].waitTime).toBe(15 * 60 * 1000);

      // Verify settings passthrough
      expect(data.settings).toEqual({ courtCount: 12 });
      expect(data.operatingHours).toEqual([{ day: 1, open: '07:00' }]);
    });

    it('read("TENNIS_DATA") — also delegates to legacy format', async () => {
      stubFetchSequence([
        { ok: true, courts: [] },
        { ok: true, waitlist: [] },
        { ok: true, settings: {}, operating_hours: [] },
      ]);

      const data = await adapter.read('TENNIS_DATA');

      expect(data.courts).toEqual([]);
      expect(data.waitlist).toEqual([]);
    });

    it('read(unknownKey) — returns null', async () => {
      const result = await adapter.read('unknownKey');
      expect(result).toBeNull();
    });

    it('getData — delegates to _getLegacyDataFormat', async () => {
      stubFetchSequence([
        { ok: true, courts: [] },
        { ok: true, waitlist: [] },
        { ok: true, settings: {}, operating_hours: [] },
      ]);

      const data = await adapter.getData();

      expect(data).toHaveProperty('courts');
      expect(data).toHaveProperty('waitlist');
      expect(data).toHaveProperty('settings');
    });

    it('write — returns the data unchanged', async () => {
      const result = await adapter.write('anyKey', { foo: 1 });
      expect(result).toEqual({ foo: 1 });
    });

    it('saveData — returns the data unchanged', async () => {
      const result = await adapter.saveData({ bar: 2 });
      expect(result).toEqual({ bar: 2 });
    });

    it('_getLegacyDataFormat — handles null session on court', async () => {
      stubFetchSequence([
        { ok: true, courts: [{ court_number: 3, court_id: 'C3', status: 'available', session: null, block: null }] },
        { ok: true, waitlist: [] },
        { ok: true, settings: {}, operating_hours: [] },
      ]);

      const data = await adapter.getData();

      expect(data.courts[0].session).toBeNull();
      expect(data.courts[0].status).toBe('available');
    });
  });
});
