/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { availability } from '../../../src/tennis/domain/availability.js';

describe('availability ESM port', () => {
  beforeEach(() => {
    // Reset window.Tennis for clean test state
    delete window.Tennis;
    // Re-import to re-attach
    window.Tennis = window.Tennis || {};
    window.Tennis.Domain = window.Tennis.Domain || {};
    window.Tennis.Domain.availability = availability;
    window.Tennis.Domain.Availability = availability;
  });

  it('both window casings exist and are same reference', () => {
    expect(window.Tennis.Domain.availability).toBe(window.Tennis.Domain.Availability);
  });

  it('API has exactly 10 expected keys', () => {
    const keys = Object.keys(availability).sort();
    expect(keys).toEqual([
      'canAssignToCourt',
      'getCourtStatuses',
      'getFreeCourts',
      'getFreeCourtsInfo',
      'getNextFreeTimes',
      'getSelectableCourts',
      'getSelectableCourtsForAssignment',
      'getSelectableCourtsStrict',
      'hasSoonBlockConflict',
      'shouldAllowWaitlistJoin',
    ]);
  });

  it('isOvertime detects past-end session', () => {
    const now = new Date('2026-01-01T13:00:00');
    const statuses = availability.getCourtStatuses({
      data: {
        courts: [
          {
            number: 1,
            session: {
              scheduledEndAt: '2026-01-01T12:00:00',
              group: { players: [{ name: 'Test' }] },
            },
          },
        ],
      },
      now,
      blocks: [],
      wetSet: new Set(),
    });
    expect(statuses[0]?.status).toBe('overtime');
  });

  it('shouldAllowWaitlistJoin with empty courts', () => {
    const result = availability.shouldAllowWaitlistJoin({
      data: { courts: Array(12).fill(null) },
      now: new Date(),
      blocks: [],
      wetSet: new Set(),
    });
    expect(result).toBe(false);
  });

  describe('getFreeCourts', () => {
    it('returns free courts when no sessions', () => {
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set(),
      });
      expect(result).toEqual([1, 2, 3]);
    });

    it('excludes wet courts', () => {
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set([2]),
      });
      expect(result).toEqual([1, 3]);
    });

    it('excludes occupied courts', () => {
      const result = availability.getFreeCourts({
        data: {
          courts: [null, { session: { scheduledEndAt: '2099-01-01T12:00:00' } }, null],
        },
        now: new Date(),
        blocks: [],
        wetSet: new Set(),
      });
      expect(result).toEqual([1, 3]);
    });

    it('excludes blocked courts', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.getFreeCourts({
        data: { courts: [null, null, null] },
        now,
        blocks: [
          {
            courtNumber: 2,
            startTime: '2026-01-01T09:00:00',
            endTime: '2026-01-01T11:00:00',
          },
        ],
        wetSet: new Set(),
      });
      expect(result).toEqual([1, 3]);
    });
  });

  describe('getFreeCourtsInfo', () => {
    it('classifies courts correctly', () => {
      // Mock Tennis.Config for this test
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };

      const now = new Date('2026-01-01T13:00:00');
      const result = availability.getFreeCourtsInfo({
        data: {
          courts: [
            null, // free
            { session: { scheduledEndAt: '2026-01-01T12:00:00' } }, // overtime
            { session: { scheduledEndAt: '2026-01-01T14:00:00' } }, // occupied
          ],
        },
        now,
        blocks: [],
        wetSet: new Set(),
      });

      expect(result.free).toEqual([1]);
      expect(result.overtime).toEqual([2]);
      expect(result.occupied).toEqual([3]);
    });
  });

  describe('hasSoonBlockConflict', () => {
    it('detects block conflict within required time', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.hasSoonBlockConflict({
        courtNumber: 1,
        now,
        blocks: [
          {
            courtNumber: 1,
            startTime: '2026-01-01T10:30:00',
            endTime: '2026-01-01T11:30:00',
          },
        ],
        requiredMinutes: 60,
      });
      expect(result).toBe(true);
    });

    it('returns false when no conflict', () => {
      const now = new Date('2026-01-01T10:00:00');
      const result = availability.hasSoonBlockConflict({
        courtNumber: 1,
        now,
        blocks: [
          {
            courtNumber: 1,
            startTime: '2026-01-01T12:00:00',
            endTime: '2026-01-01T13:00:00',
          },
        ],
        requiredMinutes: 60,
      });
      expect(result).toBe(false);
    });
  });

  describe('getSelectableCourtsStrict', () => {
    it('returns free courts when available', () => {
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 3 } };

      const result = availability.getSelectableCourtsStrict({
        data: { courts: [null, null, null] },
        now: new Date(),
        blocks: [],
        wetSet: new Set(),
      });
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns overtime courts when no free', () => {
      window.Tennis = window.Tennis || {};
      window.Tennis.Config = { Courts: { TOTAL_COUNT: 2 } };

      const now = new Date('2026-01-01T13:00:00');
      const result = availability.getSelectableCourtsStrict({
        data: {
          courts: [
            { session: { scheduledEndAt: '2026-01-01T12:00:00' } }, // overtime
            { session: { scheduledEndAt: '2026-01-01T14:00:00' } }, // occupied
          ],
        },
        now,
        blocks: [],
        wetSet: new Set(),
      });
      expect(result).toEqual([1]);
    });
  });
});
