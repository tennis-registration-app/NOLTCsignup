/**
 * Tennis Court Registration System - Shared Library
 *
 * Main entry point for all shared utilities.
 * Import from this file for convenient access to all exports.
 *
 * @example
 * // Import everything
 * import * as Tennis from './src/lib';
 *
 * // Import specific items
 * import { STORAGE, readJSON, formatTime, TennisCourtDataStore } from './src/lib';
 */

// ============================================================
// Constants
// ============================================================

export {
  // Storage keys
  STORAGE,
  EVENTS,

  // Court configuration
  COURT_COUNT,
  COURTS,
  TOP_ROW_COURTS,
  BOTTOM_ROW_COURTS,

  // Timing configuration
  TIMING,

  // Player configuration
  PLAYERS,

  // Display configuration
  DISPLAY,

  // Time slots
  TIME_SLOTS,

  // Schema
  SCHEMA_VERSION,

  // Legacy combined config
  APP,
} from './constants.js';

// ============================================================
// Storage Utilities
// ============================================================

export {
  // Core JSON helpers
  readJSON,
  writeJSON,

  // Data shape helpers
  getEmptyData,
  normalizeData,
  normalizeDataShape,
  normalizeDataShapePure,

  // Safe data access
  readDataSafe,

  // Historical games
  getHistoricalGames,
  addHistoricalGame,
  searchHistoricalGames,

  // Waitlist promotions
  waitlistSignature,
  purgeExpiredPromotions,
  preservePromotions,
} from './storage.js';

// ============================================================
// Formatters
// ============================================================

export {
  // Time formatters
  formatTime,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatTimeRange,

  // Duration formatters
  formatTimeRemaining,
  formatDuration,

  // String formatters
  formatPhone,
  formatName,
  truncate,

  // Number formatters
  formatCurrency,
  formatNumber,

  // Court display formatters
  formatCourt,
  formatCourts,
  formatPlayerNames,
} from './formatters.js';

// ============================================================
// Data Store
// ============================================================

export {
  TennisCourtDataStore,
  broadcastEvent,
  listenForEvent,
  getDataStore,
} from './TennisCourtDataStore.js';

// ============================================================
// Court Block Utilities
// ============================================================

export {
  getCourtBlockStatus,
  getUpcomingBlockWarning,
  getUpcomingBlockWarningFromBlocks,
} from './court-blocks.js';

// ============================================================
// Configuration
// ============================================================

export {
  // Extended storage keys
  STORAGE_EXTENDED,
  // Admin settings
  ADMIN,
  // Pricing settings
  PRICING,
  // Geolocation settings
  GEOLOCATION,
  // Club hours
  CLUB_HOURS,
  // Combined config object (backward compatible)
  TENNIS_CONFIG,
} from './config.js';

// ============================================================
// Data Validation
// ============================================================

export { DataValidation } from './DataValidation.js';

// ============================================================
// Storage Adapter
// ============================================================

export { LocalStorageAdapter, storageAdapter } from './StorageAdapter.js';

// ============================================================
// Business Logic Service
// ============================================================

export { TennisBusinessLogic, tennisBusinessLogic } from './TennisBusinessLogic.js';

// TennisDataService removed - all mutations now go through API

// ============================================================
// API Adapter (Backend Integration)
// ============================================================

export { ApiAdapter } from './ApiAdapter.js';
export { API_CONFIG, ENDPOINTS } from './apiConfig.js';

// ============================================================
// Date Utilities (Central Time Conversion)
// ============================================================

export {
  formatCourtTime,
  formatDuration as formatDurationMinutes,
  minutesRemaining,
  nowCentral,
  toLocalDate,
  CLUB_TIMEZONE,
} from './dateUtils.js';

// Also export as a namespace for convenience
export { default as DateUtils } from './dateUtils.js';

// ============================================================
// Logging Utility
// ============================================================

export { logger } from './logger.js';

// ============================================================
// Domain Types and Constants
// ============================================================

export * from './types/domain.js';

// ============================================================
// Normalization (only normalizeBoard is public)
// ============================================================

export { normalizeBoard } from './normalize/index.js';

// ============================================================
// Validation Schemas
// ============================================================

export * from './schemas/index.js';

// ============================================================
// Data Access Layer
// ============================================================

export * from './api/index.js';

// ============================================================
// Domain Helpers (Pure Functions)
// ============================================================

export * from './domain/index.js';

// ============================================================
// Command DTOs (Write Path Contracts)
// ============================================================

export * from './commands/index.js';
