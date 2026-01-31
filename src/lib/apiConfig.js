/**
 * API Configuration
 *
 * Supabase credentials are sourced from environment via runtimeConfig.
 * Device/admin/mobile context is derived from window.location at access-time.
 *
 * @module apiConfig
 */

import { DEVICES } from './config.js';
import { getSupabaseConfig } from '../config/runtimeConfig.js';

// =============================================================================
// URL Context Detection (runtime, not module init)
// =============================================================================

/**
 * Detect if running in mobile context (evaluated per-call)
 * Mobile context = embedded in Mobile.html or view=mobile query param
 * @returns {boolean}
 */
export function getIsMobile() {
  if (typeof window === 'undefined') return false;

  // Check if running inside Mobile.html iframe
  if (window.__mobileFlow === true) return true;

  // Check URL for view=mobile query param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'mobile') return true;

  // Check if parent window is Mobile.html shell
  try {
    if (window.parent !== window && window.parent.document?.title?.includes('Mobile')) {
      return true;
    }
  } catch {
    // Cross-origin access denied - may be in an iframe
  }

  return false;
}

/**
 * Detect if running in admin context (evaluated per-call)
 * Admin context = URL contains /admin/
 * @returns {boolean}
 */
export function getIsAdmin() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.includes('/admin/');
}

/**
 * Get device context at request time
 * Priority: Admin > Mobile > Kiosk (default)
 * @returns {{ deviceId: string, deviceType: 'admin' | 'mobile' | 'kiosk' }}
 */
export function getDeviceContext() {
  const isAdmin = getIsAdmin();
  const isMobile = getIsMobile();

  if (isAdmin) {
    return { deviceId: DEVICES.ADMIN_ID, deviceType: 'admin' };
  }
  if (isMobile) {
    return { deviceId: DEVICES.MOBILE_ID, deviceType: 'mobile' };
  }
  return { deviceId: DEVICES.KIOSK_ID, deviceType: 'kiosk' };
}

// =============================================================================
// API_CONFIG (preserve shape; compute dynamic fields at access time)
// =============================================================================

function computeApiConfig() {
  const supabase = getSupabaseConfig();
  const { deviceId, deviceType } = getDeviceContext();
  const IS_MOBILE = getIsMobile();
  const IS_ADMIN = getIsAdmin();

  return {
    SUPABASE_URL: supabase.url,
    BASE_URL: supabase.baseUrl,
    ANON_KEY: supabase.anonKey,
    IS_MOBILE,
    IS_ADMIN,
    DEVICE_ID: deviceId,
    DEVICE_TYPE: deviceType,
  };
}

/**
 * API Configuration object
 * NOTE: No caching because IS_ADMIN/IS_MOBILE/DEVICE_* depend on current URL.
 */
export const API_CONFIG = new Proxy(
  {},
  {
    get(_, prop) {
      return computeApiConfig()[prop];
    },
    ownKeys() {
      return Object.keys(computeApiConfig());
    },
    getOwnPropertyDescriptor(_, prop) {
      const config = computeApiConfig();
      if (prop in config) {
        return { enumerable: true, configurable: true, value: config[prop] };
      }
      return undefined;
    },
  }
);

// =============================================================================
// ENDPOINTS (preserve export name and keys exactly as previously defined)
// =============================================================================

export const ENDPOINTS = {
  // Mutations
  ASSIGN_COURT: '/assign-court',
  END_SESSION: '/end-session',
  CREATE_BLOCK: '/create-block',
  CANCEL_BLOCK: '/cancel-block',
  JOIN_WAITLIST: '/join-waitlist',
  CANCEL_WAITLIST: '/cancel-waitlist',
  ASSIGN_FROM_WAITLIST: '/assign-from-waitlist',
  REMOVE_FROM_WAITLIST: '/remove-from-waitlist',
  UPDATE_SETTINGS: '/update-system-settings',
  EXPORT_TRANSACTIONS: '/export-transactions',
  AI_ASSISTANT: '/ai-assistant',
  PURCHASE_BALLS: '/purchase-balls',

  // Read-only
  GET_BOARD: '/get-board',
  GET_COURT_STATUS: '/get-court-status', // Legacy, use GET_BOARD instead
  GET_WAITLIST: '/get-waitlist', // Legacy, use GET_BOARD instead
  GET_MEMBERS: '/get-members',
  GET_SETTINGS: '/get-settings',
  GET_SESSION_HISTORY: '/get-session-history',
  GET_TRANSACTIONS: '/get-transactions',
  GET_BLOCKS: '/get-blocks',
  GET_ANALYTICS: '/get-analytics',
  GET_USAGE_ANALYTICS: '/get-usage-analytics',
  GET_USAGE_COMPARISON: '/get-usage-comparison',
  GET_FREQUENT_PARTNERS: '/get-frequent-partners',
};
