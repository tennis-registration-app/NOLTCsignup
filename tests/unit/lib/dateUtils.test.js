import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../../src/lib/dateUtils.js';

describe('formatDuration', () => {
  it('formats 0 minutes as "0m"', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats null/undefined as "0m"', () => {
    expect(formatDuration(null)).toBe('0m');
    expect(formatDuration(undefined)).toBe('0m');
  });

  it('formats negative minutes as "0m"', () => {
    expect(formatDuration(-10)).toBe('0m');
  });

  it('formats minutes under one hour', () => {
    expect(formatDuration(30)).toBe('30m');
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats exactly two hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours and minutes combined', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(150)).toBe('2h 30m');
  });

  it('formats single digit minutes', () => {
    expect(formatDuration(5)).toBe('5m');
    expect(formatDuration(65)).toBe('1h 5m');
  });
});
