/**
 * Pure utility functions extracted from MobileModalSheet.
 * No React, no DOM, no side effects.
 */

/**
 * Get modal title by type.
 * @param {string} type - Modal type
 * @param {Object} [payload] - Modal payload (used by clear-court-confirm)
 * @returns {string}
 */
export function getTitle(type, payload) {
  switch (type) {
    case 'court-conditions':
      return 'Court Conditions';
    case 'roster':
      return 'Member Roster';
    case 'reserved':
      return 'Reserved Courts';
    case 'waitlist':
      return 'Waitlist';
    case 'clear-court-confirm':
      return `Clear Court ${payload?.courtNumber || ''}?`;
    case 'waitlist-available':
      return 'Court Available!';
    default:
      return '';
  }
}

/**
 * Get modal overlay CSS class suffix by type.
 * @param {string} type - Modal type
 * @returns {string}
 */
export function getModalClass(type) {
  if (type === 'court-conditions') return ' modal-court-conditions-full';
  if (type === 'roster') return ' modal-court-conditions-full';
  if (type === 'reserved') return ' modal-reserved-large';
  if (type === 'waitlist') return ' modal-waitlist-large';
  if (type === 'clear-court-confirm') return ' modal-clear-court-confirm';
  if (type === 'waitlist-available') return ' modal-waitlist-available';
  return '';
}

/**
 * Format a list of player names for mobile display.
 * Single names returned as-is. Multi-word names formatted as "F. LastName".
 * Handles suffixes (Jr., Sr., II, III, IV).
 * Multiple names shown as "F. LastName +N".
 * @param {string[]|null|undefined} nameArray
 * @returns {string}
 */
export function formatMobileNamesModal(nameArray) {
  if (!nameArray || !nameArray.length) return 'Group';
  const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV']);
  const formatOne = (full) => {
    const tokens = full.replace(/\s+/g, ' ').trim().split(' ');
    if (tokens.length === 1) {
      // Single name (e.g., "Bob" or "Player") - return as-is, no formatting
      return tokens[0];
    }
    let last = tokens[tokens.length - 1];
    let last2 = tokens[tokens.length - 2];
    let lastName, remainder;
    if (SUFFIXES.has(last) && tokens.length > 2) {
      lastName = `${last2} ${last}`;
      remainder = tokens.slice(0, -2);
    } else {
      lastName = last;
      remainder = tokens.slice(0, -1);
    }
    const first = remainder[0] || '';
    return first ? `${first[0]}. ${lastName}` : lastName;
  };
  const primary = formatOne(nameArray[0]);
  return nameArray.length > 1 ? `${primary} +${nameArray.length - 1}` : primary;
}

/**
 * Compare two roster entries for sorting: alphabetical by last name,
 * then by full name when last names match. Case-insensitive.
 * @param {{ name?: string, fullName?: string }} a
 * @param {{ name?: string, fullName?: string }} b
 * @returns {number}
 */
export function compareRosterEntries(a, b) {
  const getLastName = (fullName) => {
    const parts = (fullName || '').trim().split(' ');
    return parts[parts.length - 1] || '';
  };
  const lastNameA = getLastName(a.name || a.fullName).toLowerCase();
  const lastNameB = getLastName(b.name || b.fullName).toLowerCase();
  if (lastNameA === lastNameB) {
    const firstNameA = (a.name || a.fullName || '').toLowerCase();
    const firstNameB = (b.name || b.fullName || '').toLowerCase();
    return firstNameA.localeCompare(firstNameB);
  }
  return lastNameA.localeCompare(lastNameB);
}
