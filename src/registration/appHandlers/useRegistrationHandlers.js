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
  const {
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,
    validateGroupCompat,
    dbg,
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
  } = app;

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
  const courtHandlers = useCourtHandlers({
    state: app.state,
    setters: app.setters,
    mobile: app.mobile,
    groupGuest: app.groupGuest,
    courtAssignment: app.courtAssignment,
    services: app.services,
    helpers: app.helpers,
    blockAdmin: app.blockAdmin,
    alert: app.alert,
    refs: app.refs,
    assignCourtToGroupOrchestrated,
    changeCourtOrchestrated,
    sendGroupToWaitlistOrchestrated,
    validateGroupCompat,
    dbg,
    CONSTANTS,
    API_CONFIG,
    core: { clearSuccessResetTimer, resetForm, isPlayerAlreadyPlaying },
  });

  // ============================================
  // Admin Screen Handlers (extracted to adminHandlers.js)
  // ============================================
  const adminHandlers = useAdminHandlers({
    services: app.services,
    alert: app.alert,
    helpers: app.helpers,
    setters: app.setters,
    search: app.search,
    state: app.state,
    adminPriceFeedback: app.adminPriceFeedback,
    TENNIS_CONFIG,
    court: courtHandlers,
  });

  // ============================================
  // Guest Handlers (extracted to guestHandlers.js)
  // ============================================
  const guestHandlers = useGuestHandlers({
    groupGuest: app.groupGuest,
    guestCounterHook: app.guestCounterHook,
    memberIdentity: app.memberIdentity,
    derived: app.derived,
    setters: app.setters,
    search: app.search,
    helpers: app.helpers,
  });

  // ============================================================
  // Group Handlers (extracted to groupHandlers.js)
  // ============================================================
  const groupHandlers = useGroupHandlers({
    groupGuest: app.groupGuest,
    derived: app.derived,
    mobile: app.mobile,
    streak: app.streak,
    search: app.search,
    memberIdentity: app.memberIdentity,
    setters: app.setters,
    alert: app.alert,
    refs: app.refs,
    services: app.services,
    helpers: app.helpers,
    court: courtHandlers,
    core: { clearSuccessResetTimer, resetForm, isPlayerAlreadyPlaying },
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    CONSTANTS,
  });

  // ============================================================
  // Navigation Handlers (extracted to navigationHandlers.js)
  // ============================================================
  const navigationHandlers = useNavigationHandlers({
    state: app.state,
    setters: app.setters,
    groupGuest: app.groupGuest,
    memberIdentity: app.memberIdentity,
    mobile: app.mobile,
    clearCourtFlow: app.clearCourtFlow,
    alert: app.alert,
    TENNIS_CONFIG,
  });

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
