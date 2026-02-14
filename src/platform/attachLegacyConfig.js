/**
 * Legacy back-compat adapter
 * Maps ESM config keys to IIFE window.Tennis.Config shape
 *
 * Delete this file when <script src="shared/config.js"> is removed from HTML files
 */

import { TENNIS_CONFIG } from '../lib/config.js';

const legacyConfig = {
  Courts: {
    TOTAL_COUNT: TENNIS_CONFIG.COURTS.TOTAL_COUNT,
    TOP_ROW: TENNIS_CONFIG.COURTS.TOP_ROW,
    BOTTOM_ROW: TENNIS_CONFIG.COURTS.BOTTOM_ROW,
  },
  Timing: {
    SINGLES: TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN,
    DOUBLES: TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN,
    MAX_PLAY: TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MIN,
    AVG_GAME: TENNIS_CONFIG.TIMING.AVG_GAME_TIME_MIN,
    // Matches shared/config.js value; no ESM equivalent yet
    AUTO_CLEAR_MIN: 180,
  },
  Display: {
    MAX_WAITING_DISPLAY: TENNIS_CONFIG.DISPLAY.MAX_WAITING_DISPLAY,
  },
};

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Config = legacyConfig;
}

export { legacyConfig };
