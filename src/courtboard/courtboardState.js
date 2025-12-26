/**
 * Courtboard State Bridge
 * =======================
 *
 * PURPOSE:
 * Provides a standardized accessor for Courtboard React state from non-React code
 * (mobile-bridge.js, mobile-fallback-bar.js, sync-promotions.js, MobileModalSheet).
 *
 * This bridge exists because the mobile modal is rendered in a separate React tree
 * and cannot access the main Courtboard component's state directly.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        DATA FLOW ARCHITECTURE                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   API (get-board)  ──►  TennisQueries  ──►  React State (main.jsx)         │
 * │                                                    │                        │
 * │                                                    ▼                        │
 * │                                         window.CourtboardState              │
 * │                                           (written by useEffect)            │
 * │                                                    │                        │
 * │                         ┌──────────────────────────┼──────────────────┐     │
 * │                         ▼                          ▼                  ▼     │
 * │               mobile-fallback-bar.js      mobile-bridge.js    MobileModal   │
 * │                         │                          │                  │     │
 * │                         └──────────────────────────┴──────────────────┘     │
 * │                                         │                                   │
 * │                              getCourtboardState()                           │
 * │                              (READ-ONLY accessor)                           │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * CONTRACT:
 *
 * WRITER (exactly one):
 *   - main.jsx useEffect: Syncs React state to window.CourtboardState on every
 *     state change. This is the ONLY code that should write to this object.
 *
 * READERS:
 *   - mobile-fallback-bar.js: Button state, modal payloads
 *   - mobile-bridge.js: Tap-to-register validation
 *   - sync-promotions.js: Waitlist promotion calculations
 *   - MobileModalSheet: Waitlist wait time calculations
 *
 * GUARANTEED FIELDS:
 *   - courts: Array<CourtState> - Current court occupancy from API
 *   - courtBlocks: Array<Block> - Court reservations/blocks
 *   - waitingGroups: Array<WaitlistEntry> - Current waitlist
 *   - timestamp: number - Last update time (for staleness detection)
 *
 * INITIALIZATION:
 *   - Before React renders, getCourtboardState() returns empty defaults
 *   - Use isCourtboardStateReady() to check if state has been populated
 *   - First population occurs after initial getBoard() API call completes
 *
 * DO NOT:
 *   - Write to window.CourtboardState from anywhere except main.jsx
 *   - Read from localStorage for tennis state - use this bridge instead
 *   - Use this as a replacement for proper React props/state within React components
 *   - Depend on this in Admin or Kiosk apps (they have their own state)
 */

/**
 * Get the current Courtboard state (read-only).
 * Returns default empty state if React hasn't initialized yet.
 *
 * @returns {{ courts: Array, courtBlocks: Array, waitingGroups: Array, timestamp?: number }}
 */
export function getCourtboardState() {
  return window.CourtboardState ?? {
    courts: [],
    courtBlocks: [],
    waitingGroups: [],
  };
}

/**
 * Check if Courtboard state has been initialized by React.
 * Useful for graceful degradation in edge cases.
 *
 * @returns {boolean}
 */
export function isCourtboardStateReady() {
  return !!(window.CourtboardState && window.CourtboardState.timestamp);
}

// Also expose on window for plain JS files that can't use ES modules
if (typeof window !== 'undefined') {
  window.getCourtboardState = getCourtboardState;
  window.isCourtboardStateReady = isCourtboardStateReady;
}
