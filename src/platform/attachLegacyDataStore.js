/**
 * Legacy DataStore Adapter
 *
 * Attaches window.Tennis.DataStore singleton for backward compatibility
 * with non-bundled scripts that depend on the IIFE pattern.
 *
 * Dependencies: attachLegacyStorage (for Storage.writeJSON, STORAGE keys)
 *               attachLegacyEvents (for Events.emitDom)
 */

import { getDataStore } from '../lib/TennisCourtDataStore.js';

// Attach the ESM singleton to window.Tennis.DataStore
if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};

  // Only attach if not already defined (idempotent)
  if (!window.Tennis.DataStore) {
    window.Tennis.DataStore = getDataStore();
  }
}

export { getDataStore };
