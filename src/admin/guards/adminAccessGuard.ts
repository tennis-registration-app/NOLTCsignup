/**
 * Admin access guard — auth-ready seam.
 *
 * Current behavior: always allows access (test/development mode).
 * Production behavior: when VITE_ADMIN_ACCESS_MODE=authenticated,
 * this guard will check Supabase Auth session and redirect to login.
 *
 * Integration point: wrap admin App.jsx render in this guard.
 * See docs/OPERATIONS.md "Admin Access Control" for deployment modes.
 */
import { featureFlags } from '../../config/runtimeConfig';

/**
 * Check whether admin access is allowed under the current mode.
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkAdminAccess() {
  const mode = featureFlags.ADMIN_ACCESS_MODE;

  if (mode === 'open') {
    return { allowed: true };
  }

  if (mode === 'authenticated') {
    // TODO: Check Supabase Auth session here.
    // For now, allow access and log warning.
    console.warn(
      '[admin-guard] ADMIN_ACCESS_MODE=authenticated but auth not yet implemented. Allowing access.'
    );
    return { allowed: true };
  }

  // Unknown mode — fail open with warning
  console.warn(`[admin-guard] Unknown ADMIN_ACCESS_MODE: "${mode}". Allowing access.`);
  return { allowed: true };
}

/**
 * React wrapper for use in admin App.jsx.
 * Currently a passthrough. Will become an auth gate in production.
 *
 * Usage:
 *   const access = useAdminAccess();
 *   if (!access.allowed) return <LoginRedirect />;
 */
export function useAdminAccess() {
  return checkAdminAccess();
}
