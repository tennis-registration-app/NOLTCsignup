import { describe, it, expect, vi } from 'vitest';
import { transformCourts } from '../../../../src/registration/services/legacy/courtTransforms.js';
import { transformWaitlist } from '../../../../src/registration/services/legacy/waitlistTransforms.js';

describe('legacy transforms (smoke tests)', () => {
  describe('transformCourts', () => {
    it('returns empty array for null input', () => {
      expect(transformCourts(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      expect(transformCourts(undefined)).toEqual([]);
    });

    it('transforms a minimal court object', () => {
      const apiCourts = [
        {
          court_id: 'court-uuid-1',
          court_number: 1,
          court_name: 'Court 1',
          status: 'available',
          session: null,
          block: null,
        },
      ];

      const result = transformCourts(apiCourts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'court-uuid-1',
        number: 1,
        name: 'Court 1',
        status: 'available',
        isUnoccupied: true,
        isAvailable: true,
        isOccupied: false,
        isOvertime: false,
        isActive: false,
        isBlocked: false,
        session: null,
        block: null,
      });
    });

    it('accepts optional logger injection', () => {
      const logger = { debug: vi.fn() };
      const apiCourts = [
        {
          court_id: 'court-uuid-1',
          court_number: 1,
          court_name: 'Court 1',
          status: 'available',
          session: null,
          block: null,
        },
      ];

      const result = transformCourts(apiCourts, { logger });

      expect(result).toHaveLength(1);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('transforms court with active session', () => {
      const apiCourts = [
        {
          court_id: 'court-uuid-1',
          court_number: 1,
          court_name: 'Court 1',
          status: 'occupied',
          session: {
            id: 'session-1',
            type: 'singles',
            participants: [{ member_id: 'm1', display_name: 'John Doe', type: 'member' }],
            started_at: '2025-01-01T10:00:00Z',
            scheduled_end_at: '2025-01-01T11:00:00Z',
            minutes_remaining: 30,
            duration_minutes: 60,
          },
          block: null,
        },
      ];

      const result = transformCourts(apiCourts);

      expect(result[0].isOccupied).toBe(true);
      expect(result[0].isActive).toBe(true);
      expect(result[0].isUnoccupied).toBe(false);
      expect(result[0].session).not.toBeNull();
      expect(result[0].session.players).toHaveLength(1);
      expect(result[0].session.players[0].name).toBe('John Doe');
    });

    it('transforms court with block', () => {
      const apiCourts = [
        {
          court_id: 'court-uuid-1',
          court_number: 1,
          court_name: 'Court 1',
          status: 'blocked',
          session: null,
          block: {
            id: 'block-1',
            type: 'maintenance',
            title: 'Court Maintenance',
            starts_at: '2025-01-01T10:00:00Z',
            ends_at: '2025-01-01T12:00:00Z',
          },
        },
      ];

      const result = transformCourts(apiCourts);

      expect(result[0].isBlocked).toBe(true);
      expect(result[0].isUnoccupied).toBe(false);
      expect(result[0].block).not.toBeNull();
      expect(result[0].block.reason).toBe('Court Maintenance');
    });
  });

  describe('transformWaitlist', () => {
    it('returns empty array for null input', () => {
      expect(transformWaitlist(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      expect(transformWaitlist(undefined)).toEqual([]);
    });

    it('transforms a minimal waitlist entry', () => {
      const apiWaitlist = [
        {
          id: 'waitlist-1',
          position: 1,
          group_type: 'singles',
          participants: [{ name: 'John Doe' }],
          joined_at: '2025-01-01T10:00:00Z',
          minutes_waiting: 15,
        },
      ];

      const result = transformWaitlist(apiWaitlist);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'waitlist-1',
        position: 1,
        type: 'singles',
        players: [{ name: 'John Doe' }],
        waitTime: 15 * 60 * 1000,
      });
      expect(result[0].joinedAt).toBe(new Date('2025-01-01T10:00:00Z').getTime());
    });

    it('handles missing participants', () => {
      const apiWaitlist = [
        {
          id: 'waitlist-1',
          position: 1,
          group_type: 'singles',
          participants: null,
          joined_at: '2025-01-01T10:00:00Z',
          minutes_waiting: 0,
        },
      ];

      const result = transformWaitlist(apiWaitlist);

      expect(result[0].players).toEqual([]);
    });

    it('handles missing minutes_waiting', () => {
      const apiWaitlist = [
        {
          id: 'waitlist-1',
          position: 1,
          group_type: 'singles',
          participants: [],
          joined_at: '2025-01-01T10:00:00Z',
        },
      ];

      const result = transformWaitlist(apiWaitlist);

      expect(result[0].waitTime).toBe(0);
    });
  });
});
