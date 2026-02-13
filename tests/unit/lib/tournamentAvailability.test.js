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

    // Only non-tournament overtime court should be selectable
    const selectableNumbers = result.selectableCourts.map((sc) => sc.number);
    expect(selectableNumbers).toContain(2);
    expect(selectableNumbers).not.toContain(3);
  });

  it('includes non-tournament overtime courts in fallback', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.selectableCourts.map((sc) => sc.number)).toContain(1);
  });

  it('excludes blocked overtime courts from fallback', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: true, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    expect(result.selectableCourts).toHaveLength(0);
  });

  it('shows overtime courts when no primary courts available', () => {
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: false, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    // No free courts, so overtime becomes selectable
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(1);
    expect(result.selectableCourts[0].reason).toBe('overtime_fallback');
    expect(result.showingOvertimeCourts).toBe(true);
  });

  it('does not show overtime when primary courts exist', () => {
    const courts = [
      { number: 1, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
      { number: 2, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    // Only free court is selectable
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(1);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('tournament courts are never in primary available courts', () => {
    // Tournament courts are occupied, not available
    const courts = [
      { number: 1, isAvailable: false, isBlocked: false, isOvertime: false, isTournament: true },
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    const selectableNumbers = result.selectableCourts.map((sc) => sc.number);
    expect(selectableNumbers).not.toContain(1);
    expect(selectableNumbers).toContain(2);
  });

  it('handles null court entries gracefully', () => {
    const courts = [
      null,
      { number: 2, isAvailable: true, isBlocked: false, isOvertime: false, isTournament: false },
      null,
      { number: 4, isAvailable: false, isBlocked: false, isOvertime: true, isTournament: false },
    ];

    const result = computeRegistrationCourtSelection(courts);

    // Free court is selectable, overtime is not (because free court exists)
    expect(result.selectableCourts).toHaveLength(1);
    expect(result.selectableCourts[0].number).toBe(2);
  });

  it('returns empty arrays when no courts provided', () => {
    const result = computeRegistrationCourtSelection([]);

    expect(result.selectableCourts).toHaveLength(0);
    expect(result.showingOvertimeCourts).toBe(false);
  });

  it('returns empty arrays when courts is null', () => {
    const result = computeRegistrationCourtSelection(null);

    expect(result.selectableCourts).toHaveLength(0);
  });
});
