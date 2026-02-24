// @ts-check

import { ErrorCategories } from './errorCategories.js';
import { DenialCodes } from '../backend/types.js';

/**
 * Maps a backend response code to an ErrorCategory.
 * Single source of truth for code → category mapping.
 *
 * Rules:
 * - CONFLICT: court/resource contention (someone else got there first)
 * - VALIDATION: bad input, missing data, business rule violation
 * - NOT_FOUND: resource doesn't exist
 * - NETWORK: connection/timeout (handled separately by ApiAdapter)
 * - AUTH: permission denied (if applicable)
 * - UNKNOWN: default fallback
 *
 * @param {string | null | undefined} code
 * @returns {import('./errorCategories.js').ErrorCategory}
 */
export function mapResponseToCategory(code) {
  switch (code) {
    // Conflict — resource contention
    case DenialCodes.COURT_OCCUPIED:
    case DenialCodes.COURT_BLOCKED:
    case DenialCodes.MEMBER_ALREADY_PLAYING:
    case DenialCodes.MEMBER_ON_WAITLIST:
    case DenialCodes.SESSION_ALREADY_ENDED:
      return ErrorCategories.CONFLICT;

    // Validation — business rules, bad input
    case DenialCodes.OUTSIDE_OPERATING_HOURS:
    case DenialCodes.OUTSIDE_GEOFENCE:
    case DenialCodes.INVALID_MEMBER:
    case DenialCodes.INVALID_REQUEST:
      return ErrorCategories.VALIDATION;

    // Not found
    case DenialCodes.COURT_NOT_FOUND:
    case DenialCodes.WAITLIST_ENTRY_NOT_FOUND:
    case DenialCodes.SESSION_NOT_FOUND:
      return ErrorCategories.NOT_FOUND;

    // Server errors
    case DenialCodes.QUERY_ERROR:
    case DenialCodes.INTERNAL_ERROR:
      return ErrorCategories.UNKNOWN;

    // Default
    default:
      return ErrorCategories.UNKNOWN;
  }
}
