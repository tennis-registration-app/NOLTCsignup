/**
 * Runtime Configuration - Single Source of Truth
 *
 * All environment-dependent config consolidated here.
 * Supabase credentials come from Vite env vars.
 * Feature flags can be overridden via env vars.
 *
 * @module runtimeConfig
 */

// =============================================================================
// Environment Detection (Vite built-ins)
// =============================================================================

export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;
export const MODE = import.meta.env.MODE;

// =============================================================================
// Supabase Configuration (lazy validation - throws only when called)
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Get Supabase configuration. Throws if required env vars are missing.
 * @returns {{ url: string, anonKey: string, baseUrl: string }}
 */
export function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[runtimeConfig] Missing required env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. ' +
        'See docs/ENVIRONMENT.md for setup.'
    );
  }
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    baseUrl: `${SUPABASE_URL}/functions/v1`,
  };
}

// =============================================================================
// Feature Flags (defaults preserve current behavior)
// =============================================================================

export const featureFlags = {
  /** Use real AI assistant (default: true - current behavior) */
  USE_REAL_AI: import.meta.env.VITE_USE_REAL_AI !== 'false',

  /** Enable wet court functionality (default: true - current behavior) */
  ENABLE_WET_COURTS: import.meta.env.VITE_ENABLE_WET_COURTS !== 'false',

  /** Enable debug logging (default: false - current behavior) */
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
};

// =============================================================================
// Logging Configuration (placeholder for WP-HR2)
// =============================================================================

export const LOG_LEVELS = Object.freeze({
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
});

export const loggingConfig = {
  level: featureFlags.DEBUG_MODE ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
  levels: LOG_LEVELS,
};

// =============================================================================
// Consolidated Export
// =============================================================================

export const runtimeConfig = {
  getSupabaseConfig,
  features: featureFlags,
  logging: loggingConfig,
  env: {
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    mode: MODE,
  },
};

export default runtimeConfig;
