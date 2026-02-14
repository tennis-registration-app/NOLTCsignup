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

/** @type {Record<string, string>} */
const DEV_DEFAULTS = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',
  BASE_URL: 'https://your-project.supabase.co/functions/v1',
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

  // Warn when using placeholder credentials (dev mode only)
  if (!env.PROD && config.SUPABASE_URL.includes('your-project')) {
    console.warn(
      '[Config] Using placeholder credentials. ' +
        'Copy .env.example to .env and add your Supabase credentials.'
    );
  }

  // Production: fail on placeholder or missing credentials
  if (env.PROD) {
    const problems = [];
    if (config.SUPABASE_URL.includes('your-project')) {
      problems.push('VITE_SUPABASE_URL (still placeholder)');
    }
    if (config.SUPABASE_ANON_KEY === 'your-anon-key-here') {
      problems.push('VITE_SUPABASE_ANON_KEY (still placeholder)');
    }
    for (const [key, value] of Object.entries(config)) {
      if (!value) {
        problems.push(`VITE_${key} (missing)`);
      }
    }
    if (problems.length > 0) {
      throw new Error(
        `Invalid environment configuration for production: ${problems.join(', ')}. ` +
          'See docs/ENVIRONMENT.md for required configuration.'
      );
    }
  }

  return Object.freeze(config);
}

// =============================================================================
// Legacy Exports (preserve backward compatibility during migration)
// =============================================================================

export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;
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
};

// =============================================================================
// Logging Configuration
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
  getRuntimeConfig,
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
