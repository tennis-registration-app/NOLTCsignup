/**
 * AdminCommands — delegation wiring tests
 *
 * Mirrors TennisCommands test approach: mock this.api as { post, get },
 * verify endpoint, payload mapping (camelCase → snake_case), and
 * response passthrough for all 20 methods.
 *
 * No production code changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminCommands } from '../../../../src/lib/backend/admin/AdminCommands.js';

// ============================================================
// Helpers
// ============================================================

function createMockApi(overrides = {}) {
  return {
    post: vi.fn().mockResolvedValue({ ok: true }),
    get: vi.fn().mockResolvedValue({ ok: true }),
    aiAssistant: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

function setup(apiOverrides = {}) {
  const api = createMockApi(apiOverrides);
  const commands = new AdminCommands(api);
  return { commands, api };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// A) Block mutations
// ============================================================

describe('AdminCommands', () => {
  describe('createBlock', () => {
    it('posts to /create-block with snake_case payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        code: 'BLOCK_CREATED',
        message: 'Block created',
        serverNow: '2025-01-01T00:00:00Z',
        block: { id: 'block-1' },
      });

      const result = await commands.createBlock({
        courtId: 'court-uuid-1',
        blockType: 'maintenance',
        title: 'Repair',
        startsAt: '2025-01-01T08:00:00Z',
        endsAt: '2025-01-01T10:00:00Z',
        deviceId: 'admin-1',
        deviceType: 'admin',
      });

      expect(api.post).toHaveBeenCalledWith('/create-block', {
        court_id: 'court-uuid-1',
        block_type: 'maintenance',
        title: 'Repair',
        starts_at: '2025-01-01T08:00:00Z',
        ends_at: '2025-01-01T10:00:00Z',
        device_id: 'admin-1',
        device_type: 'admin',
      });
      expect(result).toEqual({
        ok: true,
        code: 'BLOCK_CREATED',
        message: 'Block created',
        serverNow: '2025-01-01T00:00:00Z',
        block: { id: 'block-1' },
      });
    });

    it('defaults deviceType to "admin"', async () => {
      const { commands, api } = setup();

      await commands.createBlock({
        courtId: 'c1',
        blockType: 'wet',
        title: 'Rain',
        startsAt: 't1',
        endsAt: 't2',
        deviceId: 'd1',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/create-block',
        expect.objectContaining({ device_type: 'admin' })
      );
    });

    it('maps response.error to message when message is absent', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: false, error: 'Court locked' });

      const result = await commands.createBlock({
        courtId: 'c1',
        blockType: 'wet',
        title: 'R',
        startsAt: 't1',
        endsAt: 't2',
        deviceId: 'd1',
      });

      expect(result.message).toBe('Court locked');
    });
  });

  describe('updateBlock', () => {
    it('posts to /update-block with required fields', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        block: { id: 'block-1' },
      });

      await commands.updateBlock({
        blockId: 'block-1',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/update-block', {
        block_id: 'block-1',
        device_id: 'admin-1',
        device_type: 'admin',
      });
    });

    it('includes optional fields only when provided', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, block: { id: 'block-1' } });

      await commands.updateBlock({
        blockId: 'block-1',
        deviceId: 'admin-1',
        courtId: 'court-2',
        blockType: 'lesson',
        title: 'Tennis Lesson',
        startsAt: '2025-06-01T08:00:00Z',
        endsAt: '2025-06-01T09:00:00Z',
      });

      expect(api.post).toHaveBeenCalledWith('/update-block', {
        block_id: 'block-1',
        device_id: 'admin-1',
        device_type: 'admin',
        court_id: 'court-2',
        block_type: 'lesson',
        title: 'Tennis Lesson',
        starts_at: '2025-06-01T08:00:00Z',
        ends_at: '2025-06-01T09:00:00Z',
      });
    });

    it('omits optional fields when undefined', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, block: {} });

      await commands.updateBlock({
        blockId: 'b1',
        deviceId: 'd1',
      });

      const payload = api.post.mock.calls[0][1];
      expect(payload).not.toHaveProperty('court_id');
      expect(payload).not.toHaveProperty('block_type');
      expect(payload).not.toHaveProperty('title');
      expect(payload).not.toHaveProperty('starts_at');
      expect(payload).not.toHaveProperty('ends_at');
    });

    it('reads block from response.data.block fallback', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        data: { block: { id: 'from-data' } },
      });

      const result = await commands.updateBlock({
        blockId: 'b1',
        deviceId: 'd1',
      });

      expect(result.block).toEqual({ id: 'from-data' });
    });
  });

  describe('cancelBlock', () => {
    it('posts to /cancel-block with snake_case payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, serverNow: 'now' });

      const result = await commands.cancelBlock({
        blockId: 'block-1',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/cancel-block', {
        block_id: 'block-1',
        device_id: 'admin-1',
        device_type: 'admin',
      });
      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // B) Session mutations
  // ============================================================

  describe('adminEndSession', () => {
    it('posts to /admin-end-session with mapped payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        session: { id: 'sess-1' },
        serverNow: 'now',
      });

      const result = await commands.adminEndSession({
        sessionId: 'sess-1',
        courtId: 'court-1',
        reason: 'rain',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/admin-end-session', {
        session_id: 'sess-1',
        court_id: 'court-1',
        reason: 'rain',
        device_id: 'admin-1',
      });
      expect(result.session).toEqual({ id: 'sess-1' });
    });

    it('defaults reason to admin_force_end', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.adminEndSession({ deviceId: 'd1' });

      expect(api.post).toHaveBeenCalledWith(
        '/admin-end-session',
        expect.objectContaining({ reason: 'admin_force_end' })
      );
    });
  });

  describe('clearAllCourts', () => {
    it('posts to /clear-all-courts with mapped payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        sessionsEnded: 5,
        serverNow: 'now',
      });

      const result = await commands.clearAllCourts({
        reason: 'emergency',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/clear-all-courts', {
        reason: 'emergency',
        device_id: 'admin-1',
      });
      expect(result.sessionsEnded).toBe(5);
    });

    it('defaults reason to admin_clear_all', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.clearAllCourts({ deviceId: 'd1' });

      expect(api.post).toHaveBeenCalledWith(
        '/clear-all-courts',
        expect.objectContaining({ reason: 'admin_clear_all' })
      );
    });
  });

  describe('updateSession', () => {
    it('posts to /admin-update-session with mapped payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        session: { id: 'sess-1' },
        serverNow: 'now',
      });

      const participants = [{ name: 'Alice', type: 'member', member_id: 'M1' }];
      const result = await commands.updateSession({
        sessionId: 'sess-1',
        participants,
        scheduledEndAt: '2025-01-01T10:00:00Z',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/admin-update-session', {
        session_id: 'sess-1',
        participants,
        scheduled_end_at: '2025-01-01T10:00:00Z',
        device_id: 'admin-1',
      });
      expect(result.session).toEqual({ id: 'sess-1' });
    });
  });

  // ============================================================
  // C) Waitlist mutations
  // ============================================================

  describe('removeFromWaitlist', () => {
    it('posts to /remove-from-waitlist with mapped payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, serverNow: 'now' });

      const result = await commands.removeFromWaitlist({
        waitlistEntryId: 'wl-1',
        reason: 'no_show',
        deviceId: 'admin-1',
      });

      expect(api.post).toHaveBeenCalledWith('/remove-from-waitlist', {
        waitlist_entry_id: 'wl-1',
        reason: 'no_show',
        device_id: 'admin-1',
      });
      expect(result.ok).toBe(true);
    });

    it('defaults reason to admin_removed', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.removeFromWaitlist({
        waitlistEntryId: 'wl-1',
        deviceId: 'd1',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/remove-from-waitlist',
        expect.objectContaining({ reason: 'admin_removed' })
      );
    });
  });

  describe('reorderWaitlist', () => {
    it('posts to /reorder-waitlist with snake_case payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, old_position: 3, new_position: 1 });

      const result = await commands.reorderWaitlist({
        entryId: 'wl-1',
        newPosition: 1,
      });

      expect(api.post).toHaveBeenCalledWith('/reorder-waitlist', {
        entry_id: 'wl-1',
        new_position: 1,
      });
      expect(result).toEqual({ ok: true, old_position: 3, new_position: 1 });
    });
  });

  // ============================================================
  // D) Utility mutations
  // ============================================================

  describe('cleanupSessions', () => {
    it('posts to /cleanup-sessions with device_id', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        endedIds: ['s1', 's2'],
        serverNow: 'now',
      });

      const result = await commands.cleanupSessions({ deviceId: 'admin-1' });

      expect(api.post).toHaveBeenCalledWith('/cleanup-sessions', {
        device_id: 'admin-1',
      });
      expect(result.sessionsEnded).toBe(2);
    });

    it('returns 0 sessionsEnded when endedIds is absent', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      const result = await commands.cleanupSessions({ deviceId: 'd1' });

      expect(result.sessionsEnded).toBe(0);
    });
  });

  // ============================================================
  // E) Wet court operations
  // ============================================================

  describe('markWetCourts', () => {
    it('posts to /mark-wet-courts with all fields', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        courts_marked: 3,
        court_numbers: [1, 2, 3],
        blocks_created: 3,
        blocks_cancelled: 0,
        ends_at: '2025-01-01T20:00:00Z',
        idempotent: false,
        serverNow: 'now',
      });

      const result = await commands.markWetCourts({
        deviceId: 'admin-1',
        durationMinutes: 720,
        courtIds: ['c1', 'c2', 'c3'],
        reason: 'Heavy rain',
        idempotencyKey: 'key-123',
      });

      expect(api.post).toHaveBeenCalledWith('/mark-wet-courts', {
        device_id: 'admin-1',
        duration_minutes: 720,
        court_ids: ['c1', 'c2', 'c3'],
        reason: 'Heavy rain',
        idempotency_key: 'key-123',
      });
      expect(result).toEqual({
        ok: true,
        code: undefined,
        message: undefined,
        serverNow: 'now',
        courtsMarked: 3,
        courtNumbers: [1, 2, 3],
        blocksCreated: 3,
        blocksCancelled: 0,
        endsAt: '2025-01-01T20:00:00Z',
        idempotent: false,
      });
    });
  });

  describe('clearWetCourts', () => {
    it('posts to /clear-wet-courts with mapped payload', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        blocks_cleared: 3,
        court_numbers: [1, 2, 3],
        serverNow: 'now',
      });

      const result = await commands.clearWetCourts({
        deviceId: 'admin-1',
        courtIds: ['c1', 'c2'],
        idempotencyKey: 'key-456',
      });

      expect(api.post).toHaveBeenCalledWith('/clear-wet-courts', {
        device_id: 'admin-1',
        court_ids: ['c1', 'c2'],
        idempotency_key: 'key-456',
      });
      expect(result.blocksCleared).toBe(3);
      expect(result.courtNumbers).toEqual([1, 2, 3]);
    });
  });

  // ============================================================
  // F) Read operations (queries)
  // ============================================================

  describe('getBlocks', () => {
    it('posts to /get-blocks with optional filters', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({
        ok: true,
        blocks: [{ id: 'b1' }],
        serverNow: 'now',
      });

      const result = await commands.getBlocks({
        courtId: 'c1',
        fromDate: '2025-01-01',
        toDate: '2025-03-31',
      });

      expect(api.post).toHaveBeenCalledWith('/get-blocks', {
        court_id: 'c1',
        from_date: '2025-01-01',
        to_date: '2025-03-31',
      });
      expect(result.blocks).toEqual([{ id: 'b1' }]);
    });

    it('sends empty payload when called with no args', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, blocks: [] });

      const result = await commands.getBlocks();

      expect(api.post).toHaveBeenCalledWith('/get-blocks', {});
      expect(result.blocks).toEqual([]);
    });

    it('defaults blocks to empty array when absent', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      const result = await commands.getBlocks();

      expect(result.blocks).toEqual([]);
    });
  });

  describe('getTransactions', () => {
    it('builds query string from filters and calls api.get', async () => {
      const { commands, api } = setup();
      const mockResponse = {
        ok: true,
        summary: { total: 5 },
        transactions: [{ id: 't1' }],
      };
      api.get.mockResolvedValue(mockResponse);

      const result = await commands.getTransactions({
        type: 'ball_purchase',
        dateStart: '2025-01-01',
        dateEnd: '2025-01-31',
        memberNumber: '1001',
        limit: 50,
      });

      const url = api.get.mock.calls[0][0];
      expect(url).toContain('/get-transactions?');
      expect(url).toContain('type=ball_purchase');
      expect(url).toContain('date_start=2025-01-01');
      expect(url).toContain('date_end=2025-01-31');
      expect(url).toContain('member_number=1001');
      expect(url).toContain('limit=50');
      expect(result).toEqual(mockResponse);
    });

    it('calls /get-transactions with no query string when no filters', async () => {
      const { commands, api } = setup();
      api.get.mockResolvedValue({ ok: true });

      await commands.getTransactions({});

      // limit defaults to 100, so there's always at least limit param
      const url = api.get.mock.calls[0][0];
      expect(url).toContain('/get-transactions?');
      expect(url).toContain('limit=100');
    });

    it('returns raw response (no reshaping)', async () => {
      const { commands, api } = setup();
      const raw = { ok: true, summary: {}, transactions: [] };
      api.get.mockResolvedValue(raw);

      const result = await commands.getTransactions();

      expect(result).toBe(raw);
    });
  });

  // ============================================================
  // G) Settings
  // ============================================================

  describe('getSettings', () => {
    it('calls api.get /get-settings and spreads response.data', async () => {
      const { commands, api } = setup();
      api.get.mockResolvedValue({
        ok: true,
        data: {
          settings: { ball_price_cents: 500 },
          operating_hours: [],
          upcoming_overrides: [],
        },
      });

      const result = await commands.getSettings();

      expect(api.get).toHaveBeenCalledWith('/get-settings');
      expect(result).toEqual({
        ok: true,
        settings: { ball_price_cents: 500 },
        operating_hours: [],
        upcoming_overrides: [],
      });
    });

    it('returns raw response when ok is false', async () => {
      const { commands, api } = setup();
      const raw = { ok: false, message: 'Unauthorized' };
      api.get.mockResolvedValue(raw);

      const result = await commands.getSettings();

      expect(result).toBe(raw);
    });

    it('returns raw response when data is absent', async () => {
      const { commands, api } = setup();
      const raw = { ok: true };
      api.get.mockResolvedValue(raw);

      const result = await commands.getSettings();

      expect(result).toBe(raw);
    });
  });

  describe('updateSettings', () => {
    it('posts to /update-system-settings with snake_case payload', async () => {
      const { commands, api } = setup();
      const mockResponse = { ok: true, updated: ['ball_price_cents'] };
      api.post.mockResolvedValue(mockResponse);

      const result = await commands.updateSettings({
        settings: { ball_price_cents: 600 },
        operatingHours: [{ day: 0, open: '08:00', close: '18:00' }],
        operatingHoursOverride: { date: '2025-12-25', closed: true },
        deleteOverride: '2025-12-26',
      });

      expect(api.post).toHaveBeenCalledWith('/update-system-settings', {
        settings: { ball_price_cents: 600 },
        operating_hours: [{ day: 0, open: '08:00', close: '18:00' }],
        operating_hours_override: { date: '2025-12-25', closed: true },
        delete_override: '2025-12-26',
      });
      expect(result).toBe(mockResponse);
    });

    it('omits fields when not provided', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.updateSettings({ settings: { ball_price_cents: 500 } });

      const payload = api.post.mock.calls[0][1];
      expect(payload).toEqual({ settings: { ball_price_cents: 500 } });
      expect(payload).not.toHaveProperty('operating_hours');
      expect(payload).not.toHaveProperty('operating_hours_override');
      expect(payload).not.toHaveProperty('delete_override');
    });
  });

  // ============================================================
  // H) Session history & analytics
  // ============================================================

  describe('getSessionHistory', () => {
    it('builds query string and calls api.get', async () => {
      const { commands, api } = setup();
      api.get.mockResolvedValue({ ok: true, sessions: [] });

      await commands.getSessionHistory({
        courtNumber: 3,
        memberName: 'Alice',
        dateStart: '2025-01-01',
        dateEnd: '2025-01-31',
        limit: 25,
      });

      const url = api.get.mock.calls[0][0];
      expect(url).toContain('/get-session-history?');
      expect(url).toContain('court_number=3');
      expect(url).toContain('member_name=Alice');
      expect(url).toContain('date_start=2025-01-01');
      expect(url).toContain('date_end=2025-01-31');
      expect(url).toContain('limit=25');
    });

    it('defaults limit to 50', async () => {
      const { commands, api } = setup();
      api.get.mockResolvedValue({ ok: true });

      await commands.getSessionHistory();

      const url = api.get.mock.calls[0][0];
      expect(url).toContain('limit=50');
    });

    it('returns raw response', async () => {
      const { commands, api } = setup();
      const raw = { ok: true, sessions: [{ id: 's1' }] };
      api.get.mockResolvedValue(raw);

      const result = await commands.getSessionHistory();

      expect(result).toBe(raw);
    });
  });

  describe('getUsageAnalytics', () => {
    it('posts to /get-usage-analytics with days param', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true, heatmap: [] });

      const result = await commands.getUsageAnalytics(30);

      expect(api.post).toHaveBeenCalledWith('/get-usage-analytics', { days: 30 });
      expect(result).toEqual({ ok: true, heatmap: [] });
    });

    it('defaults days to 90', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.getUsageAnalytics();

      expect(api.post).toHaveBeenCalledWith('/get-usage-analytics', { days: 90 });
    });
  });

  describe('getAnalytics', () => {
    it('posts to /get-analytics with start/end', async () => {
      const { commands, api } = setup();
      const raw = { ok: true, summary: {}, heatmap: [] };
      api.post.mockResolvedValue(raw);

      const result = await commands.getAnalytics({
        start: '2025-01-01',
        end: '2025-01-31',
      });

      expect(api.post).toHaveBeenCalledWith('/get-analytics', {
        start: '2025-01-01',
        end: '2025-01-31',
      });
      expect(result).toBe(raw);
    });
  });

  describe('getUsageComparison', () => {
    it('posts to /get-usage-comparison with all params', async () => {
      const { commands, api } = setup();
      const raw = { metric: 'usage', unit: 'sessions', primary: {}, comparison: {} };
      api.post.mockResolvedValue(raw);

      const result = await commands.getUsageComparison({
        metric: 'usage',
        primaryStart: '2025-01-01',
        primaryEnd: '2025-01-31',
        granularity: 'week',
        comparisonStart: '2024-01-01',
      });

      expect(api.post).toHaveBeenCalledWith('/get-usage-comparison', {
        metric: 'usage',
        primaryStart: '2025-01-01',
        primaryEnd: '2025-01-31',
        granularity: 'week',
        comparisonStart: '2024-01-01',
      });
      expect(result).toBe(raw);
    });

    it('applies defaults for metric, granularity, comparisonStart', async () => {
      const { commands, api } = setup();
      api.post.mockResolvedValue({ ok: true });

      await commands.getUsageComparison({
        primaryStart: '2025-01-01',
        primaryEnd: '2025-01-31',
      });

      expect(api.post).toHaveBeenCalledWith('/get-usage-comparison', {
        metric: 'usage',
        primaryStart: '2025-01-01',
        primaryEnd: '2025-01-31',
        granularity: 'auto',
        comparisonStart: null,
      });
    });
  });

  // ============================================================
  // I) AI assistant
  // ============================================================

  describe('aiAssistant', () => {
    it('delegates to api.aiAssistant with all params', async () => {
      const { commands, api } = setup();
      const raw = { ok: true, result: 'some AI response' };
      api.aiAssistant.mockResolvedValue(raw);

      const result = await commands.aiAssistant({
        prompt: 'Show court usage',
        mode: 'execute',
        actions_token: 'tok-123',
        confirm_destructive: true,
      });

      expect(api.aiAssistant).toHaveBeenCalledWith({
        prompt: 'Show court usage',
        mode: 'execute',
        actions_token: 'tok-123',
        confirm_destructive: true,
      });
      expect(result).toBe(raw);
    });

    it('applies defaults for mode, actions_token, confirm_destructive', async () => {
      const { commands, api } = setup();
      api.aiAssistant.mockResolvedValue({ ok: true });

      await commands.aiAssistant({ prompt: 'Help me' });

      expect(api.aiAssistant).toHaveBeenCalledWith({
        prompt: 'Help me',
        mode: 'draft',
        actions_token: null,
        confirm_destructive: false,
      });
    });
  });
});
