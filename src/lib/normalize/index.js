/**
 * Normalization Layer - API to Domain transformation
 *
 * ARCHITECTURAL RULE:
 * Only normalizeBoard() is exported. Components must not import
 * individual normalizers. This ensures a single transformation boundary.
 *
 * Individual normalizers are internal implementation details.
 */

export { normalizeBoard } from './normalizeBoard.js';

// Re-export for data access layer only (not for components)
// These are used by getBoard() and similar data access functions
export {
  normalizeMember,
  normalizeAccountMember,
  normalizeAccountMembers,
} from './normalizeMember.js';
export { normalizeGroup } from './normalizeGroup.js';
