/**
 * Browser Bridge - Global exports for non-bundled scripts
 *
 * This file handles window.* assignments for plain JS files that can't use ES imports.
 * Used by: mobile-fallback-bar.js
 *
 * Keep this separate from pure domain modules to maintain testability.
 */

import * as CourtAvailability from '../shared/courts/courtAvailability.js';

// Export CourtAvailability for mobile-fallback-bar.js
if (typeof window !== 'undefined') {
  window.CourtAvailability = CourtAvailability;
}
