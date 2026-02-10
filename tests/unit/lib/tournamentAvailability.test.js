import { describe, it, expect } from 'vitest';
import { computeRegistrationCourtSelection } from '../../../src/shared/courts/overtimeEligibility.js';

describe('Tournament — overtimeEligibility', () => {
  it('excludes tournament overtime courts from fallback', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: false, isTournament: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
      { number: 3, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: true },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.fallbackOvertimeCourts.map((c) => c.number)).toContain(2);
    expect(result.fallbackOvertimeCourts.map((c) => c.number)).not.toContain(3);
  });

  it('includes non-tournament overtime courts in fallback', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.fallbackOvertimeCourts.map((c) => c.number)).toContain(1);
  });

  it('excludes blocked overtime courts from fallback', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: true, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.fallbackOvertimeCourts).toHaveLength(0);
  });

  it('shows overtime courts when no primary courts available', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: false, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.primaryCourts).toHaveLength(0);
    expect(result.showingOvertimeCourts).toBe(true);
    expect(result.fallbackOvertimeCourts).toHaveLength(1);
  });

  it('does not show overtime when primary courts exist', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.primaryCourts).toHaveLength(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('tournament courts are never in primary available courts', () => {
    // Tournament courts are occupied, not available
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: false, isTournament: true },
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.primaryCourts.map((c) => c.number)).not.toContain(1);
    expect(result.primaryCourts.map((c) => c.number)).toContain(2);
  });

  it('handles null court entries gracefully', () => {
    const courts = [
      null,
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
      null,
      { number: 4, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.primaryCourts).toHaveLength(1);
    expect(result.fallbackOvertimeCourts).toHaveLength(1);
  });

  it('returns empty arrays when no courts provided', () => {
    const result = computeRegistrationCourtSelection([]);

    expect(result.primaryCourts).toHaveLength(0);
    expect(result.fallbackOvertimeCourts).toHaveLength(0);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns empty arrays when courts is null', () => {
    const result = computeRegistrationCourtSelection(null);

    expect(result.primaryCourts).toHaveLength(0);
    expect(result.fallbackOvertimeCourts).toHaveLength(0);
  });
});
