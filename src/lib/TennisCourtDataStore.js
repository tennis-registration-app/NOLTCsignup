/**
 * Tennis Court Registration System - Data Store
 *
 * Centralized data store with caching for localStorage operations.
 * Provides consistent data access across all application views.
 */

import { STORAGE, EVENTS } from './constants.js';

/**
 * Cached localStorage data store for tennis court data
 *
 * Features:
 * - In-memory caching for fast reads
 * - Automatic cache warming on initialization
 * - Performance metrics tracking
 * - Cross-tab synchronization via custom events
 *
 * @example
 * const store = new TennisCourtDataStore();
 * const data = await store.get('tennisClubData');
 * await store.set('tennisClubData', { ...data, updated: true });
 */
export class TennisCourtDataStore {
  constructor() {
    /** @type {Map<string, any>} In-memory cache */
    this.cache = new Map();

    /** @type {Object} Performance metrics */
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalOperations: 0,
      totalResponseTime: 0,
      storageOperationsSaved: 0,
    };

    // Initialize cache immediately
    this.warmCache();
  }

  /**
   * Pre-load common keys into cache
   * Called automatically on construction
   */
  warmCache() {
    const keys = [
      STORAGE.DATA,
      STORAGE.SETTINGS,
      STORAGE.BLOCKS,
      STORAGE.UPDATE_TICK,
      STORAGE.HISTORICAL_GAMES,
    ];

    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        this.cache.set(key, JSON.parse(raw));
      } catch {
        // Ignore parse errors during warm-up
      }
    });
  }

  /**
   * Get a value from the store
   * Returns from cache if available, otherwise reads from localStorage
   *
   * @param {string} key - Storage key
   * @returns {Promise<any>} The stored value or null
   */
  async get(key) {
    const t0 = performance.now();
    this.metrics.totalOperations++;

    // Check cache first
    if (this.cache.has(key)) {
      this.metrics.cacheHits++;
      this.metrics.totalResponseTime += performance.now() - t0;
      return this.cache.get(key);
    }

    // Cache miss - read from localStorage
    this.metrics.cacheMisses++;
    const raw = localStorage.getItem(key);
    let parsed = null;

    if (raw) {
      try {
        parsed = JSON.parse(raw);
        this.cache.set(key, parsed);
      } catch {
        // Ignore parse errors
      }
    }

    this.metrics.totalResponseTime += performance.now() - t0;
    return parsed;
  }

  /**
   * Set a value in the store
   * Updates cache and optionally persists to localStorage
   *
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @param {Object} [options] - Storage options
   * @param {boolean} [options.immediate] - Force immediate localStorage write
   */
  async set(key, data, options = {}) {
    const t0 = performance.now();
    this.metrics.totalOperations++;

    // Always update cache
    this.cache.set(key, data);

    // Write to localStorage for critical keys or when immediate is requested
    if (options.immediate || key === STORAGE.DATA || key === STORAGE.BLOCKS) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }

    this.metrics.totalResponseTime += performance.now() - t0;

    // Dispatch update event for cross-component synchronization
    try {
      window.dispatchEvent(
        new CustomEvent(EVENTS.UPDATE, {
          detail: { key, data },
        })
      );
    } catch {
      // Ignore event dispatch errors
    }
  }

  /**
   * Delete a value from the store
   *
   * @param {string} key - Storage key to delete
   */
  async delete(key) {
    this.cache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear all cached data and optionally localStorage
   *
   * @param {boolean} clearStorage - Also clear localStorage (default: false)
   */
  clear(clearStorage = false) {
    this.cache.clear();
    if (clearStorage) {
      Object.values(STORAGE).forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      });
    }
  }

  /**
   * Force refresh cache from localStorage
   */
  refresh() {
    this.cache.clear();
    this.warmCache();
  }

  /**
   * Get performance metrics
   *
   * @returns {Object} Metrics including hit rate and average response time
   */
  getMetrics() {
    const total = this.metrics.totalOperations || 1;
    const avg = this.metrics.totalResponseTime / total;
    const hit = (this.metrics.cacheHits / total) * 100;

    return {
      ...this.metrics,
      avgResponseTime: +avg.toFixed(3),
      cacheHitRate: +hit.toFixed(1),
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalOperations: 0,
      totalResponseTime: 0,
      storageOperationsSaved: 0,
    };
  }
}

// ============================================================
// Event Bus Helpers
// ============================================================

/**
 * Broadcast a custom event
 * @param {string} name - Event name
 * @param {any} detail - Event detail payload
 */
export function broadcastEvent(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // Ignore event dispatch errors
  }
}

/**
 * Listen for a custom event
 * @param {string} name - Event name
 * @param {Function} handler - Event handler
 * @param {Object} opts - addEventListener options
 * @returns {Function} Cleanup function to remove listener
 */
export function listenForEvent(name, handler, opts) {
  try {
    // @ts-ignore — custom event names not in lib.dom.d.ts
    window.addEventListener(name, handler, opts);
  } catch {
    // Ignore errors
  }
  return () => {
    try {
      // @ts-ignore — custom event name
      window.removeEventListener(name, handler, opts);
    } catch {
      // Ignore errors
    }
  };
}

// ============================================================
// Singleton Instance (optional)
// ============================================================

/** Singleton instance for shared access */
let _instance = null;

/**
 * Get or create the singleton DataStore instance
 * @returns {TennisCourtDataStore} The shared instance
 */
export function getDataStore() {
  if (!_instance) {
    _instance = new TennisCourtDataStore();
  }
  return _instance;
}
