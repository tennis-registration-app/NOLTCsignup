import { describe, it, expect } from 'vitest';
import {
  computeRegistrationCourtSelection,
  computePlayableCourts,
} from '../../../src/shared/courts/overtimeEligibility.js';

describe('computeRegistrationCourtSelection', () => {
  it('returns empty selection for null/undefined courts', () => {
    const result = computeRegistrationCourtSelection(null);
    expect(result.primaryCourts).toEqual([]);
    expect(result.fallbackOvertimeCourts).toEqual([]);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns empty selection for empty courts array', () => {
    const result = computeRegistrationCourtSelection([]);
    expect(result.primaryCourts).toEqual([]);
    expect(result.fallbackOvertimeCourts).toEqual([]);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns available courts excluding blocked ones', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: true, isBlocked: true, isOvertime: false },
      { number: 3, isAvailable: false, isBlocked: false, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.primaryCourts).toHaveLength(1);
    expect(result.primaryCourts[0].number).toBe(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns overtime courts when no primary courts available', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.primaryCourts).toHaveLength(0);
    expect(result.fallbackOvertimeCourts).toHaveLength(2);
    expect(result.showingOvertimeCourts).toBe(true);
  });

  it('prioritizes primary courts over overtime courts', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.primaryCourts).toHaveLength(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('excludes blocked overtime courts', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: true, isOvertime: true },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.fallbackOvertimeCourts).toHaveLength(1);
    expect(result.fallbackOvertimeCourts[0].number).toBe(2);
  });

  it('builds eligibility map correctly', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false },
      { number: 2, isAvailable: false, isBlocked: true, isOvertime: false },
    ];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.eligibilityByCourtNumber[1].eligible).toBe(true);
    expect(result.eligibilityByCourtNumber[2].eligible).toBe(false);
  });

  it('handles null entries in courts array', () => {
    const courts = [null, { number: 2, isAvailable: true, isBlocked: false }];
    const result = computeRegistrationCourtSelection(courts);
    expect(result.primaryCourts).toHaveLength(1);
  });
});

describe('computePlayableCourts', () => {
  const now = '2024-01-15T10:00:00Z';

  it('returns empty for null/undefined courts', () => {
    const result = computePlayableCourts(null, [], now);
    expect(result.playableCourts).toEqual([]);
    expect(result.playableCourtNumbers).toEqual([]);
  });

  it('returns empty for empty courts array', () => {
    const result = computePlayableCourts([], [], now);
    expect(result.playableCourts).toEqual([]);
  });

  it('filters out null/undefined entries', () => {
    const courts = [null, { number: 2, session: null }, undefined];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourts).toHaveLength(1);
    expect(result.playableCourtNumbers).toContain(2);
  });

  it('excludes courts with active sessions', () => {
    const courts = [
      {
        number: 1,
        session: { scheduledEndAt: '2024-01-15T11:00:00Z' }, // ends in future
      },
      { number: 2, session: null },
    ];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourtNumbers).toEqual([2]);
  });

  it('includes courts in overtime as playable', () => {
    const courts = [
      {
        number: 1,
        isOvertime: true,
        session: { scheduledEndAt: '2024-01-15T09:00:00Z' }, // ended 1 hour ago
      },
    ];
    const result = computePlayableCourts(courts, [], now);
    expect(result.playableCourtNumbers).toContain(1);
  });

  it('excludes courts with active blocks', () => {
    const courts = [{ number: 1, session: null }, { number: 2, session: null }];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    const result = computePlayableCourts(courts, blocks, now);
    expect(result.playableCourtNumbers).toEqual([2]);
  });

  it('builds eligibility map with reasons', () => {
    const courts = [
      { number: 1, session: null, isBlocked: true },
      { number: 2, session: { scheduledEndAt: '2024-01-15T11:00:00Z' } },
    ];
    const blocks = [
      {
        courtNumber: 1,
        startsAt: '2024-01-15T09:00:00Z',
        endsAt: '2024-01-15T11:00:00Z',
      },
    ];
    const result = computePlayableCourts(courts, blocks, now);
    expect(result.eligibilityByCourtNumber[1].eligible).toBe(false);
    expect(result.eligibilityByCourtNumber[1].reason).toBe('blocked');
    expect(result.eligibilityByCourtNumber[2].eligible).toBe(false);
    expect(result.eligibilityByCourtNumber[2].reason).toBe('occupied');
  });
});
