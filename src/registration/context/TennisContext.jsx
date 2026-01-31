/**
 * TennisContext - Centralized dependencies for Registration
 *
 * Provides:
 * - tennisService (existing via useTennisService)
 * - backend (shared TennisBackend instance)
 * - onRefresh (callback to trigger data refresh)
 *
 * WP5.3 R2: Enhanced to centralize dependencies for domain hooks.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useTennisService } from '../hooks/useTennisService.js';

const TennisContext = createContext(null);

/**
 * TennisProvider - Provides shared dependencies to all child components
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.deviceId - Device ID for tennis service
 * @param {string} props.deviceType - Device type for tennis service
 * @param {Object} props.backend - TennisBackend instance for API calls
 * @param {Function} props.onRefresh - Callback to trigger data refresh
 */
export function TennisProvider({ children, deviceId, deviceType, backend, onRefresh }) {
  const tennis = useTennisService({ deviceId, deviceType });

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // Existing: tennis service
      ...tennis,
      // New: shared dependencies for domain hooks
      backend,
      onRefresh,
    }),
    [tennis, backend, onRefresh]
  );

  return <TennisContext.Provider value={contextValue}>{children}</TennisContext.Provider>;
}

/**
 * useTennis - Access tennis service (existing API, unchanged)
 */
export function useTennis() {
  const context = useContext(TennisContext);
  if (!context) {
    throw new Error('useTennis must be used within a TennisProvider');
  }
  return context;
}

/**
 * useRegistrationDeps - Access shared dependencies for domain hooks
 *
 * Returns only the dependencies needed for extracted handlers/hooks,
 * not the full tennis service.
 */
export function useRegistrationDeps() {
  const context = useContext(TennisContext);
  if (!context) {
    throw new Error('useRegistrationDeps must be used within a TennisProvider');
  }
  const { backend, onRefresh } = context;
  return { backend, onRefresh };
}

export { TennisContext };
