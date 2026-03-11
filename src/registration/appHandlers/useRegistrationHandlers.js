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

// Workflow context — handler-context injection for workflow-owned state
import { useWorkflowContext } from '../context/WorkflowProvider';

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
  const { resetFormOrchestrated, resetWorkflow } = app;

  // Workflow context — sourced directly instead of via app compatibility layer
  const workflow = useWorkflowContext();

  // ===== UTILITY FUNCTIONS =====

  // Clear any pending success reset timer
  const clearSuccessResetTimer = useCallback(() => {
    if (app.refs.successResetTimerRef.current) {
      clearTimeout(app.refs.successResetTimerRef.current);
      app.refs.successResetTimerRef.current = null;
    }
  }, [app.refs.successResetTimerRef]);

  // Factory function to assemble reset deps (shell-level only — grouped structure)
  const createResetDeps = useCallback(
    () => ({
      actions: {
        setShowSuccess: app.setters.setShowSuccess,
        setCurrentScreen: app.setters.setCurrentScreen,
        setSearchInput: app.search.setSearchInput,
        setShowSuggestions: app.search.setShowSuggestions,
        setAddPlayerSearch: app.search.setAddPlayerSearch,
        setShowAddPlayerSuggestions: app.search.setShowAddPlayerSuggestions,
      },
      services: {
        clearSuccessResetTimer,
        refresh: () => app.services.backend.queries.refresh(),
      },
    }),
    [app, clearSuccessResetTimer]
  );

  // Reset form — bumps workflow key (remounts all workflow state),
  // then runs shell-level cleanup via orchestrator.
  const resetForm = useCallback(() => {
    resetWorkflow();
    resetFormOrchestrated(createResetDeps());
  }, [resetWorkflow, resetFormOrchestrated, createResetDeps]);

  // Check if player is already playing with detailed info
  // Note: This is used by both core handlers and groupHandlers, so it lives here
  const isPlayerAlreadyPlaying = useCallback(
    (playerId) => {
      const courtData = app.helpers.getCourtData();
      return TennisBusinessLogic.isPlayerAlreadyPlaying(
        playerId,
        courtData,
        app.players.groupGuest.currentGroup ?? undefined
      );
    },
    [app.helpers, app.players.groupGuest]
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
  const navigationHandlers = useNavigationHandlers(buildNavigationHandlerDeps(app, workflow));

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
