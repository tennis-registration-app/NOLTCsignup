import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import ApiAdapter from '../../../src/lib/ApiAdapter.js';

/*
 * TennisCommands has both named and default export.
 * Using named export per pre-check findings.
 */
import { TennisCommands } from '../../../src/lib/backend/TennisCommands.js';

function createTestStack() {
  const adapter = new ApiAdapter({
    baseUrl: 'https://test.supabase.co/functions/v1',
    anonKey: 'test-anon-key',
  });
  // directory=null is safe for commands that don't do member resolution
  const commands = new TennisCommands(adapter, null);
  return { adapter, commands };
}

describe('TennisCommands', () => {
  let commands;

  beforeEach(() => {
    const stack = createTestStack();
    commands = stack.commands;
  });

  afterEach(() => {
    restoreFetch();
  });

  // ─── assignCourt (tight payload mapping) ──────────────
  // Input uses camelCase, wire.js maps to snake_case

  describe('assignCourt', () => {
    it('calls /assign-court endpoint via POST', async () => {
      const mockFn = stubFetch({ ok: true, data: { session_id: 1 } });

      await commands.assignCourt({
        courtId: 'court-uuid-5',
        groupType: 'singles',
        participants: [{ kind: 'member', memberId: 'member-1', accountId: 'account-1' }],
      });

      expect(mockFn).toHaveBeenCalledOnce();
      const [url, options] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/assign-court');
      expect(options.method).toBe('POST');
    });

    it('maps input to correct snake_case payload via wire.js', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.assignCourt({
        courtId: 'court-uuid-7',
        groupType: 'doubles',
        participants: [
          { kind: 'member', memberId: 'member-1', accountId: 'account-1' },
          { kind: 'member', memberId: 'member-2', accountId: 'account-2' },
        ],
        addBalls: true,
        splitBalls: false,
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      // Tight mapping: verify specific values from wire.js toAssignCourtPayload
      expect(body.court_id).toBe('court-uuid-7');
      expect(body.session_type).toBe('doubles'); // groupType → session_type
      expect(body.participants).toHaveLength(2);
      expect(body.participants[0].type).toBe('member');
      expect(body.participants[0].member_id).toBe('member-1');
      expect(body.participants[0].account_id).toBe('account-1');
      expect(body.add_balls).toBe(true);
      expect(body.split_balls).toBe(false);
    });

    it('includes device metadata from adapter', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.assignCourt({
        courtId: 'court-1',
        groupType: 'singles',
        participants: [],
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      // Adapter auto-adds device_id and device_type to POST body
      expect(body).toHaveProperty('device_id');
      expect(body).toHaveProperty('device_type');
    });

    it('returns raw envelope unchanged (passthrough)', async () => {
      const envelope = { ok: true, data: { session_id: 42 } };
      stubFetch(envelope);

      const result = await commands.assignCourt({
        courtId: 'court-1',
        groupType: 'singles',
        participants: [],
      });

      expect(result).toEqual(envelope);
    });

    it('returns failure envelope without throwing', async () => {
      const envelope = { ok: false, error: 'Court already assigned' };
      stubFetch(envelope);

      const result = await commands.assignCourt({
        courtId: 'court-1',
        groupType: 'singles',
        participants: [],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Court already assigned');
    });
  });

  // ─── endSession (field-existence checks) ──────────────
  // Uses courtId (not sessionId) per wire.js mapping

  describe('endSession', () => {
    it('calls /end-session endpoint via POST', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.endSession({
        courtId: 'court-uuid-99',
        reason: 'completed',
      });

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/end-session');
    });

    it('builds payload with court_id and end_reason', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.endSession({
        courtId: 'court-uuid-99',
        reason: 'completed',
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body).toHaveProperty('court_id');
      expect(body).toHaveProperty('end_reason');
    });

    it('returns raw envelope unchanged', async () => {
      const envelope = { ok: true, data: { ended: true } };
      stubFetch(envelope);

      const result = await commands.endSession({
        courtId: 'court-99',
        reason: 'completed',
      });

      expect(result).toEqual(envelope);
    });
  });

  // ─── joinWaitlist (field-existence checks) ────────────

  describe('joinWaitlist', () => {
    it('calls /join-waitlist endpoint via POST', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.joinWaitlist({
        groupType: 'singles',
        participants: [{ kind: 'member', memberId: 'member-2', accountId: 'account-2' }],
      });

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toBe('https://test.supabase.co/functions/v1/join-waitlist');
    });

    it('builds payload with group_type and participants', async () => {
      const mockFn = stubFetch({ ok: true, data: {} });

      await commands.joinWaitlist({
        groupType: 'doubles',
        participants: [
          { kind: 'member', memberId: 'member-2', accountId: 'account-2' },
          { kind: 'member', memberId: 'member-3', accountId: 'account-3' },
        ],
      });

      const body = JSON.parse(mockFn.mock.calls[0][1].body);
      expect(body).toHaveProperty('group_type');
      expect(body.group_type).toBe('doubles');
      expect(body).toHaveProperty('participants');
      expect(body.participants).toHaveLength(2);
    });

    it('returns raw envelope unchanged', async () => {
      const envelope = { ok: true, data: { waitlist_id: 7 } };
      stubFetch(envelope);

      const result = await commands.joinWaitlist({
        groupType: 'singles',
        participants: [],
      });

      expect(result).toEqual(envelope);
    });
  });

  // ─── Error propagation ────────────────────────────────

  describe('error propagation', () => {
    it('propagates network failure from adapter', async () => {
      stubFetchReject('Network down');

      await expect(
        commands.assignCourt({
          courtId: 'court-1',
          groupType: 'singles',
          participants: [],
        })
      ).rejects.toThrow(/Network down/);
    });

    it('propagates network failure for different commands', async () => {
      stubFetchReject('Connection refused');

      await expect(
        commands.endSession({ courtId: 'court-1', reason: 'test' })
      ).rejects.toThrow(/Connection refused/);
    });
  });
});
