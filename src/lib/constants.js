/**
 * Tennis Court Registration System - Constants
 *
 * Central location for all application constants.
 * These values are shared across all modules and components.
 */

// ============================================================
// Storage Keys
// ============================================================

/**
 * LocalStorage key names used throughout the application
 */
export const STORAGE = {
  /** Main tennis club data (courts, waiting groups, etc.) */
  DATA: 'tennisClubData',
  /** Application settings */
  SETTINGS: 'tennisClubSettings',
  /** Court block schedules (reservations, maintenance, etc.) */
  BLOCKS: 'courtBlocks',
  /** Historical game records for analytics */
  HISTORICAL_GAMES: 'tennisHistoricalGames',
  /** Timestamp for cross-tab synchronization */
  UPDATE_TICK: 'tennisDataUpdateTick',
  /** Member ID mapping (normalizedName[#clubNumber] -> memberId) */
  MEMBER_ID_MAP: 'tennisMemberIdMap',
};

// ============================================================
// Event Names
// ============================================================

/**
 * Custom event names for cross-component communication
 */
export const EVENTS = {
  /** Fired when tennis data is updated */
  UPDATE: 'tennisDataUpdate',
};

// ============================================================
// Court Configuration
// ============================================================

/** Total number of courts at the club */
export const COURT_COUNT = 12;

/** Array of court numbers (1-12) */
export const COURTS = Array.from({ length: COURT_COUNT }, (_, i) => i + 1);

/** Courts in the top row of the display */
export const TOP_ROW_COURTS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Courts in the bottom row of the display */
export const BOTTOM_ROW_COURTS = [12, 11, 10, 9];

// ============================================================
// Timing Configuration
// ============================================================

/**
 * Duration and timing settings (in minutes unless otherwise specified)
 */
export const TIMING = {
  /** Duration for singles games (< 4 players) */
  SINGLES: 60,
  /** Duration for doubles games (4 players) */
  DOUBLES: 90,
  /** Maximum allowed play duration */
  MAX_PLAY: 180,
  /** Average game time for wait calculations */
  AVG_GAME: 75,
  /** Auto-clear sessions older than this (minutes) */
  AUTO_CLEAR_MIN: 180,
};

// ============================================================
// Player Configuration
// ============================================================

/**
 * Player group size constraints
 */
export const PLAYERS = {
  /** Minimum players per group */
  MIN: 1,
  /** Maximum players per group (doubles) */
  MAX: 4,
};

// ============================================================
// Display Configuration
// ============================================================

/**
 * UI display settings
 */
export const DISPLAY = {
  /** Maximum waiting groups to show in the display */
  MAX_WAITING_DISPLAY: 6,
  /** Maximum autocomplete suggestions */
  MAX_AUTOCOMPLETE_RESULTS: 8,
  /** Maximum frequent partners to show */
  MAX_FREQUENT_PARTNERS: 6,
};

// ============================================================
// Time Slots
// ============================================================

/**
 * Available time slots for scheduling (30-minute intervals)
 */
export const TIME_SLOTS = [
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
];

// ============================================================
// Schema Version
// ============================================================

/** Current data schema version (bump when structure changes) */
export const SCHEMA_VERSION = 1;

// ============================================================
// Combined APP Config (for backward compatibility)
// ============================================================

/**
 * Combined application configuration object
 * @deprecated Use individual exports instead
 */
export const APP = {
  COURT_COUNT,
  PLAYERS,
  DURATION_MIN: {
    SINGLES: TIMING.SINGLES,
    DOUBLES: TIMING.DOUBLES,
    MAX: TIMING.MAX_PLAY,
  },
};
