/**
 * Legacy back-compat adapter for Storage functions
 * Maps ESM storage functions to IIFE window.Tennis.Storage shape
 *
 * Delete this file when <script src="shared/storage.js"> is removed from HTML files
 */

import {
  readJSON,
  writeJSON,
  readDataSafe,
  getEmptyData,
  deepFreeze,
  listAllKeys,
  readDataClone,
} from '../lib/storage';
import { STORAGE } from '../lib/constants';

// ============================================================
// KEYS object - matches IIFE shape exactly
// ============================================================

const KEYS = {
  DATA: STORAGE.DATA,
  SETTINGS: STORAGE.SETTINGS,
  BLOCKS: STORAGE.BLOCKS,
  HISTORICAL_GAMES: STORAGE.HISTORICAL_GAMES,
  UPDATE_TICK: STORAGE.UPDATE_TICK,
  MEMBER_ID_MAP: STORAGE.MEMBER_ID_MAP,
};

// ============================================================
// Write Guard Helpers (ported from IIFE)
// ============================================================

function countAssigned(obj: { courts?: Array<{ current?: unknown }> } | null | undefined): number {
  return (obj?.courts || []).filter((c) => !!c?.current).length;
}

function hasFutureCurrent(obj: { courts?: Array<{ current?: { endTime?: string } | null }> } | null | undefined, now: Date): boolean {
  return (obj?.courts || []).some((c) => {
    const end = c?.current?.endTime ? new Date(c.current.endTime) : null;
    return end && !isNaN(end.getTime()) && end > now;
  });
}

// ============================================================
// Guarded writeJSON
// ============================================================

/**
 * WriteJSON with guard to prevent overwriting active courts with empty snapshot
 * @param {string} key - Storage key
 * @param {any} value - Value to write
 * @returns {boolean|Object} True if written, or current data if skipped
 */
function guardedWriteJSON(key: string, value: unknown): unknown {
  try {
    if (key === KEYS.DATA) {
      const now = new Date();
      const current = readDataSafe();
      const currAssigned = countAssigned(current as { courts?: Array<{ current?: unknown }> });
      const nextAssigned = countAssigned(value as { courts?: Array<{ current?: unknown }> });

      // Core guard: don't overwrite active courts with an empty snapshot
      // EXCEPT when this is a legitimate clearCourt operation (marked with __clearCourtOperation flag)
      const valObj = value as Record<string, unknown>;
      const isClearCourtOp = value && valObj.__clearCourtOperation === true;
      if (
        currAssigned > 0 &&
        nextAssigned === 0 &&
        hasFutureCurrent(current as { courts?: Array<{ current?: { endTime?: string } | null }> }, now) &&
        !isClearCourtOp
      ) {
        console.warn(
          '[StorageGuard] Skip DATA overwrite: candidate has assigned=0 but live data has active courts with future end times'
        );
        // Nudge listeners to recompute with current data (no state loss)
        try {
          const Events = typeof window !== 'undefined' ? window.Tennis?.Events : null;
          if (Events?.emitDom) {
            Events.emitDom('DATA_UPDATED', { key, data: current });
            Events.emitDom('tennisDataUpdate', { key, data: current });
          }
        } catch {
          // Ignore event emission errors
        }
        return current;
      }

      // Monotonic update tick (helps future freshness checks)
      const currTick = readJSON(KEYS.UPDATE_TICK) || 0;
      const incomingTick = (value && valObj.__tick) || 0;
      const newTick = Math.max(currTick + 1, Date.now(), incomingTick);

      const res = writeJSON(key, value);
      writeJSON(KEYS.UPDATE_TICK, newTick);
      return res;
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.warn('[StorageGuard] guard error:', errMsg);
  }
  return writeJSON(key, value);
}

// ============================================================
// Legacy Storage Object
// ============================================================

const legacyStorage = {
  // Key constants
  KEYS,

  // Alias (IIFE exposes both)
  STORAGE: { ...KEYS },

  // Core functions
  readJSON,
  writeJSON: guardedWriteJSON,
  readDataSafe,
  getEmptyData,

  // Deep freeze helper
  deepFreeze,

  // List all keys
  listAllKeys,

  // Read data clone (for mutations)
  readDataClone,
};

// ============================================================
// Attach to window.Tennis.Storage
// ============================================================

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Storage = legacyStorage;
}

export { legacyStorage, KEYS };
