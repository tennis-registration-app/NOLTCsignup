// @ts-check

/**
 * Runtime configuration loader.
 *
 * - Dev/test: falls back to DEV_DEFAULTS silently (no errors).
 * - Production (env.PROD === true): throws on missing or default-valued env vars.
 *
 * Single consumer: src/lib/apiConfig.js. All other modules import from apiConfig.
 *
 * @param {Record<string, unknown>} [env=import.meta.env] - Environment object.
 *   Defaults to import.meta.env at runtime. Tests pass a plain object to avoid
 *   mutating import.meta.env (which is read-only in Vite/Vitest).
 */

// SECURITY NOTE: These are Supabase anon/public keys
// (not secrets) included for frictionless local dev.
// Acceptable for this closed club deployment.
// For public/open-source distribution, remove defaults
// and require env vars via .env file.
/** @type {Record<string, string>} */
const DEV_DEFAULTS = {
  SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY2psb3Fld2p1Ym9ka29ydW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc4MTEsImV4cCI6MjA4MTYyMzgxMX0.JwK7d01-MH57UD80r7XD2X3kv5W5JFBZecmXsrAiTP4',
  BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1',
};

/**
 * @typedef {Object} RuntimeConfig
 * @property {string} SUPABASE_URL
 * @property {string} SUPABASE_ANON_KEY
 * @property {string} BASE_URL
 */

/**
 * Returns validated, frozen runtime configuration.
 * @param {Record<string, unknown>} [env=import.meta.env] - Environment source.
 * @returns {Readonly<RuntimeConfig>}
 * @throws {Error} When env.PROD is true and any required var is missing or still default.
 */
export function getRuntimeConfig(env = import.meta.env) {
  const supabaseUrl = String(env.VITE_SUPABASE_URL || DEV_DEFAULTS.SUPABASE_URL);
  const config = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: String(env.VITE_SUPABASE_ANON_KEY || DEV_DEFAULTS.SUPABASE_ANON_KEY),
    BASE_URL: String(env.VITE_BASE_URL || `${supabaseUrl}/functions/v1`),
  };

  if (env.PROD) {
    const missing: string[] = [];
    for (const [key, value] of Object.entries(config)) {
      // Only fail if value is empty/falsy — dev defaults are valid working credentials
      if (!value) {
        missing.push(`VITE_${key}`);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production build: ${missing.join(', ')}. ` +
          'See docs/ENVIRONMENT.md for required configuration.'
      );
    }
  }

  return Object.freeze(config);
}

// =============================================================================
// Legacy Exports (preserve backward compatibility during migration)
// =============================================================================

export const MODE = import.meta.env.MODE;

/**
 * Legacy getSupabaseConfig - now wraps getRuntimeConfig for backward compat.
 * @returns {{ url: string, anonKey: string, baseUrl: string }}
 */
export function getSupabaseConfig() {
  const config = getRuntimeConfig();
  return {
    url: config.SUPABASE_URL,
    anonKey: config.SUPABASE_ANON_KEY,
    baseUrl: config.BASE_URL,
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

  /**
   * Admin access mode (default: 'open' - current behavior).
   * 'open' — no authentication, anyone with the URL can access admin.
   * 'authenticated' — requires Supabase Auth session (not yet implemented).
   * See docs/OPERATIONS.md "Admin Access Control" for deployment modes.
   */
  ADMIN_ACCESS_MODE: String(import.meta.env.VITE_ADMIN_ACCESS_MODE || 'open'),
};

// =============================================================================
// Consolidated Export
// =============================================================================

export const runtimeConfig = {
  getRuntimeConfig,
  getSupabaseConfig,
  features: featureFlags,
  logging: {
    level: featureFlags.DEBUG_MODE ? 4 /* DEBUG */ : 2 /* WARN */,
    levels: Object.freeze({ NONE: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 }),
  },
  env: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: MODE,
  },
};

export default runtimeConfig;
