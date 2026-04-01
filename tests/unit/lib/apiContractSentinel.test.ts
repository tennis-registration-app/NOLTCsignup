/**
 * API Contract Sentinel
 *
 * Validates that a representative wire-format board response (matching
 * the shape returned by the Supabase get_court_board RPC) passes through
 * the real normalization layer and produces the camelCase domain objects
 * the app relies on.
 *
 * If the backend changes a field name, this test breaks before E2E.
 *
 * NO mocks — runs real normalizeBoard + Zod assertValidBoard.
 */

import { describe, it, expect } from 'vitest';
import { normalizeBoard } from '../../../src/lib/normalize/index.js';
import { assertValidBoard } from '../../../src/lib/schemas/domain.js';
import { validateBoardResponse } from '../../../src/lib/schemas/apiEnvelope.js';
import {
  normalizeAdminSettingsResponse,
  normalizeSettings,
  normalizeOperatingHours,
  normalizeOverrides,
} from '../../../src/lib/normalize/normalizeAdminSettings.js';
import {
  normalizeHeatmapRow,
  normalizeTransaction,
  normalizeGameSession,
  normalizeCalendarBlock,
  normalizeAiResponse,
} from '../../../src/lib/normalize/adminAnalytics.js';

// ============================================================
// Wire-format fixture — mirrors Supabase get_court_board RPC output
// Uses flattened snake_case keys as returned by the real backend
// ============================================================
const SERVER_NOW = '2025-06-15T14:30:00.000Z';

const WIRE_BOARD = {
  serverNow: SERVER_NOW,
  courts: [
    // Court 1: occupied with a session (flattened format)
    {
      court_id: 'uuid-court-1',
      court_number: 1,
      status: 'occupied',
      session_id: 'uuid-session-1',
      started_at: '2025-06-15T13:30:00.000Z',
      scheduled_end_at: '2025-06-15T14:30:00.000Z',
      session_type: 'singles',
      minutes_remaining: 0,
      is_tournament: false,
      participants: [
        { member_id: 'mem-1', display_name: 'Alice Smith', is_guest: false },
        { member_id: 'mem-2', display_name: 'Bob Jones', is_guest: false },
      ],
    },
    // Court 2: blocked (flattened format)
    {
      court_id: 'uuid-court-2',
      court_number: 2,
      status: 'blocked',
      block_id: 'uuid-block-1',
      block_type: 'maintenance',
      block_title: 'Court resurfacing',
      block_starts_at: '2025-06-15T12:00:00.000Z',
      block_ends_at: '2025-06-15T16:00:00.000Z',
    },
    // Court 3: available (minimal)
    {
      court_id: 'uuid-court-3',
      court_number: 3,
      status: 'available',
    },
  ],
  waitlist: [
    {
      id: 'uuid-waitlist-1',
      position: 1,
      joined_at: '2025-06-15T14:00:00.000Z',
      participants: [
        { member_id: 'mem-3', display_name: 'Carol White', is_guest: false },
        { member_id: 'mem-4', display_name: 'Dave Brown', is_guest: true },
      ],
    },
  ],
  upcomingBlocks: [
    {
      id: 'uuid-upcoming-1',
      courtNumber: 5,
      startsAt: '2025-06-15T16:00:00.000Z',
      endsAt: '2025-06-15T18:00:00.000Z',
      title: 'Junior Clinic',
      blockType: 'clinic',
    },
  ],
  operatingHours: [
    { dayOfWeek: 0, open: '07:00', close: '21:00' },
  ],
};

// ============================================================
// Tests
// ============================================================
describe('API Contract Sentinel', () => {
  const board = normalizeBoard(WIRE_BOARD);

  // ---- A) Full board passes Zod validation ----
  it('normalizeBoard output passes assertValidBoard (Zod schema)', () => {
    expect(() => assertValidBoard(board)).not.toThrow();
  });

  // ---- B) Board top-level keys ----
  it('produces expected board-level camelCase keys', () => {
    expect(board).toHaveProperty('serverNow', SERVER_NOW);
    expect(board).toHaveProperty('courts');
    expect(board).toHaveProperty('waitlist');
    expect(board).toHaveProperty('blocks');
    expect(board).toHaveProperty('upcomingBlocks');
    expect(board).toHaveProperty('operatingHours');
  });

  // ---- C) Court normalization (flattened → nested) ----
  describe('court normalization', () => {
    it('normalizes court_id → id, court_number → number', () => {
      const court1 = board.courts[0];
      expect(court1.id).toBe('uuid-court-1');
      expect(court1.number).toBe(1);
    });

    it('derives boolean state flags from status field', () => {
      const court1 = board.courts[0]; // occupied
      expect(court1.isOccupied).toBe(true);
      expect(court1.isAvailable).toBe(false);

      const court2 = board.courts[1]; // blocked
      expect(court2.isBlocked).toBe(true);
      expect(court2.isAvailable).toBe(false);

      const court3 = board.courts[2]; // available
      expect(court3.isAvailable).toBe(true);
      expect(court3.isOccupied).toBe(false);
    });
  });

  // ---- D) Session normalization (flattened → camelCase) ----
  describe('session normalization', () => {
    it('builds session from flattened session_id/started_at/scheduled_end_at', () => {
      const session = board.courts[0].session;
      expect(session).not.toBeNull();
      expect(session!.id).toBe('uuid-session-1');
      expect(session!.courtNumber).toBe(1);
      expect(session!.startedAt).toBe('2025-06-15T13:30:00.000Z');
      expect(session!.scheduledEndAt).toBe('2025-06-15T14:30:00.000Z');
    });

    it('normalizes participants into group.players with camelCase', () => {
      const players = board.courts[0].session!.group.players;
      expect(players).toHaveLength(2);
      expect(players[0]).toMatchObject({
        memberId: 'mem-1',
        displayName: 'Alice Smith',
        isGuest: false,
      });
    });

    it('computes isOvertime correctly', () => {
      // serverNow === scheduledEndAt, so not strictly overtime
      expect(board.courts[0].session!.isOvertime).toBe(false);
    });
  });

  // ---- E) Block normalization (flattened → camelCase) ----
  describe('block normalization', () => {
    it('builds block from flattened block_id/block_title/block_starts_at', () => {
      const block = board.courts[1].block;
      expect(block).not.toBeNull();
      expect(block!.id).toBe('uuid-block-1');
      expect(block!.courtNumber).toBe(2);
      expect(block!.startsAt).toBe('2025-06-15T12:00:00.000Z');
      expect(block!.endsAt).toBe('2025-06-15T16:00:00.000Z');
      expect(block!.reason).toBe('Court resurfacing');
    });

    it('computes isActive for block spanning serverNow', () => {
      expect(board.courts[1].block!.isActive).toBe(true);
    });

    it('extracts active blocks into board.blocks array', () => {
      expect(board.blocks!).toHaveLength(1);
      expect(board.blocks![0]).toMatchObject({
        courtNumber: 2,
        title: 'Court resurfacing',
        isActive: true,
      });
    });
  });

  // ---- F) Waitlist entry normalization ----
  describe('waitlist entry normalization', () => {
    it('normalizes joined_at → joinedAt and computes minutesWaiting', () => {
      const entry = board.waitlist[0];
      expect(entry.id).toBe('uuid-waitlist-1');
      expect(entry.position).toBe(1);
      expect(entry.joinedAt).toBe('2025-06-15T14:00:00.000Z');
      expect(entry.minutesWaiting).toBe(30);
    });

    it('normalizes participants into group.players', () => {
      const players = board.waitlist[0].group.players;
      expect(players).toHaveLength(2);
      expect(players[1]).toMatchObject({
        memberId: 'mem-4',
        displayName: 'Dave Brown',
        isGuest: true,
      });
    });
  });

  // ---- G) Upcoming blocks normalization ----
  describe('upcoming blocks normalization', () => {
    it('maps startsAt → startTime, endsAt → endTime for upcoming blocks', () => {
      expect(board.upcomingBlocks!).toHaveLength(1);
      expect(board.upcomingBlocks![0]).toMatchObject({
        id: 'uuid-upcoming-1',
        courtNumber: 5,
        startTime: '2025-06-15T16:00:00.000Z',
        endTime: '2025-06-15T18:00:00.000Z',
        title: 'Junior Clinic',
        reason: 'clinic',
        isActive: false,
      });
    });
  });

  // ---- H) Available court has no session/block ----
  it('available court has null session and null block', () => {
    const court3 = board.courts[2];
    expect(court3.session).toBeNull();
    expect(court3.block).toBeNull();
  });
});

// ============================================================
// Board API Envelope Validation (validateBoardResponse)
// ============================================================
describe('Board API Envelope Validation', () => {
  it('accepts valid board envelope', () => {
    const result = validateBoardResponse({
      ok: true,
      serverNow: '2025-06-15T14:30:00.000Z',
      courts: [{ court_id: 'uuid-1', court_number: 1, status: 'available' }],
      waitlist: [],
    });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('courts');
  });

  it('defaults ok to true when omitted', () => {
    const result = validateBoardResponse({
      serverNow: '2025-06-15T14:30:00.000Z',
      courts: [],
    });
    expect(result.success).toBe(true);
    expect(result.data!.ok).toBe(true);
  });

  it('defaults waitlist to empty array when omitted', () => {
    const result = validateBoardResponse({
      serverNow: '2025-06-15T14:30:00.000Z',
      courts: [],
    });
    expect(result.success).toBe(true);
    expect(result.data!.waitlist).toEqual([]);
  });

  it('rejects envelope missing serverNow', () => {
    const result = validateBoardResponse({
      ok: true,
      courts: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects envelope missing courts', () => {
    const result = validateBoardResponse({
      ok: true,
      serverNow: '2025-06-15T14:30:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects completely malformed data', () => {
    const result = validateBoardResponse('not an object');
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = validateBoardResponse(null);
    expect(result.success).toBe(false);
  });

  it('passes through extra fields (passthrough mode)', () => {
    const result = validateBoardResponse({
      serverNow: '2025-06-15T14:30:00.000Z',
      courts: [],
      upcomingBlocks: [{ id: 'blk-1' }],
      operatingHours: [],
    });
    expect(result.success).toBe(true);
    expect(result.data!.upcomingBlocks).toHaveLength(1);
  });
});

// ============================================================
// Admin Settings Normalization
// ============================================================
const WIRE_SETTINGS = {
  operating_hours: [
    { day_of_week: 1, day_name: 'Monday', opens_at: '07:00', closes_at: '21:00', is_closed: false },
    { day_of_week: 0, opens_at: '08:00', closes_at: '18:00', is_closed: false },
  ],
  upcoming_overrides: [
    { date: '2025-07-04', opens_at: null, closes_at: null, is_closed: true, reason: 'Holiday' },
  ],
  settings: {
    ball_price_cents: 800,
    ball_bucket_size: 3,
    guest_fee_weekday_cents: 2500,
    guest_fee_weekend_cents: 3000,
    court_count: 12,
    check_status_minutes: 15,
    block_warning_minutes: 30,
    auto_clear_enabled: true,
    auto_clear_minutes: 90,
  },
};

describe('Admin Settings Normalization', () => {
  const normalized = normalizeAdminSettingsResponse(WIRE_SETTINGS);

  it('produces expected top-level keys', () => {
    expect(Object.keys(normalized).sort()).toEqual([
      'operatingHours',
      'settings',
      'upcomingOverrides',
    ]);
  });

  describe('normalizeSettings', () => {
    it('has frozen camelCase key set', () => {
      expect(Object.keys(normalized.settings!).sort()).toEqual([
        'autoClearEnabled',
        'autoClearMinutes',
        'ballBucketSize',
        'ballPriceCents',
        'blockWarningMinutes',
        'checkStatusMinutes',
        'courtCount',
        'guestFeeWeekdayCents',
        'guestFeeWeekendCents',
      ]);
    });

    it('maps values correctly', () => {
      expect(normalized.settings!.ballPriceCents).toBe(800);
      expect(normalized.settings!.courtCount).toBe(12);
      expect(normalized.settings!.autoClearEnabled).toBe(true);
      expect(normalized.settings!.autoClearMinutes).toBe(90);
    });

    it('returns null for null/undefined input', () => {
      expect(normalizeSettings(null)).toBeNull();
      expect(normalizeSettings(undefined)).toBeNull();
    });
  });

  describe('normalizeOperatingHours', () => {
    it('has frozen camelCase key set per entry', () => {
      expect(Object.keys(normalized.operatingHours![0]).sort()).toEqual([
        'closesAt',
        'dayName',
        'dayOfWeek',
        'isClosed',
        'opensAt',
      ]);
    });

    it('maps values correctly', () => {
      const monday = normalized.operatingHours![0];
      expect(monday.dayOfWeek).toBe(1);
      expect(monday.dayName).toBe('Monday');
      expect(monday.opensAt).toBe('07:00');
      expect(monday.closesAt).toBe('21:00');
      expect(monday.isClosed).toBe(false);
    });

    it('derives dayName from dayOfWeek when day_name is absent', () => {
      const sunday = normalized.operatingHours![1];
      expect(sunday.dayOfWeek).toBe(0);
      expect(sunday.dayName).toBe('Sunday');
    });

    it('returns null for null/undefined input', () => {
      expect(normalizeOperatingHours(null)).toBeNull();
      expect(normalizeOperatingHours(undefined)).toBeNull();
    });
  });

  describe('normalizeOverrides', () => {
    it('has frozen camelCase key set per entry', () => {
      expect(Object.keys(normalized.upcomingOverrides![0]).sort()).toEqual([
        'closesAt',
        'date',
        'isClosed',
        'opensAt',
        'reason',
      ]);
    });

    it('maps values correctly', () => {
      const override = normalized.upcomingOverrides![0];
      expect(override.date).toBe('2025-07-04');
      expect(override.isClosed).toBe(true);
      expect(override.reason).toBe('Holiday');
      expect(override.opensAt).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(normalizeOverrides(null)).toBeNull();
      expect(normalizeOverrides(undefined)).toBeNull();
    });
  });
});

// ============================================================
// Admin Analytics Normalization
// ============================================================
describe('Admin Analytics Normalization', () => {
  describe('normalizeHeatmapRow', () => {
    it('has frozen camelCase key set', () => {
      const row = normalizeHeatmapRow({ dow: 3, hour: 14, count: 42 });
      expect(Object.keys(row).sort()).toEqual(['dayOfWeek', 'hour', 'sessionCount']);
    });

    it('maps dow/count aliases correctly', () => {
      const row = normalizeHeatmapRow({ dow: 3, hour: 14, count: 42 });
      expect(row.dayOfWeek).toBe(3);
      expect(row.hour).toBe(14);
      expect(row.sessionCount).toBe(42);
    });

    it('maps day_of_week/session_count aliases correctly', () => {
      const row = normalizeHeatmapRow({ day_of_week: 5, hour: 9, session_count: 10 });
      expect(row.dayOfWeek).toBe(5);
      expect(row.sessionCount).toBe(10);
    });
  });

  describe('normalizeTransaction', () => {
    it('has frozen camelCase key set', () => {
      const tx = normalizeTransaction({
        id: 'tx-1',
        date: '2025-06-15',
        time: '14:30',
        member_number: '12345',
        account_name: 'Smith',
        amount_dollars: 8.0,
        amount_cents: 800,
        description: 'Ball purchase',
      });
      expect(Object.keys(tx).sort()).toEqual([
        'accountName',
        'amountCents',
        'amountDollars',
        'date',
        'description',
        'id',
        'memberNumber',
        'time',
      ]);
    });

    it('maps values correctly', () => {
      const tx = normalizeTransaction({
        id: 'tx-1',
        date: '2025-06-15',
        time: '14:30',
        member_number: '12345',
        account_name: 'Smith',
        amount_dollars: 8.0,
        amount_cents: 800,
        description: 'Ball purchase',
      });
      expect(tx.memberNumber).toBe('12345');
      expect(tx.amountCents).toBe(800);
    });
  });

  describe('normalizeGameSession', () => {
    it('has frozen camelCase key set', () => {
      const session = normalizeGameSession({
        id: 's-1',
        court_number: 3,
        started_at: '2025-06-15T13:00:00Z',
        ended_at: '2025-06-15T14:00:00Z',
        end_reason: 'cleared',
        participants: [],
      });
      expect(Object.keys(session).sort()).toEqual([
        'courtNumber',
        'endReason',
        'endedAt',
        'id',
        'participants',
        'startedAt',
      ]);
    });
  });

  describe('normalizeCalendarBlock', () => {
    it('has frozen camelCase key set (snake_case input)', () => {
      const block = normalizeCalendarBlock({
        id: 'b-1',
        court_id: 'uuid-c-1',
        court_number: 4,
        title: 'Clinic',
        block_type: 'clinic',
        starts_at: '2025-06-15T16:00:00Z',
        ends_at: '2025-06-15T18:00:00Z',
        is_recurring: false,
        recurrence_rule: null,
      });
      expect(Object.keys(block).sort()).toEqual([
        'blockType',
        'courtId',
        'courtNumber',
        'endsAt',
        'id',
        'isRecurring',
        'recurrenceGroupId',
        'recurrenceRule',
        'startsAt',
        'title',
      ]);
    });

    it('accepts camelCase input aliases', () => {
      const block = normalizeCalendarBlock({
        id: 'b-2',
        courtId: 'uuid-c-2',
        courtNumber: 5,
        title: 'Event',
        blockType: 'event',
        startsAt: '2025-06-15T16:00:00Z',
        endsAt: '2025-06-15T18:00:00Z',
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY',
      });
      expect(block.courtId).toBe('uuid-c-2');
      expect(block.blockType).toBe('event');
      expect(block.isRecurring).toBe(true);
    });
  });

  describe('normalizeAiResponse', () => {
    it('has frozen camelCase key set', () => {
      const resp = normalizeAiResponse({
        ok: true,
        error: null,
        response: 'Summary text',
        proposed_tool_calls: [],
        actions_token: 'tok-1',
        requires_confirmation: false,
        executed_actions: [],
      });
      expect(Object.keys(resp).sort()).toEqual([
        'actionsToken',
        'error',
        'executedActions',
        'ok',
        'proposedToolCalls',
        'requiresConfirmation',
        'response',
      ]);
    });

    it('maps values correctly', () => {
      const resp = normalizeAiResponse({
        ok: true,
        error: null,
        response: 'Summary text',
        proposed_tool_calls: [{ name: 'test' }],
        actions_token: 'tok-1',
        requires_confirmation: true,
        executed_actions: ['action1'],
      });
      expect(resp.ok).toBe(true);
      expect(resp.proposedToolCalls).toHaveLength(1);
      expect(resp.actionsToken).toBe('tok-1');
      expect(resp.requiresConfirmation).toBe(true);
    });
  });
});
