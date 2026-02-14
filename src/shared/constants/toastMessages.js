/**
 * Centralized toast messages for consistent user feedback.
 *
 * Naming conventions:
 * - Success: past tense action (COURT_ASSIGNED, GAME_UPDATED)
 * - Error: COULDN'T + action (COURT_ASSIGN_FAILED)
 * - Warning: present state (ALREADY_IN_GROUP, COURT_TAKEN)
 * - Info: directive or status (COURT_READY, WAITLIST_POSITION)
 */

// ============ SUCCESS ============
export const COURT_ASSIGNED = (n) => `Assigned to Court ${n}`;
export const WAITLIST_JOINED = (n) => `Added to waitlist (position ${n})`;
export const COURT_CLEARED = (n) => `Court ${n} cleared`;
export const DEFERRED_SUCCESS = `Staying on waitlist for full-time court`;
export const DEFERRED_NOTIFIED = `You'll be notified when a full-time court is available`;
export const COURT_MOVED = (from, to) => `Moved from Court ${from} to Court ${to}`;
export const GAME_UPDATED = `Game updated`;
export const LOCATION_VERIFIED = `Location verified! You can now register.`;

// ============ ERROR ============
export const COURT_ASSIGN_FAILED = `Couldn't assign court — please try again`;
export const COURT_CLEAR_FAILED = `Couldn't clear court — please try again`;
export const COURT_NOT_FOUND = `Court not found — please refresh and try again`;
export const WAITLIST_JOIN_FAILED = `Couldn't join waitlist — please try again`;
export const DEFER_FAILED = `Couldn't defer — please try again`;
export const NO_MEMBER_FOUND = `No member found`;
export const MOVE_FAILED = `Couldn't move court — please try again`;
export const GAME_SAVE_FAILED = `Couldn't save game — please try again`;
export const BACKEND_UNAVAILABLE = `Backend not available`;

// ============ WARNING ============
export const ALREADY_IN_GROUP = (name) => `${name} is already in this group`;
export const ALREADY_ON_COURT = (name, n) => `${name} is already on Court ${n}`;
export const ALREADY_ON_WAITLIST = (name, n) =>
  `${name} is already on the waitlist (position ${n})`;
export const COURT_TAKEN = `This court was just taken — refreshing`;
export const ALREADY_REGISTERED = (n) => `You're already registered on Court ${n}`;
export const CLUB_CLOSED = `The club is closed today`;
export const COURT_UNAVAILABLE = `Please select an available court`;

// ============ INFO ============
export const COURT_READY = `A court is ready for you! Tap the green button below.`;
export const WAITLIST_POSITION = (n, m) => `You're #${n} in line — estimated wait: ${m} min`;
