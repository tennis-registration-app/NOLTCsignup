/**
 * UI Preferences & Session Cache Storage — localStorage wrapper
 *
 * App layers must not call localStorage directly; enforced by ESLint (WP5-C3).
 *
 * Two namespaces with separate key sets:
 *
 * PREF_KEYS (UI preferences — persist indefinitely):
 * - 'deviceId': string
 * - 'useApi': boolean (migrated from NOLTC_USE_API)
 *
 * CACHE_KEYS (session cache — non-authoritative, safe to discard):
 * - 'guestCharges': object (migrated from tennisGuestCharges)
 * - 'ballPurchases': object (migrated from tennisBallPurchases)
 *
 * FORBIDDEN: Any domain data (courts, members, assignments, waitlist)
 *
 * NOTE: src/lib/logger.js does NOT use this module. Log level is read
 * from runtimeConfig or uses sensible defaults.
 */

const PREF_KEYS = new Set(['deviceId', 'useApi']);
const CACHE_KEYS = new Set(['guestCharges', 'ballPurchases']);

const PREF_PREFIX = 'noltc_pref_';
const CACHE_PREFIX = 'noltc_cache_';

// === UI Preferences (persistent) ===

export function getPref(key) {
  if (!PREF_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed preference key. Allowed: ${[...PREF_KEYS].join(', ')}`
    );
  }
  try {
    const raw = localStorage.getItem(`${PREF_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setPref(key, value) {
  if (!PREF_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed preference key. Allowed: ${[...PREF_KEYS].join(', ')}`
    );
  }
  localStorage.setItem(`${PREF_PREFIX}${key}`, JSON.stringify(value));
}

export function removePref(key) {
  if (!PREF_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed preference key. Allowed: ${[...PREF_KEYS].join(', ')}`
    );
  }
  localStorage.removeItem(`${PREF_PREFIX}${key}`);
}

export function clearPrefs() {
  for (const key of PREF_KEYS) {
    localStorage.removeItem(`${PREF_PREFIX}${key}`);
  }
}

// === Session Cache (non-authoritative, discardable) ===

export function getCache(key) {
  if (!CACHE_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed cache key. Allowed: ${[...CACHE_KEYS].join(', ')}`
    );
  }
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCache(key, value) {
  if (!CACHE_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed cache key. Allowed: ${[...CACHE_KEYS].join(', ')}`
    );
  }
  localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
}

export function removeCache(key) {
  if (!CACHE_KEYS.has(key)) {
    throw new Error(
      `prefsStorage: "${key}" is not an allowed cache key. Allowed: ${[...CACHE_KEYS].join(', ')}`
    );
  }
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

export function clearCache() {
  for (const key of CACHE_KEYS) {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}

// === Utility ===

export function clearAll() {
  clearPrefs();
  clearCache();
}

// === Migration helper ===
// Migrates old keys to new prefixed keys. Safe and idempotent.
// Call ONCE at application boot in a single init module.
export function migrateOldKeys() {
  const migrations = [
    // [oldKey, newKey, isPref]
    ['deviceId', 'deviceId', true],
    ['NOLTC_USE_API', 'useApi', true],
    ['tennisGuestCharges', 'guestCharges', false],
    ['tennisBallPurchases', 'ballPurchases', false],
  ];

  for (const [oldKey, newKey, isPref] of migrations) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null) {
      const prefix = isPref ? PREF_PREFIX : CACHE_PREFIX;
      const newFullKey = `${prefix}${newKey}`;
      // Only migrate if new key doesn't exist
      if (localStorage.getItem(newFullKey) === null) {
        // Special handling for NOLTC_USE_API: convert string 'true'/'false' to boolean
        if (oldKey === 'NOLTC_USE_API') {
          const boolValue = oldValue === 'true';
          localStorage.setItem(newFullKey, JSON.stringify(boolValue));
        } else {
          localStorage.setItem(newFullKey, oldValue);
        }
      }
      // Remove old key
      localStorage.removeItem(oldKey);
    }
  }
}
