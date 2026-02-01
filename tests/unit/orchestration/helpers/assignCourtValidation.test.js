/**
 * Unit tests for assign-court validation guards (v0 behavior mirror)
 */
import { describe, it, expect } from 'vitest';
import {
  guardNotAssigning,
  guardOperatingHours,
  guardCourtNumber,
  guardGroup,
  guardGroupCompat,
} from '../../../../src/registration/orchestration/helpers/assignCourtValidation.js';

describe('guardNotAssigning (v0 mirror)', () => {
  it('returns ok:false when isAssigning is true (blocks double-submit)', () => {
    const result = guardNotAssigning(true);
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('ALREADY_ASSIGNING');
    expect(result.message).toBe(''); // v0 has silent return, no message
  });

  it('returns ok:true when isAssigning is false', () => {
    const result = guardNotAssigning(false);
    expect(result.ok).toBe(true);
  });
});

describe('guardOperatingHours (v0 mirror)', () => {
  it('returns ok:true when no operating hours configured (null)', () => {
    const result = guardOperatingHours({
      operatingHours: null,
      currentHour: 12,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(true);
  });

  it('returns ok:true when no operating hours configured (empty array)', () => {
    const result = guardOperatingHours({
      operatingHours: [],
      currentHour: 12,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with CLUB_CLOSED when today is marked closed (camelCase)', () => {
    const result = guardOperatingHours({
      operatingHours: [{ dayOfWeek: 1, isClosed: true }],
      currentHour: 12,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('CLUB_CLOSED');
    expect(result.message).toBe('The club is closed today.');
  });

  it('returns ok:false with CLUB_CLOSED when today is marked closed (snake_case)', () => {
    const result = guardOperatingHours({
      operatingHours: [{ day_of_week: 1, is_closed: true }],
      currentHour: 12,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('CLUB_CLOSED');
  });

  it('returns ok:false with CLUB_NOT_OPEN when before opening time (camelCase)', () => {
    const result = guardOperatingHours({
      operatingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: '08:00:00' }],
      currentHour: 6,
      currentMinutes: 30,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('CLUB_NOT_OPEN');
    expect(result.message).toContain('8:00 AM');
  });

  it('returns ok:false with CLUB_NOT_OPEN when before opening time (snake_case)', () => {
    const result = guardOperatingHours({
      operatingHours: [{ day_of_week: 1, is_closed: false, opens_at: '09:30:00' }],
      currentHour: 8,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('CLUB_NOT_OPEN');
    expect(result.message).toContain('9:30 AM');
  });

  it('returns ok:true when after opening time', () => {
    const result = guardOperatingHours({
      operatingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: '08:00:00' }],
      currentHour: 10,
      currentMinutes: 0,
      dayOfWeek: 1,
    });
    expect(result.ok).toBe(true);
  });

  it('returns ok:true when no hours found for today (fallback allows)', () => {
    const result = guardOperatingHours({
      operatingHours: [{ dayOfWeek: 2, isClosed: false, opensAt: '08:00:00' }], // Different day
      currentHour: 6,
      currentMinutes: 0,
      dayOfWeek: 1, // Today is Monday, no config
    });
    expect(result.ok).toBe(true);
  });
});

describe('guardCourtNumber (v0 mirror)', () => {
  it('returns ok:false when courtNumber is null', () => {
    const result = guardCourtNumber({ courtNumber: null, courtCount: 12 });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('INVALID_COURT');
  });

  it('returns ok:false when courtNumber is undefined', () => {
    const result = guardCourtNumber({ courtNumber: undefined, courtCount: 12 });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('INVALID_COURT');
  });

  it('returns ok:false when courtNumber is 0', () => {
    const result = guardCourtNumber({ courtNumber: 0, courtCount: 12 });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('INVALID_COURT');
  });

  it('returns ok:false when courtNumber exceeds court count', () => {
    const result = guardCourtNumber({ courtNumber: 15, courtCount: 12 });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('INVALID_COURT');
    expect(result.message).toContain('between 1 and 12');
  });

  it('returns ok:true when courtNumber is valid', () => {
    const result = guardCourtNumber({ courtNumber: 5, courtCount: 12 });
    expect(result.ok).toBe(true);
  });

  it('returns ok:true when courtNumber equals court count', () => {
    const result = guardCourtNumber({ courtNumber: 12, courtCount: 12 });
    expect(result.ok).toBe(true);
  });
});

describe('guardGroup (v0 mirror)', () => {
  it('returns ok:false when group is null', () => {
    const result = guardGroup({ currentGroup: null });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('NO_PLAYERS');
    expect(result.message).toBe('No players in group. Please add players first.');
  });

  it('returns ok:false when group is undefined', () => {
    const result = guardGroup({ currentGroup: undefined });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('NO_PLAYERS');
  });

  it('returns ok:false when group is empty array', () => {
    const result = guardGroup({ currentGroup: [] });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('NO_PLAYERS');
  });

  it('returns ok:true when group has players', () => {
    const result = guardGroup({ currentGroup: [{ id: 1, name: 'Player 1' }] });
    expect(result.ok).toBe(true);
  });
});

describe('guardGroupCompat (v0 mirror)', () => {
  it('returns ok:false when validateGroupCompat returns errors', () => {
    const mockValidator = () => ({ ok: false, errors: ['Error 1', 'Error 2'] });
    const result = guardGroupCompat({
      players: [],
      guests: 0,
      validateGroupCompat: mockValidator,
    });
    expect(result.ok).toBe(false);
    expect(result.kind).toBe('GROUP_INVALID');
    expect(result.message).toBe('Error 1\nError 2');
  });

  it('returns ok:true when validateGroupCompat passes', () => {
    const mockValidator = () => ({ ok: true, errors: [] });
    const result = guardGroupCompat({
      players: [{ id: '1', name: 'Test' }],
      guests: 0,
      validateGroupCompat: mockValidator,
    });
    expect(result.ok).toBe(true);
  });
});
