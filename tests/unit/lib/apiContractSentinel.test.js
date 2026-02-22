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
      expect(session.id).toBe('uuid-session-1');
      expect(session.courtNumber).toBe(1);
      expect(session.startedAt).toBe('2025-06-15T13:30:00.000Z');
      expect(session.scheduledEndAt).toBe('2025-06-15T14:30:00.000Z');
    });

    it('normalizes participants into group.players with camelCase', () => {
      const players = board.courts[0].session.group.players;
      expect(players).toHaveLength(2);
      expect(players[0]).toMatchObject({
        memberId: 'mem-1',
        displayName: 'Alice Smith',
        isGuest: false,
      });
    });

    it('computes isOvertime correctly', () => {
      // serverNow === scheduledEndAt, so not strictly overtime
      expect(board.courts[0].session.isOvertime).toBe(false);
    });
  });

  // ---- E) Block normalization (flattened → camelCase) ----
  describe('block normalization', () => {
    it('builds block from flattened block_id/block_title/block_starts_at', () => {
      const block = board.courts[1].block;
      expect(block).not.toBeNull();
      expect(block.id).toBe('uuid-block-1');
      expect(block.courtNumber).toBe(2);
      expect(block.startsAt).toBe('2025-06-15T12:00:00.000Z');
      expect(block.endsAt).toBe('2025-06-15T16:00:00.000Z');
      expect(block.reason).toBe('Court resurfacing');
    });

    it('computes isActive for block spanning serverNow', () => {
      expect(board.courts[1].block.isActive).toBe(true);
    });

    it('extracts active blocks into board.blocks array', () => {
      expect(board.blocks).toHaveLength(1);
      expect(board.blocks[0]).toMatchObject({
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
      expect(board.upcomingBlocks).toHaveLength(1);
      expect(board.upcomingBlocks[0]).toMatchObject({
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
