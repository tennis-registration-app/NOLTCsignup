import { describe, it, expect } from 'vitest';
import {
  generateBlocksFingerprint,
  extractCourtBlocks,
  transformBoardUpdate,
} from '../../../src/admin/hooks/boardSubscriptionLogic.js';

describe('boardSubscriptionLogic', () => {
  // ─── generateBlocksFingerprint ────────────────────────────

  describe('generateBlocksFingerprint', () => {
    it('returns empty string for null/undefined', () => {
      expect(generateBlocksFingerprint(null)).toBe('');
      expect(generateBlocksFingerprint(undefined)).toBe('');
    });

    it('returns empty string for non-array', () => {
      expect(generateBlocksFingerprint({})).toBe('');
      expect(generateBlocksFingerprint('not an array')).toBe('');
    });

    it('returns empty string for empty array', () => {
      expect(generateBlocksFingerprint([])).toBe('');
    });

    it('generates fingerprint from blocks', () => {
      const blocks = [
        { id: '1', startsAt: '2025-01-01T09:00', endsAt: '2025-01-01T10:00' },
        { id: '2', startsAt: '2025-01-01T11:00', endsAt: '2025-01-01T12:00' },
      ];
      const result = generateBlocksFingerprint(blocks);
      expect(result).toContain('1:2025-01-01T09:00:2025-01-01T10:00');
      expect(result).toContain('2:2025-01-01T11:00:2025-01-01T12:00');
    });

    it('handles snake_case field names', () => {
      const blocks = [
        { id: '1', starts_at: '2025-01-01T09:00', ends_at: '2025-01-01T10:00' },
      ];
      const result = generateBlocksFingerprint(blocks);
      expect(result).toBe('1:2025-01-01T09:00:2025-01-01T10:00');
    });

    it('produces consistent fingerprint regardless of input order', () => {
      const blocks1 = [
        { id: '2', startsAt: '2025-01-01T11:00', endsAt: '2025-01-01T12:00' },
        { id: '1', startsAt: '2025-01-01T09:00', endsAt: '2025-01-01T10:00' },
      ];
      const blocks2 = [
        { id: '1', startsAt: '2025-01-01T09:00', endsAt: '2025-01-01T10:00' },
        { id: '2', startsAt: '2025-01-01T11:00', endsAt: '2025-01-01T12:00' },
      ];
      expect(generateBlocksFingerprint(blocks1)).toBe(generateBlocksFingerprint(blocks2));
    });
  });

  // ─── extractCourtBlocks ───────────────────────────────────

  describe('extractCourtBlocks', () => {
    it('returns empty array for null/undefined', () => {
      expect(extractCourtBlocks(null)).toEqual([]);
      expect(extractCourtBlocks(undefined)).toEqual([]);
    });

    it('returns empty array for non-array', () => {
      expect(extractCourtBlocks({})).toEqual([]);
    });

    it('returns empty array when no courts have blocks', () => {
      const courts = [
        { id: 1, number: 1 },
        { id: 2, number: 2 },
      ];
      expect(extractCourtBlocks(courts)).toEqual([]);
    });

    it('extracts blocks from courts with block property', () => {
      const courts = [
        { id: 1, number: 1, block: null },
        {
          id: 2,
          number: 2,
          block: {
            id: 'block-1',
            reason: 'Maintenance',
            startsAt: '2025-01-01T09:00',
            endsAt: '2025-01-01T10:00',
          },
        },
        { id: 3, number: 3 },
      ];
      const result = extractCourtBlocks(courts);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'block-1',
        courtId: 2,
        courtNumber: 2,
        reason: 'Maintenance',
        startTime: '2025-01-01T09:00',
        endTime: '2025-01-01T10:00',
      });
    });

    it('handles alternative field names (startTime/endTime)', () => {
      const courts = [
        {
          id: 1,
          number: 1,
          block: {
            id: 'block-1',
            reason: 'Repair',
            startTime: '2025-01-01T09:00',
            endTime: '2025-01-01T10:00',
          },
        },
      ];
      const result = extractCourtBlocks(courts);
      expect(result[0].startTime).toBe('2025-01-01T09:00');
      expect(result[0].endTime).toBe('2025-01-01T10:00');
    });

    it('defaults startTime to current ISO string when missing', () => {
      const courts = [
        {
          id: 1,
          number: 1,
          block: {
            id: 'block-1',
            reason: 'Unknown',
          },
        },
      ];
      const result = extractCourtBlocks(courts);
      // Should be an ISO string (contains T and Z or timezone offset)
      expect(result[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ─── transformBoardUpdate ─────────────────────────────────

  describe('transformBoardUpdate', () => {
    it('returns default shape for null board', () => {
      const result = transformBoardUpdate(null);
      expect(result).toEqual({
        courts: [],
        waitingGroups: [],
        courtBlocks: [],
        newFingerprint: '',
        shouldBumpRefreshTrigger: false,
      });
    });

    it('returns default shape for undefined board', () => {
      const result = transformBoardUpdate(undefined);
      expect(result).toEqual({
        courts: [],
        waitingGroups: [],
        courtBlocks: [],
        newFingerprint: '',
        shouldBumpRefreshTrigger: false,
      });
    });

    it('returns all 5 fields always', () => {
      const result = transformBoardUpdate({});
      expect(result).toHaveProperty('courts');
      expect(result).toHaveProperty('waitingGroups');
      expect(result).toHaveProperty('courtBlocks');
      expect(result).toHaveProperty('newFingerprint');
      expect(result).toHaveProperty('shouldBumpRefreshTrigger');
    });

    it('transforms valid board data correctly', () => {
      const board = {
        courts: [
          { id: 1, number: 1 },
          {
            id: 2,
            number: 2,
            block: { id: 'b1', reason: 'Maintenance', startsAt: '09:00', endsAt: '10:00' },
          },
        ],
        waitlist: [{ group: { id: 'g1', players: [{ name: 'Alice' }] } }],
        blocks: [{ id: 'b1', startsAt: '09:00', endsAt: '10:00' }],
        upcomingBlocks: [],
      };
      const result = transformBoardUpdate(board);

      expect(result.courts).toHaveLength(2);
      expect(result.courtBlocks).toHaveLength(1);
      expect(result.courtBlocks[0].reason).toBe('Maintenance');
      expect(result.newFingerprint).toContain('b1:09:00:10:00');
    });

    it('handles missing waitlist (defaults to empty)', () => {
      const board = { courts: [] };
      const result = transformBoardUpdate(board);
      expect(result.waitingGroups).toEqual([]);
    });

    it('handles missing blocks and upcomingBlocks', () => {
      const board = { courts: [] };
      const result = transformBoardUpdate(board);
      expect(result.newFingerprint).toBe('');
    });

    it('shouldBumpRefreshTrigger is true when fingerprint changes', () => {
      const board = {
        courts: [],
        blocks: [{ id: '1', startsAt: '09:00', endsAt: '10:00' }],
        upcomingBlocks: [],
      };
      const result = transformBoardUpdate(board, ''); // Empty last fingerprint
      expect(result.shouldBumpRefreshTrigger).toBe(true);
    });

    it('shouldBumpRefreshTrigger is false when fingerprint unchanged', () => {
      const board = {
        courts: [],
        blocks: [{ id: '1', startsAt: '09:00', endsAt: '10:00' }],
        upcomingBlocks: [],
      };
      // First call to get the fingerprint
      const firstResult = transformBoardUpdate(board, '');
      // Second call with same fingerprint
      const secondResult = transformBoardUpdate(board, firstResult.newFingerprint);
      expect(secondResult.shouldBumpRefreshTrigger).toBe(false);
    });

    it('does not mutate input data (Object.freeze test)', () => {
      const board = Object.freeze({
        courts: Object.freeze([Object.freeze({ id: 1, number: 1 })]),
        waitlist: Object.freeze([]),
        blocks: Object.freeze([]),
        upcomingBlocks: Object.freeze([]),
      });

      // Should not throw
      expect(() => transformBoardUpdate(board)).not.toThrow();
    });

    it('combines blocks and upcomingBlocks for fingerprint', () => {
      const board = {
        courts: [],
        blocks: [{ id: '1', startsAt: '09:00', endsAt: '10:00' }],
        upcomingBlocks: [{ id: '2', startsAt: '11:00', endsAt: '12:00' }],
      };
      const result = transformBoardUpdate(board);
      expect(result.newFingerprint).toContain('1:09:00:10:00');
      expect(result.newFingerprint).toContain('2:11:00:12:00');
    });
  });
});
