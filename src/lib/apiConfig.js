// NOLTC Backend API Configuration

import { DEVICES } from './config.js';

/**
 * Detect if running in mobile context
 * Mobile context = embedded in Mobile.html or view=mobile query param
 */
function detectMobileContext() {
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

const IS_MOBILE = detectMobileContext();

export const API_CONFIG = {
  // Supabase project URL (for Realtime connections)
  SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co',

  // Edge Functions base URL
  BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1',

  // Anonymous key for public access
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY2psb3Fld2p1Ym9ka29ydW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc4MTEsImV4cCI6MjA4MTYyMzgxMX0.JwK7d01-MH57UD80r7XD2X3kv5W5JFBZecmXsrAiTP4',

  // Device configuration - auto-detected based on context
  DEVICE_ID: IS_MOBILE ? DEVICES.MOBILE_ID : DEVICES.KIOSK_ID,
  DEVICE_TYPE: IS_MOBILE ? 'mobile' : 'kiosk',

  // Expose detection flag for other modules
  IS_MOBILE,
};

// Endpoint paths
export const ENDPOINTS = {
  // Mutations
  ASSIGN_COURT: '/assign-court',
  END_SESSION: '/end-session',
  CREATE_BLOCK: '/create-block',
  CANCEL_BLOCK: '/cancel-block',
  JOIN_WAITLIST: '/join-waitlist',
  CANCEL_WAITLIST: '/cancel-waitlist',
  ASSIGN_FROM_WAITLIST: '/assign-from-waitlist',
  UPDATE_SETTINGS: '/update-system-settings',
  EXPORT_TRANSACTIONS: '/export-transactions',
  AI_ASSISTANT: '/ai-assistant',

  PURCHASE_BALLS: '/purchase-balls',

  // Read-only
  GET_BOARD: '/get-board',  // Unified court + waitlist endpoint
  GET_COURT_STATUS: '/get-court-status',  // Legacy, use GET_BOARD instead
  GET_WAITLIST: '/get-waitlist',  // Legacy, use GET_BOARD instead
  GET_MEMBERS: '/get-members',
  GET_SETTINGS: '/get-settings',
  GET_SESSION_HISTORY: '/get-session-history',
  GET_TRANSACTIONS: '/get-transactions',
};
