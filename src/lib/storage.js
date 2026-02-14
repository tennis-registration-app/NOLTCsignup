/**
 * Tennis Court Registration System - Storage Utilities
 *
 * LocalStorage helpers with JSON serialization and safe data access.
 * All functions are designed to be safe (never throw) and read-only where noted.
 */

import { STORAGE, COURT_COUNT, SCHEMA_VERSION } from './constants.js';

// ============================================================
// Core JSON Helpers
// ============================================================

/**
 * Read and parse JSON from localStorage
 * @param {string} key - LocalStorage key
 * @returns {any|null} Parsed value or null if not found/invalid
 */
export function readJSON(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Write JSON to localStorage
 * @param {string} key - LocalStorage key
 * @param {any} value - Value to serialize and store
 * @returns {boolean} True if successful, false otherwise
 */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Data Shape Helpers
// ============================================================

/**
 * Get empty data structure with defaults
 * @returns {Object} Empty data object with correct schema
 */
export function getEmptyData() {
  return {
    __schema: SCHEMA_VERSION,
    courts: Array(COURT_COUNT).fill(null),
    waitingGroups: [],
    recentlyCleared: [],
    calculatedAvailability: null,
  };
}

/**
 * Normalize loaded data to current schema (mutates and returns)
 * @param {Object|null} data - Raw data from storage
 * @returns {Object} Normalized data object
 */
export function normalizeData(data) {
  if (!data || typeof data !== 'object') return getEmptyData();
  const out = Object.assign(getEmptyData(), data);

  // Ensure courts is correct length
  if (!Array.isArray(out.courts)) {
    out.courts = Array(COURT_COUNT).fill(null);
  }
  if (out.courts.length !== COURT_COUNT) {
    const resized = Array(COURT_COUNT).fill(null);
    for (let i = 0; i < Math.min(COURT_COUNT, out.courts.length); i++) {
      resized[i] = out.courts[i];
    }
    out.courts = resized;
  }

  // Ensure arrays
  if (!Array.isArray(out.waitingGroups)) out.waitingGroups = [];
  if (!Array.isArray(out.recentlyCleared)) out.recentlyCleared = [];

  // Stamp/upgrade schema
  out.__schema = SCHEMA_VERSION;
  return out;
}

/**
 * Pure normalizer - creates a normalized copy without mutations
 * @param {Object|null} raw - Raw data
 * @returns {Object} Normalized copy
 */
export function normalizeDataShapePure(raw) {
  const data =
    raw && typeof raw === 'object'
      ? typeof structuredClone === 'function'
        ? structuredClone(raw)
        : JSON.parse(JSON.stringify(raw))
      : { courts: [], waitingGroups: [], recentlyCleared: [] };

  data.courts = Array.isArray(data.courts) ? data.courts : [];
  data.waitingGroups = Array.isArray(data.waitingGroups) ? data.waitingGroups : [];
  data.recentlyCleared = Array.isArray(data.recentlyCleared) ? data.recentlyCleared : [];

  // Ensure each court has {history:[]} (don't create .current)
  for (let i = 0; i < data.courts.length; i++) {
    const c = data.courts[i] || {};
    c.history = Array.isArray(c.history) ? c.history : [];
    data.courts[i] = c;
  }
  return data;
}

/**
 * Local normalizer for read-only shape normalization
 * @param {Object|null} data - Raw data
 * @param {number} courtsCount - Expected court count
 * @returns {Object} Normalized copy (no persistence)
 */
export function normalizeDataShape(data, courtsCount = COURT_COUNT) {
  const d = data && typeof data === 'object' ? data : {};
  const out = { ...d };
  out.courts = Array.isArray(d.courts)
    ? d.courts.slice()
    : Array.from({ length: courtsCount }, () => ({}));
  out.waitingGroups = Array.isArray(d.waitingGroups) ? d.waitingGroups.slice() : [];
  out.recentlyCleared = Array.isArray(d.recentlyCleared) ? d.recentlyCleared.slice() : [];
  return out; // No persistence here
}

// ============================================================
// Safe Data Access
// ============================================================

/**
 * Read-only data access with in-memory normalization
 * READ-ONLY GUARANTEE: This function never writes to storage
 * @param {number} courtsCount - Expected court count (default 12)
 * @returns {Object} Normalized data object
 */
export function readDataSafe(courtsCount = COURT_COUNT) {
  try {
    const raw = localStorage.getItem(STORAGE.DATA);
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Malformed JSON → treat as empty, but do not write back
      data = null;
    }

    // Build a non-mutating, normalized copy with sane defaults
    const safe = {};
    safe.courts = Array.isArray(data?.courts)
      ? data.courts
      : Array.from({ length: courtsCount }, () => ({ history: [], current: null }));

    safe.waitingGroups = Array.isArray(data?.waitingGroups) ? data.waitingGroups : [];
    safe.recentlyCleared = Array.isArray(data?.recentlyCleared) ? data.recentlyCleared : [];

    // Promotions: make present (read-only default) without mutating storage
    safe.waitlistPromotions = Array.isArray(data?.waitlistPromotions)
      ? data.waitlistPromotions
      : [];

    // Preserve any other top-level fields without mutating the source
    if (data && typeof data === 'object') {
      for (const k of Object.keys(data)) {
        if (k === 'courts' || k === 'waitingGroups' || k === 'recentlyCleared') continue;
        safe[k] = data[k];
      }
    }

    return safe;
  } catch {
    // Absolute fallback — never throw; never write
    return {
      courts: Array.from({ length: courtsCount }, () => ({ history: [], current: null })),
      waitingGroups: [],
      recentlyCleared: [],
      waitlistPromotions: [],
    };
  }
}

// ============================================================
// Historical Games
// ============================================================

/**
 * Get all historical game records
 * @returns {Array} Array of game records
 */
export function getHistoricalGames() {
  return readJSON(STORAGE.HISTORICAL_GAMES) || [];
}

/**
 * Add a game to historical records
 * @param {Object} game - Game data to record
 * @returns {Object} The saved game record with ID
 */
export function addHistoricalGame(game) {
  const games = getHistoricalGames();
  const gameRecord = {
    ...game,
    id: `${game.courtNumber}-${Date.now()}`,
    dateAdded: new Date().toISOString(),
    date: new Date(game.startTime).toISOString().split('T')[0], // YYYY-MM-DD format
  };
  games.push(gameRecord);
  writeJSON(STORAGE.HISTORICAL_GAMES, games);
  return gameRecord;
}

/**
 * Search historical games with filters
 * @param {Object} filters - Filter criteria
 * @param {number} [filters.courtNumber] - Filter by court number
 * @param {string} [filters.startDate] - Filter by start date (inclusive)
 * @param {string} [filters.endDate] - Filter by end date (inclusive)
 * @param {string} [filters.playerName] - Filter by player name (partial match)
 * @param {string} [filters.clearReason] - Filter by clear reason (exact match)
 * @returns {Array} Filtered and sorted game records (most recent first)
 */
export function searchHistoricalGames(filters = {}) {
  const games = getHistoricalGames();
  return games
    .filter((game) => {
      // Court number filter
      if (filters.courtNumber && game.courtNumber !== filters.courtNumber) return false;

      // Date range filter
      if (filters.startDate) {
        const gameDate = new Date(game.date);
        const startDate = new Date(filters.startDate);
        if (gameDate < startDate) return false;
      }
      if (filters.endDate) {
        const gameDate = new Date(game.date);
        const endDate = new Date(filters.endDate);
        if (gameDate > endDate) return false;
      }

      // Player name filter (partial match, case insensitive)
      if (filters.playerName) {
        const searchName = filters.playerName.toLowerCase();
        const hasPlayer = game.players?.some((player) =>
          player.name?.toLowerCase().includes(searchName)
        );
        if (!hasPlayer) return false;
      }

      // Clear reason filter (exact match)
      if (filters.clearReason) {
        if (game.clearReason !== filters.clearReason) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Most recent first
}

// ============================================================
// Waitlist Promotions Helpers
// ============================================================

/**
 * Generate a unique signature for a waitlist group
 * @param {Object} group - Waitlist group
 * @returns {string} Unique signature string
 */
export function waitlistSignature(group) {
  const names = Array.isArray(group?.players)
    ? group.players
        .map((p) => (p?.name ?? String(p ?? '')).trim().toLowerCase())
        .filter(Boolean)
        .sort()
    : [];
  const guests = Number(group?.guests || 0);
  return `v1|${names.join(',')}|guests:${guests}|size:${names.length + guests}`;
}

/**
 * Remove expired promotions from data
 * @param {Object} data - Data object containing waitlistPromotions
 * @param {Date} now - Current time (default: now)
 * @returns {Object} New data object with purged promotions
 */
export function purgeExpiredPromotions(data, now = new Date()) {
  const promos = Array.isArray(data?.waitlistPromotions) ? data.waitlistPromotions : [];
  const kept = promos.filter((p) => {
    try {
      return new Date(p.expiresAt) > now;
    } catch {
      return false;
    }
  });
  // Return a new data object with purged promos (non-mutating)
  return { ...(data || {}), waitlistPromotions: kept };
}

/**
 * Preserve promotions across writes unless explicitly set
 * @param {Object} prev - Previous data
 * @param {Object} next - New data
 * @returns {Object} Merged data with preserved promotions
 */
export function preservePromotions(prev, next) {
  const prevPromos = Array.isArray(prev?.waitlistPromotions) ? prev.waitlistPromotions : [];
  const nextHas = Object.prototype.hasOwnProperty.call(next || {}, 'waitlistPromotions');
  if (!nextHas) {
    return { ...(next || {}), waitlistPromotions: prevPromos };
  }
  return next || {};
}

// ============================================================
// Deep Freeze Helper
// ============================================================

/**
 * Recursively freeze an object (makes it immutable)
 * @param {any} obj - Object to freeze
 * @returns {any} The frozen object
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date || typeof obj === 'function') return obj;

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze properties
  Object.values(obj).forEach((val) => deepFreeze(val));

  return obj;
}

// ============================================================
// List All Keys
// ============================================================

/**
 * List all tennis-related localStorage keys
 * @returns {string[]} Array of matching key names
 */
export function listAllKeys() {
  const keywords = ['tennis', 'court', 'ball', 'guest', 'analytics'];
  const allKeys = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && keywords.some((keyword) => key.toLowerCase().includes(keyword))) {
        allKeys.push(key);
      }
    }
  } catch (e) {
    console.error('Error listing localStorage keys:', e);
  }

  return allKeys;
}

// ============================================================
// Read Data Clone (for mutations)
// ============================================================

/**
 * Get a mutable deep clone of the data
 * Use this for write operations that need to modify data
 * @returns {Object} Mutable clone of the data
 */
export function readDataClone() {
  const data = readJSON(STORAGE.DATA) || getEmptyData();

  // Use structuredClone if available, fallback to JSON clone
  const cloned =
    typeof structuredClone === 'function'
      ? structuredClone(data)
      : JSON.parse(JSON.stringify(data));

  // Ensure proper structure on the clone
  if (!Array.isArray(cloned.courts)) {
    cloned.courts = Array.from({ length: COURT_COUNT }, () => ({ history: [], current: null }));
  }

  // Ensure each court has proper structure
  cloned.courts = cloned.courts.map((court) =>
    court
      ? {
          history: Array.isArray(court.history) ? court.history : [],
          current: court.current || null,
          ...court,
        }
      : { history: [], current: null }
  );

  if (!Array.isArray(cloned.waitingGroups)) {
    cloned.waitingGroups = [];
  }

  if (!Array.isArray(cloned.recentlyCleared)) {
    cloned.recentlyCleared = [];
  }

  return cloned;
}
