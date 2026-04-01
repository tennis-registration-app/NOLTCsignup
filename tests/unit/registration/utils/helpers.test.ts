import { describe, it, expect } from 'vitest';
import { normalizeName, findEngagementFor, validateGuestName } from '../../../../src/registration/utils/helpers.js';

// ── normalizeName ──────────────────────────────────────────────
describe('normalizeName', () => {
  it('normalizes a plain string', () => {
    expect(normalizeName('John Doe')).toBe('john doe');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeName('  John   Doe  ')).toBe('john doe');
  });

  it('extracts .name from object', () => {
    expect(normalizeName({ name: 'Alice Smith' })).toBe('alice smith');
  });

  it('extracts .fullName from object', () => {
    expect(normalizeName({ fullName: 'Bob Jones' })).toBe('bob jones');
  });

  it('extracts .playerName from object', () => {
    expect(normalizeName({ playerName: 'Charlie Brown' })).toBe('charlie brown');
  });

  it('prefers .name over .fullName and .playerName', () => {
    expect(normalizeName({ name: 'A', fullName: 'B', playerName: 'C' })).toBe('a');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(normalizeName('')).toBe('');
  });

  it('handles numeric input via toString', () => {
    expect(normalizeName(42)).toBe('42');
  });

  it('handles object with no recognized name keys', () => {
    // Falls through to the object itself → toString → "[object Object]"
    expect(normalizeName({ id: 1 })).toBe('[object object]');
  });
});

// ── findEngagementFor ──────────────────────────────────────────
describe('findEngagementFor', () => {
  const makeData = ({ courts = [], waitlist = [] }: { courts?: any[], waitlist?: any[] } = {}): any => ({ courts, waitlist });

  it('returns null when player is not found', () => {
    const data = makeData({
      courts: [{ session: { group: { players: ['Alice'] } } }],
    });
    expect(findEngagementFor('Bob', data)).toBeNull();
  });

  it('finds a player on court by string name', () => {
    const data = makeData({
      courts: [{ session: { group: { players: ['John Doe'] } } }],
    });
    expect(findEngagementFor('john doe', data)).toEqual({ type: 'playing', court: 1 });
  });

  it('finds a player on a later court', () => {
    const data = makeData({
      courts: [
        { session: { group: { players: ['Alice'] } } },
        { session: { group: { players: ['Bob'] } } },
      ],
    });
    expect(findEngagementFor('Bob', data)).toEqual({ type: 'playing', court: 2 });
  });

  it('finds a player by .name property', () => {
    const data = makeData({
      courts: [{ session: { group: { players: [{ name: 'Jane Smith' }] } } }],
    });
    expect(findEngagementFor('jane smith', data)).toEqual({ type: 'playing', court: 1 });
  });

  it('finds a player by .displayName property', () => {
    const data = makeData({
      courts: [{ session: { group: { players: [{ displayName: 'Jane Smith' }] } } }],
    });
    expect(findEngagementFor('jane smith', data)).toEqual({ type: 'playing', court: 1 });
  });

  it('finds a player on waitlist', () => {
    const data = makeData({
      waitlist: [{ group: { players: ['Eve'] } }],
    });
    expect(findEngagementFor('Eve', data)).toEqual({ type: 'waitlist', position: 1 });
  });

  it('finds player on waitlist by .name', () => {
    const data = makeData({
      waitlist: [
        { group: { players: ['Other'] } },
        { group: { players: [{ name: 'Target' }] } },
      ],
    });
    expect(findEngagementFor('target', data)).toEqual({ type: 'waitlist', position: 2 });
  });

  it('finds player on waitlist by .displayName', () => {
    const data = makeData({
      waitlist: [{ group: { players: [{ displayName: 'Found Me' }] } }],
    });
    expect(findEngagementFor('found me', data)).toEqual({ type: 'waitlist', position: 1 });
  });

  it('prefers court match over waitlist', () => {
    const data = makeData({
      courts: [{ session: { group: { players: ['Both'] } } }],
      waitlist: [{ group: { players: ['Both'] } }],
    });
    expect(findEngagementFor('Both', data)).toEqual({ type: 'playing', court: 1 });
  });

  it('handles null/undefined data gracefully', () => {
    expect(findEngagementFor('Anyone', null)).toBeNull();
    expect(findEngagementFor('Anyone', undefined)).toBeNull();
    expect(findEngagementFor('Anyone', {})).toBeNull();
  });

  it('handles courts with no session', () => {
    const data = makeData({ courts: [{ session: null }, {}] });
    expect(findEngagementFor('Ghost', data)).toBeNull();
  });

  it('handles courts with empty players array', () => {
    const data = makeData({
      courts: [{ session: { group: { players: [] } } }],
    });
    expect(findEngagementFor('Nobody', data)).toBeNull();
  });

  it('handles waitlist entries with no group or players', () => {
    const data = makeData({
      waitlist: [{ group: null }, { group: { players: null } }, {}],
    });
    expect(findEngagementFor('Ghost', data)).toBeNull();
  });

  it('accepts object name input for lookup', () => {
    const data = makeData({
      courts: [{ session: { group: { players: ['John Doe'] } } }],
    });
    expect(findEngagementFor({ name: 'John Doe' }, data)).toEqual({ type: 'playing', court: 1 });
  });
});

// ── validateGuestName ──────────────────────────────────────────
describe('validateGuestName', () => {
  it('returns true for a first and last name', () => {
    expect(validateGuestName('John Doe')).toBe(true);
  });

  it('returns true for three-word names', () => {
    expect(validateGuestName('Mary Jane Watson')).toBe(true);
  });

  it('returns false for a single word', () => {
    expect(validateGuestName('John')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateGuestName('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(validateGuestName('   ')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(validateGuestName(null)).toBe(false);
    expect(validateGuestName(undefined)).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(validateGuestName(123)).toBe(false);
    expect(validateGuestName({})).toBe(false);
  });

  it('handles names with extra whitespace', () => {
    expect(validateGuestName('  John   Doe  ')).toBe(true);
  });
});
