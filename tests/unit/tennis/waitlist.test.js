/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Import the module - it will attach to window.Tennis.Domain
import '../../../src/tennis/domain/waitlist.js';

describe('tennis/domain/waitlist', () => {
  let W;

  beforeAll(() => {
    W = window.Tennis?.Domain?.waitlist;
  });

  it('attaches to window.Tennis.Domain.waitlist', () => {
    expect(W).toBeDefined();
  });

  it('attaches uppercase alias window.Tennis.Domain.Waitlist', () => {
    expect(window.Tennis.Domain.Waitlist).toBeDefined();
    expect(window.Tennis.Domain.Waitlist).toBe(window.Tennis.Domain.waitlist);
  });

  describe('estimateWaitForPositions', () => {
    it('returns array of estimates for given positions', () => {
      const result = W.estimateWaitForPositions({
        positions: [1, 2],
        currentFreeCount: 0,
        nextFreeTimes: [new Date(Date.now() + 30 * 60000)],
        avgGameMinutes: 60,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('returns 0 when currentFreeCount >= position', () => {
      const result = W.estimateWaitForPositions({
        positions: [1],
        currentFreeCount: 2,
        nextFreeTimes: [],
        avgGameMinutes: 60,
      });
      expect(result[0]).toBe(0);
    });
  });

  describe('estimateWaitMinutes', () => {
    it('returns 0 when court is available', () => {
      const result = W.estimateWaitMinutes({
        position: 1,
        courts: [null], // null = free court
        now: new Date(),
        avgGame: 60,
      });
      expect(result).toBe(0);
    });

    it('returns wait time based on court end times', () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 30 * 60000); // 30 min from now
      const result = W.estimateWaitMinutes({
        position: 1,
        courts: [{ endTime: endTime.toISOString() }],
        now,
        avgGame: 60,
      });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe('validateGroup', () => {
    it('returns invalid for non-array group', () => {
      const result = W.validateGroup({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group must be an array');
    });

    it('returns invalid for empty group', () => {
      const result = W.validateGroup([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group cannot be empty');
    });

    it('returns valid for group with valid players', () => {
      const result = W.validateGroup([
        { name: 'Test Player' },
        { name: 'Another Player' },
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
