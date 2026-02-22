/**
 * mobileModalUtils — pure function tests
 *
 * Tests getTitle, getModalClass, formatMobileNamesModal, compareRosterEntries.
 * All functions are pure (no React, no DOM, no side effects).
 */

import { describe, it, expect } from 'vitest';
import {
  getTitle,
  getModalClass,
  formatMobileNamesModal,
  compareRosterEntries,
} from '../../../../src/courtboard/mobile/mobileModalUtils.js';

// ============================================================
// A) getTitle
// ============================================================

describe('getTitle', () => {
  it('returns "Court Conditions" for court-conditions type', () => {
    expect(getTitle('court-conditions')).toBe('Court Conditions');
  });

  it('returns "Member Roster" for roster type', () => {
    expect(getTitle('roster')).toBe('Member Roster');
  });

  it('returns "Reserved Courts" for reserved type', () => {
    expect(getTitle('reserved')).toBe('Reserved Courts');
  });

  it('returns "Waitlist" for waitlist type', () => {
    expect(getTitle('waitlist')).toBe('Waitlist');
  });

  it('returns "Clear Court N?" for clear-court-confirm with payload', () => {
    expect(getTitle('clear-court-confirm', { courtNumber: 5 })).toBe('Clear Court 5?');
  });

  it('returns "Clear Court ?" when clear-court-confirm has no courtNumber', () => {
    expect(getTitle('clear-court-confirm')).toBe('Clear Court ?');
    expect(getTitle('clear-court-confirm', {})).toBe('Clear Court ?');
  });

  it('returns "Court Available!" for waitlist-available type', () => {
    expect(getTitle('waitlist-available')).toBe('Court Available!');
  });

  it('returns empty string for unknown type', () => {
    expect(getTitle('unknown')).toBe('');
  });

  it('returns empty string for null/undefined type', () => {
    expect(getTitle(null)).toBe('');
    expect(getTitle(undefined)).toBe('');
  });
});

// ============================================================
// B) getModalClass
// ============================================================

describe('getModalClass', () => {
  it('returns court-conditions-full for court-conditions', () => {
    expect(getModalClass('court-conditions')).toBe(' modal-court-conditions-full');
  });

  it('returns court-conditions-full for roster (same class as conditions)', () => {
    expect(getModalClass('roster')).toBe(' modal-court-conditions-full');
  });

  it('returns reserved-large for reserved', () => {
    expect(getModalClass('reserved')).toBe(' modal-reserved-large');
  });

  it('returns waitlist-large for waitlist', () => {
    expect(getModalClass('waitlist')).toBe(' modal-waitlist-large');
  });

  it('returns clear-court-confirm class', () => {
    expect(getModalClass('clear-court-confirm')).toBe(' modal-clear-court-confirm');
  });

  it('returns waitlist-available class', () => {
    expect(getModalClass('waitlist-available')).toBe(' modal-waitlist-available');
  });

  it('returns empty string for unknown type', () => {
    expect(getModalClass('unknown')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(getModalClass(null)).toBe('');
    expect(getModalClass(undefined)).toBe('');
  });
});

// ============================================================
// C) formatMobileNamesModal
// ============================================================

describe('formatMobileNamesModal', () => {
  // --- null/empty ---

  it('returns "Group" for null', () => {
    expect(formatMobileNamesModal(null)).toBe('Group');
  });

  it('returns "Group" for undefined', () => {
    expect(formatMobileNamesModal(undefined)).toBe('Group');
  });

  it('returns "Group" for empty array', () => {
    expect(formatMobileNamesModal([])).toBe('Group');
  });

  // --- single name (one word) ---

  it('returns single-word name as-is', () => {
    expect(formatMobileNamesModal(['Bob'])).toBe('Bob');
  });

  // --- single name (first + last) ---

  it('formats "John Smith" as "J. Smith"', () => {
    expect(formatMobileNamesModal(['John Smith'])).toBe('J. Smith');
  });

  // --- suffix handling ---

  it('handles Jr. suffix: "John Smith Jr." → "J. Smith Jr."', () => {
    expect(formatMobileNamesModal(['John Smith Jr.'])).toBe('J. Smith Jr.');
  });

  it('handles Sr. suffix: "John Smith Sr." → "J. Smith Sr."', () => {
    expect(formatMobileNamesModal(['John Smith Sr.'])).toBe('J. Smith Sr.');
  });

  it('handles III suffix: "John Smith III" → "J. Smith III"', () => {
    expect(formatMobileNamesModal(['John Smith III'])).toBe('J. Smith III');
  });

  it('handles II suffix: "John Smith II" → "J. Smith II"', () => {
    expect(formatMobileNamesModal(['John Smith II'])).toBe('J. Smith II');
  });

  it('handles IV suffix: "John Smith IV" → "J. Smith IV"', () => {
    expect(formatMobileNamesModal(['John Smith IV'])).toBe('J. Smith IV');
  });

  it('suffix with only 2 tokens is treated as last name (not suffix)', () => {
    // "Bob Jr." → tokens = ["Bob", "Jr."], length 2, SUFFIXES.has("Jr.") but tokens.length <= 2
    // Falls to else: lastName = "Jr.", remainder = ["Bob"], first = "Bob"
    expect(formatMobileNamesModal(['Bob Jr.'])).toBe('B. Jr.');
  });

  // --- multiple names ---

  it('shows "+1" for 2 names', () => {
    expect(formatMobileNamesModal(['John Smith', 'Jane Doe'])).toBe('J. Smith +1');
  });

  it('shows "+2" for 3 names', () => {
    expect(formatMobileNamesModal(['John Smith', 'Jane Doe', 'Bob Jones'])).toBe('J. Smith +2');
  });

  it('shows "+3" for 4 names', () => {
    expect(formatMobileNamesModal(['Alice Brown', 'B', 'C', 'D'])).toBe('A. Brown +3');
  });

  // --- whitespace handling ---

  it('collapses multiple spaces', () => {
    expect(formatMobileNamesModal(['John   Smith'])).toBe('J. Smith');
  });

  it('trims leading/trailing whitespace', () => {
    expect(formatMobileNamesModal(['  John Smith  '])).toBe('J. Smith');
  });

  // --- three-word names without suffix ---

  it('formats "Alex de Minaur" as "A. Minaur"', () => {
    // tokens = ["Alex", "de", "Minaur"], last = "Minaur", not suffix → lastName = "Minaur"
    expect(formatMobileNamesModal(['Alex de Minaur'])).toBe('A. Minaur');
  });

  // --- three-word names with suffix ---

  it('formats "Robert Smith III" as "R. Smith III"', () => {
    expect(formatMobileNamesModal(['Robert Smith III'])).toBe('R. Smith III');
  });
});

// ============================================================
// D) compareRosterEntries
// ============================================================

describe('compareRosterEntries', () => {
  it('sorts alphabetically by last name', () => {
    const list = [{ name: 'John Zeta' }, { name: 'Jane Alpha' }, { name: 'Bob Mid' }];
    const sorted = [...list].sort(compareRosterEntries);
    expect(sorted.map((e) => e.name)).toEqual(['Jane Alpha', 'Bob Mid', 'John Zeta']);
  });

  it('sorts by full name when last names match', () => {
    const list = [{ name: 'Zara Smith' }, { name: 'Alice Smith' }, { name: 'Mike Smith' }];
    const sorted = [...list].sort(compareRosterEntries);
    expect(sorted.map((e) => e.name)).toEqual(['Alice Smith', 'Mike Smith', 'Zara Smith']);
  });

  it('is case-insensitive', () => {
    const list = [{ name: 'john ZETA' }, { name: 'Jane alpha' }];
    const sorted = [...list].sort(compareRosterEntries);
    expect(sorted.map((e) => e.name)).toEqual(['Jane alpha', 'john ZETA']);
  });

  it('uses fullName as fallback when name is missing', () => {
    const list = [{ fullName: 'John Zeta' }, { fullName: 'Jane Alpha' }];
    const sorted = [...list].sort(compareRosterEntries);
    expect(sorted.map((e) => e.fullName)).toEqual(['Jane Alpha', 'John Zeta']);
  });

  it('handles missing name and fullName gracefully', () => {
    const list = [{ name: 'John Smith' }, {}, { fullName: 'Alice Brown' }];
    const sorted = [...list].sort(compareRosterEntries);
    // Empty name → last name is empty string → sorts first
    expect(sorted[0]).toEqual({});
    expect(sorted[1].fullName || sorted[1].name).toBeTruthy();
  });

  it('handles single-word names (last name = the word)', () => {
    const list = [{ name: 'Zed' }, { name: 'Alice' }];
    const sorted = [...list].sort(compareRosterEntries);
    expect(sorted.map((e) => e.name)).toEqual(['Alice', 'Zed']);
  });

  it('returns 0 for identical entries', () => {
    expect(compareRosterEntries({ name: 'John Smith' }, { name: 'John Smith' })).toBe(0);
  });

  it('returns negative when a < b', () => {
    expect(compareRosterEntries({ name: 'Jane Alpha' }, { name: 'John Zeta' })).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(compareRosterEntries({ name: 'John Zeta' }, { name: 'Jane Alpha' })).toBeGreaterThan(0);
  });

  it('prefers name over fullName when both present', () => {
    const a = { name: 'John Zeta', fullName: 'John Alpha' };
    const b = { name: 'Jane Mid' };
    const sorted = [...[a, b]].sort(compareRosterEntries);
    // a uses name "John Zeta" (last=Zeta), b uses "Jane Mid" (last=Mid)
    expect(sorted[0].name).toBe('Jane Mid');
    expect(sorted[1].name).toBe('John Zeta');
  });
});
