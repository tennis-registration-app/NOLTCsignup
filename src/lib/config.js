/**
 * Tennis Court Registration System - Configuration
 *
 * TENNIS_CONFIG object that combines all constants into the format
 * expected by the HTML files. This provides backward compatibility
 * while using the centralized constants.
 */

import {
  STORAGE,
  EVENTS,
  COURT_COUNT,
  TOP_ROW_COURTS,
  BOTTOM_ROW_COURTS,
  TIMING,
  PLAYERS,
  DISPLAY,
} from './constants.js';

// ============================================================
// Extended Storage Keys (beyond core STORAGE)
// ============================================================

/**
 * Additional storage keys used by specific pages
 */
export const STORAGE_EXTENDED = {
  ...STORAGE,
  /** Block scheduling templates */
  BLOCK_TEMPLATES: 'tennisBlockTemplates',
  /** Recurring block definitions */
  RECURRING_BLOCKS: 'tennisRecurringBlocks',
  /** Tennis ball purchase records */
  BALL_SALES: 'tennisBallPurchases',
  /** Analytics data */
  ANALYTICS: 'tennisAnalytics',
  /** Guest charge records */
  GUEST_CHARGES: 'tennisGuestCharges',
};

// ============================================================
// Admin Configuration
// ============================================================

/**
 * Admin access settings
 */
export const ADMIN = {
  /** Access code for admin features */
  ACCESS_CODE: '9999',
};

// ============================================================
// Device Configuration
// ============================================================

/**
 * Device IDs for backend API authentication
 */
export const DEVICES = {
  /** Kiosk device ID for standard registration operations */
  KIOSK_ID: 'a0000000-0000-0000-0000-000000000001',
  /** Admin device ID for admin-only operations */
  ADMIN_ID: 'a0000000-0000-0000-0000-000000000002',
};

// ============================================================
// Pricing Configuration
// ============================================================

/**
 * Pricing settings
 */
export const PRICING = {
  /** Tennis ball can price in dollars */
  TENNIS_BALLS: 5.00,
};

// ============================================================
// Geolocation Configuration
// ============================================================

/**
 * Geolocation settings for location-based registration
 */
export const GEOLOCATION = {
  /** Whether geolocation checking is enabled */
  ENABLED: false,
  /** Club center coordinates */
  CLUB_CENTER: {
    latitude: 29.9511,
    longitude: -90.0715,
  },
  /** Allowed radius from club center in meters */
  ALLOWED_RADIUS_METERS: 200,
  /** Message shown while checking location */
  CHECKING_MESSAGE: 'Checking your location...',
  /** Message shown when user is not at club */
  DENIAL_MESSAGE: 'You must be at the club to register for courts. Please register on the tablet at the sign in desk.',
  /** Message shown on location error */
  ERROR_MESSAGE: 'Location services required. Please register on the tablet at the sign in desk',
  /** Geolocation timeout in milliseconds */
  TIMEOUT_MS: 10000,
};

// ============================================================
// Club Hours
// ============================================================

/**
 * Club operating hours (24-hour format)
 */
export const CLUB_HOURS = {
  /** Opening hour */
  OPEN: 4,
  /** Closing hour */
  CLOSE: 22,
};

// ============================================================
// TENNIS_CONFIG - Combined Configuration Object
// ============================================================

/**
 * Combined configuration object in the format expected by HTML files.
 * This object provides backward compatibility with existing code.
 *
 * @example
 * // Access court count
 * TENNIS_CONFIG.COURTS.TOTAL_COUNT // 12
 *
 * // Access timing
 * TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN // 60
 */
export const TENNIS_CONFIG = {
  COURTS: {
    TOTAL_COUNT: COURT_COUNT,
    TOP_ROW: TOP_ROW_COURTS,
    BOTTOM_ROW: BOTTOM_ROW_COURTS,
  },
  TIMING: {
    // Duration settings
    SINGLES_DURATION_MIN: TIMING.SINGLES,
    DOUBLES_DURATION_MIN: TIMING.DOUBLES,
    MAX_PLAY_DURATION_MIN: TIMING.MAX_PLAY,
    MAX_PLAY_DURATION_MS: TIMING.MAX_PLAY * 60 * 1000,
    AVG_GAME_TIME_MIN: TIMING.AVG_GAME,
    TIMEOUT_WARNING_MIN: 180,
    // UI timing
    POLL_INTERVAL_MS: 5000,
    UPDATE_INTERVAL_MS: 1000,
    SESSION_TIMEOUT_MS: 120000,
    SESSION_WARNING_MS: 90000,
    CHANGE_COURT_TIMEOUT_SEC: 30,
    AUTO_RESET_SUCCESS_MS: 30000,
    ALERT_DISPLAY_MS: 3000,
    AUTO_RESET_CLEAR_MS: 5000,
    // Club hours
    CLUB_OPEN: CLUB_HOURS.OPEN,
    CLUB_CLOSE: CLUB_HOURS.CLOSE,
  },
  DISPLAY: {
    MAX_WAITING_DISPLAY: DISPLAY.MAX_WAITING_DISPLAY,
    MAX_AUTOCOMPLETE_RESULTS: DISPLAY.MAX_AUTOCOMPLETE_RESULTS,
    MAX_FREQUENT_PARTNERS: DISPLAY.MAX_FREQUENT_PARTNERS,
    HEADER_MARGIN_LEFT: '300px',
  },
  PLAYERS: {
    MAX_PER_GROUP: PLAYERS.MAX,
    MIN_PER_GROUP: PLAYERS.MIN,
  },
  STORAGE: {
    KEY: STORAGE.DATA,
    UPDATE_EVENT: EVENTS.UPDATE,
    SETTINGS_KEY: STORAGE.SETTINGS,
    BLOCK_TEMPLATES_KEY: STORAGE_EXTENDED.BLOCK_TEMPLATES,
    RECURRING_BLOCKS_KEY: STORAGE_EXTENDED.RECURRING_BLOCKS,
    BALL_SALES_KEY: STORAGE_EXTENDED.BALL_SALES,
    ANALYTICS_KEY: STORAGE_EXTENDED.ANALYTICS,
    GUEST_CHARGES_KEY: STORAGE_EXTENDED.GUEST_CHARGES,
  },
  ADMIN,
  DEVICES,
  PRICING,
  GEOLOCATION,
};

export default TENNIS_CONFIG;
