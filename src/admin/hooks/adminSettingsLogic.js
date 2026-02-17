/**
 * @fileoverview Pure settings logic for admin panel.
 * All functions are side-effect free and receive dependencies via deps object.
 * This enables direct unit testing without React hooks.
 */

import { logger } from '../../lib/logger.js';
import {
  normalizeOperatingHours,
  normalizeOverrides,
  normalizeSettings,
} from '../../lib/normalize/index.js';

/**
 * Default pricing values (fallback when API returns null/undefined)
 */
const PRICING_DEFAULTS = {
  TENNIS_BALLS: 5.0,
  GUEST_FEE_WEEKDAY: 15.0,
  GUEST_FEE_WEEKEND: 20.0,
};

/**
 * Transform raw API settings response to UI-friendly shape.
 * Uses normalizeSettings at boundary, then converts cents to dollars.
 * @param {Object} apiSettings - Raw settings from backend (snake_case)
 * @returns {Object} Transformed settings object (dollars, nested structure)
 */
export function transformSettings(apiSettings) {
  const normalized = normalizeSettings(apiSettings);
  return {
    tennisBallPrice: normalized?.ballPriceCents
      ? normalized.ballPriceCents / 100
      : PRICING_DEFAULTS.TENNIS_BALLS,
    guestFees: {
      weekday: normalized?.guestFeeWeekdayCents
        ? normalized.guestFeeWeekdayCents / 100
        : PRICING_DEFAULTS.GUEST_FEE_WEEKDAY,
      weekend: normalized?.guestFeeWeekendCents
        ? normalized.guestFeeWeekendCents / 100
        : PRICING_DEFAULTS.GUEST_FEE_WEEKEND,
    },
  };
}

/**
 * Load all settings data from API and localStorage.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.backend - Backend API client
 * @param {Object} deps.dataStore - Local storage abstraction
 * @param {Object} deps.TENNIS_CONFIG - Config constants
 * @param {Function} deps.onError - Error handler (receives message string)
 * @returns {Promise<Object>} { blockTemplates, settings, operatingHours, hoursOverrides }
 */
export async function loadSettingsData(deps) {
  const { backend, dataStore, TENNIS_CONFIG, onError } = deps;

  try {
    // Invalidate cache for fresh data
    if (dataStore?.cache) {
      dataStore.cache.delete(TENNIS_CONFIG.STORAGE.KEY);
      dataStore.cache.delete('courtBlocks');
    }

    // Load templates from localStorage
    let blockTemplates = null;
    if (dataStore) {
      const templates = await dataStore.get(TENNIS_CONFIG.STORAGE.BLOCK_TEMPLATES_KEY);
      if (templates) {
        blockTemplates = templates;
      }
    }

    // Load system settings from API
    const settingsResult = await backend.admin.getSettings();

    if (settingsResult.ok) {
      const settings = transformSettings(settingsResult.settings);
      const operatingHours = normalizeOperatingHours(settingsResult.operating_hours);
      const hoursOverrides = normalizeOverrides(settingsResult.upcoming_overrides);

      return { blockTemplates, settings, operatingHours, hoursOverrides };
    }

    // API returned ok:false but didn't throw
    return { blockTemplates, settings: null, operatingHours: null, hoursOverrides: null };
  } catch (error) {
    logger.error('AdminApp', 'Failed to load data', error);
    onError('Failed to load data');
    return { blockTemplates: null, settings: null, operatingHours: null, hoursOverrides: null };
  }
}

/**
 * Update ball price via API.
 * Pure function — returns result, does NOT call showNotification.
 * The hook wrapper is responsible for UI feedback.
 *
 * @param {Object} backend - Backend API client
 * @param {number} newPrice - New price in dollars
 * @returns {Promise<Object>} API result { ok: boolean, ... }
 */
export async function updateBallPriceApi(backend, newPrice) {
  const result = await backend.admin.updateSettings({
    settings: { ball_price_cents: Math.round(newPrice * 100) },
  });

  return result;
}

/**
 * Refresh settings from API (used after external changes).
 * Does NOT throw on failure — matches original .then() swallow behavior.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.backend - Backend API client
 * @returns {Promise<Object|null>} { settings, operatingHours, hoursOverrides } or null on failure
 */
export async function refreshSettingsApi(deps) {
  const { backend } = deps;

  try {
    const result = await backend.admin.getSettings();

    if (result.ok) {
      const settings = result.settings ? transformSettings(result.settings) : null;
      const operatingHours = normalizeOperatingHours(result.operating_hours);
      const hoursOverrides = normalizeOverrides(result.upcoming_overrides);

      return { settings, operatingHours, hoursOverrides };
    }
  } catch {
    // Matches original .then() swallow — no error propagation
  }

  return null;
}

/**
 * Refresh settings after AI-triggered changes.
 * Similar to refreshSettingsApi but only returns settings + hoursOverrides.
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.backend - Backend API client
 * @returns {Promise<Object|null>} { settings, hoursOverrides } or null on failure
 */
export async function refreshAISettingsApi(deps) {
  const { backend } = deps;

  try {
    const res = await backend.admin.getSettings();

    if (res.ok) {
      const settings = res.settings ? transformSettings(res.settings) : null;
      const hoursOverrides = normalizeOverrides(res.upcoming_overrides);

      return { settings, hoursOverrides };
    }
  } catch {
    // Matches original async/await pattern — no error propagation
  }

  return null;
}
