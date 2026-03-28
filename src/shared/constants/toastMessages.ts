/**
 * Centralized toast messages for consistent user feedback.
 *
 * Naming conventions:
 * - Success: past tense action (COURT_ASSIGNED, GAME_UPDATED)
 * - Error: COULDN'T + action (COURT_ASSIGN_FAILED)
 * - Warning: present state (ALREADY_IN_GROUP, COURT_TAKEN)
 * - Info: directive or status (COURT_READY, WAITLIST_POSITION)
 */

// ============ ERROR ============
export const COURT_CLEAR_FAILED = `Couldn't clear court — please try again`;
export const NO_MEMBER_FOUND = `No member found`;

// ============ WARNING ============
export const ALREADY_IN_GROUP = (name) => `${name} is already in this group`;
export const ALREADY_ON_COURT = (name, n) => `${name} is already on Court ${n}`;
export const ALREADY_ON_WAITLIST = (name, n) =>
  `${name} is already on the waitlist (position ${n})`;

// ============ INFO ============
export const COURT_READY = `A court is ready for you! Tap the green button below.`;
