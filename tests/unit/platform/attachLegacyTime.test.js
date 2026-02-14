import { describe, test, expect } from 'vitest';
import { legacyTime } from '../../../src/platform/attachLegacyTime.js';

describe('attachLegacyTime', () => {
  test('exports all required functions', () => {
    expect(typeof legacyTime.addMinutes).toBe('function');
    expect(typeof legacyTime.durationForGroupSize).toBe('function');
    expect(typeof legacyTime.isOverTime).toBe('function');
    expect(typeof legacyTime.formatTime).toBe('function');
    expect(typeof legacyTime.formatDate).toBe('function');
  });

  test('addMinutes adds minutes to a date', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = legacyTime.addMinutes(date, 30);
    expect(result.getTime()).toBe(date.getTime() + 30 * 60000);
  });

  test('durationForGroupSize returns correct duration', () => {
    expect(legacyTime.durationForGroupSize(2)).toBe(60); // singles
    expect(legacyTime.durationForGroupSize(4)).toBe(90); // doubles
  });

  test('isOverTime returns true when past end time', () => {
    const now = new Date('2024-01-01T13:00:00Z');
    const endTime = new Date('2024-01-01T12:00:00Z');
    expect(legacyTime.isOverTime(now, endTime)).toBe(true);
  });

  test('isOverTime returns false when before end time', () => {
    const now = new Date('2024-01-01T11:00:00Z');
    const endTime = new Date('2024-01-01T12:00:00Z');
    expect(legacyTime.isOverTime(now, endTime)).toBe(false);
  });
});
