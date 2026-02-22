import { useCallback } from 'react';

// Extracted handler modules
import {
  useAdminHandlers,
  useGuestHandlers,
  useGroupHandlers,
  useCourtHandlers,
  useNavigationHandlers,
} from './handlers';

// Import validation services
import { TennisBusinessLogic } from '@lib';

// Centralized handler deps builders
import {
  buildCourtHandlerDeps,
  buildGroupHandlerDeps,
  buildGuestHandlerDeps,
  buildAdminHandlerDeps,
  buildNavigationHandlerDeps,
} from './buildHandlerDeps';

/**
 * useRegistrationHandlers
 * Extracted from App.jsx
 * Refactored to accept { app }
 *
 * Contains all handler functions for the registration flow.
 * Handlers are thin wrappers around orchestrators or direct state manipulations.
 *
 * @param {{ app: import('../../types/appTypes').AppState }} params
 * @returns {import('../../types/appTypes').Handlers}
 */
export function useRegistrationHandlers({ app }) {
  const { resetFormOrchestrated } = app;

  // ===== UTILITY FUNCTIONS =====

  // Clear any pending success reset timer
  const clearSuccessResetTimer = useCallback(() => {
    if (app.refs.successResetTimerRef.current) {
      clearTimeout(app.refs.successResetTimerRef.current);
      app.refs.successResetTimerRef.current = null;
    }
  }, [app.refs.successResetTimerRef]);

  // Factory function to assemble reset deps (grouped structure)
  const createResetDeps = useCallback(
    () => ({
      actions: {
        ...app.setters,
        ...app.courtAssignment,
        ...app.groupGuest,
        ...app.memberIdentity,
        ...app.search,
        ...app.streak,
        ...app.clearCourtFlow,
      },
      services: {
        clearCache: app.memberIdentity.clearCache,
        clearSuccessResetTimer,
        refresh: () => app.services.backend.queries.refresh(),
      },
    }),
    [app, clearSuccessResetTimer]
  );

  // Reset form (moved to orchestration layer)
  // deps now assembled by createResetDeps factory
  const resetForm = useCallback(() => {
    resetFormOrchestrated(createResetDeps());
  }, [resetFormOrchestrated, createResetDeps]);

  // Check if player is already playing with detailed info
  // Note: This is used by both core handlers and groupHandlers, so it lives here
  const isPlayerAlreadyPlaying = useCallback(
    (playerId) => {
      const courtData = app.helpers.getCourtData();
      return TennisBusinessLogic.isPlayerAlreadyPlaying(
        playerId,
        courtData,
        app.groupGuest.currentGroup
      );
    },
    [app.helpers, app.groupGuest]
  );

  // ============================================
  // Court Handlers (extracted to courtHandlers.js)
  // Must be first: adminHandlers and groupHandlers depend on court outputs
  // ============================================
  const core = { clearSuccessResetTimer, resetForm, isPlayerAlreadyPlaying };
  const courtHandlers = useCourtHandlers(buildCourtHandlerDeps(app, core));

  // ============================================
  // Admin Screen Handlers (extracted to adminHandlers.js)
  // ============================================
  const adminHandlers = useAdminHandlers(buildAdminHandlerDeps(app, courtHandlers));

  // ============================================
  // Guest Handlers (extracted to guestHandlers.js)
  // ============================================
  const guestHandlers = useGuestHandlers(buildGuestHandlerDeps(app));

  // ============================================================
  // Group Handlers (extracted to groupHandlers.js)
  // ============================================================
  const groupHandlers = useGroupHandlers(buildGroupHandlerDeps(app, core, courtHandlers));

  // ============================================================
  // Navigation Handlers (extracted to navigationHandlers.js)
  // ============================================================
  const navigationHandlers = useNavigationHandlers(buildNavigationHandlerDeps(app));

  // ===== RETURN ALL HANDLERS =====
  return {
    // Admin handlers
    ...adminHandlers,
    // Guest handlers
    ...guestHandlers,
    // Group handlers
    ...groupHandlers,
    // Court handlers
    ...courtHandlers,
    // Navigation handlers
    ...navigationHandlers,
    // Core handlers (shared across modules)
    markUserTyping: app.helpers.markUserTyping,
    getCourtData: app.helpers.getCourtData,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
  };
}
