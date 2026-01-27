import { describe, it, expect } from 'vitest';
import { DataValidation } from '../../../src/lib/DataValidation.js';

describe('DataValidation.isValidPlayer', () => {
  it('returns true for valid player with id and name', () => {
    const player = { id: '123', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns true for player with numeric id', () => {
    const player = { id: 123, name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns true for player with UUID id', () => {
    const player = { id: '4f3a4213-4c17-44e1-aeea-1ac0276bcfa2', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(true);
  });

  it('returns false when id is missing', () => {
    const player = { name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns false when name is missing', () => {
    const player = { id: '123' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns false when name is empty string', () => {
    const player = { id: '123', name: '   ' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });

  it('returns falsy for null/undefined player', () => {
    expect(DataValidation.isValidPlayer(null)).toBeFalsy();
    expect(DataValidation.isValidPlayer(undefined)).toBeFalsy();
  });

  it('returns false when id is empty string', () => {
    const player = { id: '', name: 'John Doe' };
    expect(DataValidation.isValidPlayer(player)).toBe(false);
  });
});

describe('DataValidation.isValidGroup', () => {
  it('returns true for empty group (allowed for blocked courts)', () => {
    expect(DataValidation.isValidGroup([])).toBe(true);
  });

  it('returns true for group with 1 player', () => {
    const group = [{ id: '1', name: 'Player A' }];
    expect(DataValidation.isValidGroup(group)).toBe(true);
  });

  it('returns true for group with 4 players', () => {
    const group = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
    ];
    expect(DataValidation.isValidGroup(group)).toBe(true);
  });

  it('returns false for group with more than 4 players', () => {
    const group = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
      { id: '5', name: 'E' },
    ];
    expect(DataValidation.isValidGroup(group)).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(DataValidation.isValidGroup(null)).toBe(false);
    expect(DataValidation.isValidGroup(undefined)).toBe(false);
    expect(DataValidation.isValidGroup('not an array')).toBe(false);
  });

  it('returns false if any player is invalid', () => {
    const group = [
      { id: '1', name: 'Valid' },
      { name: 'Missing ID' }, // invalid
    ];
    expect(DataValidation.isValidGroup(group)).toBe(false);
  });
});

describe('DataValidation.isValidCourtNumber', () => {
  it('returns true for valid court numbers (1-12)', () => {
    expect(DataValidation.isValidCourtNumber(1)).toBe(true);
    expect(DataValidation.isValidCourtNumber(6)).toBe(true);
    expect(DataValidation.isValidCourtNumber(12)).toBe(true);
  });

  it('returns false for court number 0', () => {
    expect(DataValidation.isValidCourtNumber(0)).toBe(false);
  });

  it('returns false for negative court numbers', () => {
    expect(DataValidation.isValidCourtNumber(-1)).toBe(false);
  });

  it('returns false for court numbers > 12', () => {
    expect(DataValidation.isValidCourtNumber(13)).toBe(false);
  });

  it('returns false for non-integer values', () => {
    expect(DataValidation.isValidCourtNumber(1.5)).toBe(false);
    expect(DataValidation.isValidCourtNumber('1')).toBe(false);
  });
});

describe('DataValidation.isValidDuration', () => {
  it('returns true for valid durations', () => {
    expect(DataValidation.isValidDuration(30)).toBe(true);
    expect(DataValidation.isValidDuration(60)).toBe(true);
    expect(DataValidation.isValidDuration(120)).toBe(true);
  });

  it('returns false for 0 duration', () => {
    expect(DataValidation.isValidDuration(0)).toBe(false);
  });

  it('returns false for negative duration', () => {
    expect(DataValidation.isValidDuration(-30)).toBe(false);
  });

  it('returns false for duration over 240 minutes', () => {
    expect(DataValidation.isValidDuration(241)).toBe(false);
  });
});

describe('DataValidation.isValidDate', () => {
  it('returns true for valid Date objects', () => {
    expect(DataValidation.isValidDate(new Date())).toBe(true);
    expect(DataValidation.isValidDate(new Date('2024-01-15T10:00:00Z'))).toBe(true);
  });

  it('returns false for invalid Date objects', () => {
    expect(DataValidation.isValidDate(new Date('invalid'))).toBe(false);
  });

  it('returns false for non-Date values', () => {
    expect(DataValidation.isValidDate('2024-01-15')).toBe(false);
    expect(DataValidation.isValidDate(1705312800000)).toBe(false);
    expect(DataValidation.isValidDate(null)).toBe(false);
  });
});
