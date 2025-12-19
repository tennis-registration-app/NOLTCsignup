// NOLTC Backend API Configuration
export const API_CONFIG = {
  // Supabase project URL (for Realtime connections)
  SUPABASE_URL: 'https://dncjloqewjubodkoruou.supabase.co',

  // Edge Functions base URL
  BASE_URL: 'https://dncjloqewjubodkoruou.supabase.co/functions/v1',

  // Anonymous key for public access
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuY2psb3Fld2p1Ym9ka29ydW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDc4MTEsImV4cCI6MjA4MTYyMzgxMX0.JwK7d01-MH57UD80r7XD2X3kv5W5JFBZecmXsrAiTP4',

  // Device configuration for this client
  // In production, each device would have its own ID
  DEVICE_ID: 'a0000000-0000-0000-0000-000000000001',  // Test Kiosk
  DEVICE_TYPE: 'kiosk',  // kiosk | passive_display | admin | mobile
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

  // Read-only
  GET_COURT_STATUS: '/get-court-status',
  GET_WAITLIST: '/get-waitlist',
  GET_MEMBERS: '/get-members',
  GET_SETTINGS: '/get-settings',
  GET_SESSION_HISTORY: '/get-session-history',
  GET_TRANSACTIONS: '/get-transactions',
};
