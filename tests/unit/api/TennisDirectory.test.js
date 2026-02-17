import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stubFetch, stubFetchReject, restoreFetch } from './helpers/mockFetch.js';
import ApiAdapter from '../../../src/lib/ApiAdapter.js';
import { TennisDirectory } from '../../../src/lib/backend/TennisDirectory.js';

function createTestStack() {
  const adapter = new ApiAdapter({
    baseUrl: 'https://test.supabase.co/functions/v1',
    anonKey: 'test-anon-key',
  });
  const directory = new TennisDirectory(adapter);
  return { adapter, directory };
}

/**
 * Minimal member response matching API shape (snake_case).
 */
function minimalMemberResponse(overrides = {}) {
  return {
    id: 'member-uuid-1',
    account_id: 'account-uuid-1',
    member_number: 'M001',
    display_name: 'Test Member',
    is_primary: true,
    uncleared_streak: 0,
    ...overrides,
  };
}

/**
 * Helper to extract query param from URL.
 */
function getParam(url, name) {
  const match = url.match(new RegExp(`[?&]${name}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

describe('TennisDirectory', () => {
  let directory;

  beforeEach(() => {
    const stack = createTestStack();
    directory = stack.directory;
  });

  afterEach(() => {
    restoreFetch();
  });

  // ─── searchMembers ─────────────────────────────────────

  describe('searchMembers', () => {
    it('calls /get-members with search query param', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await directory.searchMembers('Smith');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members');
      expect(getParam(url, 'search')).toBe('Smith');
    });

    it('returns normalized members array', async () => {
      stubFetch({ ok: true, members: [minimalMemberResponse()] });

      const result = await directory.searchMembers('Test');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('normalizes snake_case to camelCase', async () => {
      stubFetch({
        ok: true,
        members: [minimalMemberResponse({ account_id: 'acc-123', display_name: 'Jane Doe' })],
      });

      const result = await directory.searchMembers('Jane');
      const member = result[0];

      // camelCase
      expect(member.accountId).toBe('acc-123');
      expect(member.displayName).toBe('Jane Doe');
    });

    it('normalizes to camelCase (no snake_case aliases)', async () => {
      stubFetch({
        ok: true,
        members: [minimalMemberResponse({ account_id: 'acc-456', member_number: 'M999' })],
      });

      const result = await directory.searchMembers('test');
      const member = result[0];

      // WP4-4: camelCase only, no dual-format
      expect(member.accountId).toBe('acc-456');
      expect(member.memberNumber).toBe('M999');
      // snake_case aliases should NOT exist
      expect(member.account_id).toBeUndefined();
      expect(member.member_number).toBeUndefined();
    });

    it('returns empty array when response.ok is false', async () => {
      stubFetch({ ok: false, error: 'Search failed' });

      const result = await directory.searchMembers('nobody');

      expect(result).toEqual([]);
    });

    it('encodes special characters in query', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await directory.searchMembers("O'Brien & Sons");

      const [url] = mockFn.mock.calls[0];
      expect(getParam(url, 'search')).toBe("O'Brien & Sons");
    });

    it('propagates network errors (no internal catch)', async () => {
      stubFetchReject('Network down');

      await expect(directory.searchMembers('test')).rejects.toThrow(/Network down/);
    });
  });

  // ─── getMembersByAccount ───────────────────────────────

  describe('getMembersByAccount', () => {
    it('calls /get-members with member_number query param', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await directory.getMembersByAccount('1234');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members');
      expect(getParam(url, 'member_number')).toBe('1234');
    });

    it('returns normalized members for account', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1', is_primary: true }),
          minimalMemberResponse({ id: 'm2', is_primary: false }),
        ],
      });

      const result = await directory.getMembersByAccount('account-1');

      expect(result.length).toBe(2);
      expect(result[0].isPrimary).toBe(true);
      expect(result[1].isPrimary).toBe(false);
    });

    it('returns empty array when response.ok is false', async () => {
      stubFetch({ ok: false, error: 'Account not found' });

      const result = await directory.getMembersByAccount('invalid-account');

      expect(result).toEqual([]);
    });
  });

  // ─── getAllMembers ─────────────────────────────────────

  describe('getAllMembers', () => {
    it('calls /get-members without query params', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await directory.getAllMembers();

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members');
      // No query params
      expect(url).not.toContain('?');
    });

    it('returns all normalized members', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1' }),
          minimalMemberResponse({ id: 'm2' }),
          minimalMemberResponse({ id: 'm3' }),
        ],
      });

      const result = await directory.getAllMembers();

      expect(result.length).toBe(3);
    });

    it('returns empty array when response.ok is false', async () => {
      stubFetch({ ok: false });

      const result = await directory.getAllMembers();

      expect(result).toEqual([]);
    });
  });

  // ─── findMemberByName ──────────────────────────────────
  // NOTE: findMemberByName(memberNumber, name) uses getMembersByAccount internally

  describe('findMemberByName', () => {
    it('uses getMembersByAccount to fetch members', async () => {
      const mockFn = stubFetch({ ok: true, members: [] });

      await directory.findMemberByName('1234', 'John Doe');

      expect(mockFn).toHaveBeenCalledOnce();
      const [url] = mockFn.mock.calls[0];
      expect(url).toContain('/get-members');
      expect(getParam(url, 'member_number')).toBe('1234');
    });

    it('returns exact matching member (not array)', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1', display_name: 'John Doe' }),
          minimalMemberResponse({ id: 'm2', display_name: 'John Doe Jr' }),
        ],
      });

      const result = await directory.findMemberByName('1234', 'John Doe');

      // Returns single member, not array
      expect(result).not.toBeInstanceOf(Array);
      expect(result.id).toBe('m1');
    });

    it('returns partial match when exact not found', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1', display_name: 'John Doe Smith' }),
          minimalMemberResponse({ id: 'm2', display_name: 'Jane Doe' }),
        ],
      });

      const result = await directory.findMemberByName('1234', 'John Doe');

      expect(result.id).toBe('m1');
    });

    it('returns null when no match found and multiple members', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1', display_name: 'Alice', is_primary: false }),
          minimalMemberResponse({ id: 'm2', display_name: 'Bob', is_primary: false }),
        ],
      });

      const result = await directory.findMemberByName('1234', 'Nobody');

      expect(result).toBeNull();
    });

    it('returns primary member when no name match found', async () => {
      stubFetch({
        ok: true,
        members: [
          minimalMemberResponse({ id: 'm1', display_name: 'Alice', is_primary: false }),
          minimalMemberResponse({ id: 'm2', display_name: 'Bob', is_primary: true }),
        ],
      });

      const result = await directory.findMemberByName('1234', 'Nobody');

      expect(result.id).toBe('m2');
      expect(result.isPrimary).toBe(true);
    });

    it('returns only member when single member on account', async () => {
      stubFetch({
        ok: true,
        members: [minimalMemberResponse({ id: 'm1', display_name: 'Alice' })],
      });

      const result = await directory.findMemberByName('1234', 'Nobody');

      expect(result.id).toBe('m1');
    });

    it('returns null when no members on account', async () => {
      stubFetch({ ok: true, members: [] });

      const result = await directory.findMemberByName('1234', 'Nobody');

      expect(result).toBeNull();
    });

    it('returns null when response.ok is false', async () => {
      stubFetch({ ok: false });

      const result = await directory.findMemberByName('1234', 'test');

      expect(result).toBeNull();
    });
  });

  // ─── Caching ───────────────────────────────────────────

  describe('caching', () => {
    it('caches results - second call does not fetch', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getAllMembers();
      await directory.getAllMembers();

      // Only one fetch call
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('getAllMembers and getMembersByAccount use different cache keys', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getAllMembers();
      await directory.getMembersByAccount('1234');

      // Two different cache keys = two fetches
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('uses different cache keys for different member numbers', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getMembersByAccount('1111');
      await directory.getMembersByAccount('2222');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('searchMembers does not cache (always fetches)', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.searchMembers('Alice');
      await directory.searchMembers('Alice');

      // searchMembers does NOT cache - each call fetches
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('returns cached data on cache hit', async () => {
      const member = minimalMemberResponse({ display_name: 'Cached Member' });
      stubFetch({ ok: true, members: [member] });

      const first = await directory.getAllMembers();

      // Change stub - but cache should be used
      stubFetch({ ok: true, members: [minimalMemberResponse({ display_name: 'New Member' })] });

      const second = await directory.getAllMembers();

      expect(second[0].displayName).toBe('Cached Member');
      expect(first).toEqual(second);
    });

    it('cache expires after TTL', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getAllMembers();

      // Fast-forward past cache TTL (5 minutes = 300000ms)
      vi.useFakeTimers();
      vi.advanceTimersByTime(300001);

      await directory.getAllMembers();
      vi.useRealTimers();

      // Cache expired - should fetch again
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('clearCache clears all cached data', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getAllMembers();
      directory.clearCache();
      await directory.getAllMembers();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('invalidateAll clears all cached data', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getAllMembers();
      directory.invalidateAll();
      await directory.getAllMembers();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('invalidateAccount clears specific account cache', async () => {
      const mockFn = stubFetch({ ok: true, members: [minimalMemberResponse()] });

      await directory.getMembersByAccount('1234');
      directory.invalidateAccount('1234');
      await directory.getMembersByAccount('1234');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Normalization edge cases ──────────────────────────

  describe('normalization edge cases', () => {
    it('handles missing uncleared_streak (defaults to 0)', async () => {
      const memberWithoutStreak = { ...minimalMemberResponse() };
      delete memberWithoutStreak.uncleared_streak;
      stubFetch({ ok: true, members: [memberWithoutStreak] });

      const result = await directory.searchMembers('test');

      expect(result[0].unclearedStreak).toBe(0);
      // WP4-4: snake_case alias should NOT exist
      expect(result[0].uncleared_streak).toBeUndefined();
    });

    it('normalizes all fields to camelCase only', async () => {
      const member = minimalMemberResponse({
        id: 'id-123',
        account_id: 'acc-456',
        member_number: 'M789',
        display_name: 'Full Name',
        is_primary: false,
        uncleared_streak: 3,
      });
      stubFetch({ ok: true, members: [member] });

      const result = await directory.searchMembers('test');
      const m = result[0];

      // WP4-4: camelCase only
      expect(m.id).toBe('id-123');
      expect(m.accountId).toBe('acc-456');
      expect(m.memberNumber).toBe('M789');
      expect(m.displayName).toBe('Full Name');
      expect(m.isPrimary).toBe(false);
      expect(m.unclearedStreak).toBe(3);

      // snake_case aliases should NOT exist
      expect(m.account_id).toBeUndefined();
      expect(m.member_number).toBeUndefined();
      expect(m.display_name).toBeUndefined();
      expect(m.is_primary).toBeUndefined();
      expect(m.uncleared_streak).toBeUndefined();
    });

    it('handles empty members array', async () => {
      stubFetch({ ok: true, members: [] });

      const result = await directory.getAllMembers();

      expect(result).toEqual([]);
    });
  });
});
