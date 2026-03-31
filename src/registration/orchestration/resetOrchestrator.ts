/**
 * Reset Orchestrators
 *
 * After WorkflowProvider introduction (Step 1), these orchestrators only
 * handle shell-owned state. Workflow state (group, member identity, streak,
 * court assignment, 15 useState fields) resets automatically via key-based
 * remount of WorkflowProvider.
 */

import { logger } from '../../lib/logger';
import type {
  DomainBoard,
} from '../../types/appTypes.js';

// ── Shell-level reset actions (7 setters + 2 services) ──────────────

export interface ResetFormActions {
  setShowSuccess: (v: boolean) => void;
  setCurrentScreen: (screen: string, reason: string) => void;
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setAddPlayerSearch: (v: string) => void;
  setShowAddPlayerSuggestions: (v: boolean) => void;
}

export interface ResetFormServices {
  clearSuccessResetTimer: () => void;
  refresh?: () => Promise<DomainBoard>;
}

export interface ResetFormDeps {
  actions: ResetFormActions;
  services: ResetFormServices;
}

/**
 * Shell-level reset after WorkflowProvider remount.
 *
 * Workflow-owned state (group, streak, court assignment, member identity,
 * and 15 useState fields) is already reset by the key bump that triggered
 * this call. This function handles shell-level cleanup only.
 */
export async function resetFormOrchestrated(deps: ResetFormDeps): Promise<void> {
  const {
    actions: {
      setShowSuccess,
      setCurrentScreen,
      setSearchInput,
      setShowSuggestions,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
    },
    services: { clearSuccessResetTimer },
  } = deps;

  logger.info('RESET', 'resetForm() called at', new Date().toISOString());
  clearSuccessResetTimer();

  setShowSuccess(false);
  setCurrentScreen('home', 'resetForm');
  setSearchInput('');
  setShowSuggestions(false);
  setAddPlayerSearch('');
  setShowAddPlayerSuggestions(false);

  // Force-refresh board data so HomeScreen shows fresh state immediately
  if (deps.services.refresh) {
    try {
      await deps.services.refresh();
    } catch (e) {
      console.warn('[RESET] Board refresh after reset failed:', e);
    }
  }
}

// ── Inactivity timeout (shell-level only) ────────────────────────────

export interface InactivityTimeoutDeps {
  setShowSuccess: (v: boolean) => void;
  setCurrentScreen: (screen: string, reason: string) => void;
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setAddPlayerSearch: (v: string) => void;
  setShowAddPlayerSuggestions: (v: boolean) => void;
  clearSuccessResetTimer: () => void;
  refresh?: () => Promise<DomainBoard>;
}

/**
 * Shell-level cleanup for inactivity timeout.
 *
 * Workflow-owned state resets via key bump (triggered by the caller
 * before or after this function). This handles shell-level actions only.
 */
export async function applyInactivityTimeoutOrchestrated(
  deps: InactivityTimeoutDeps
): Promise<void> {
  const {
    setShowSuccess,
    setCurrentScreen,
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    clearSuccessResetTimer,
  } = deps;

  clearSuccessResetTimer();

  setShowSuccess(false);
  setCurrentScreen('home', 'sessionTimeout');
  setSearchInput('');
  setShowSuggestions(false);
  setAddPlayerSearch('');
  setShowAddPlayerSuggestions(false);

  // Force-refresh board data so HomeScreen shows fresh state immediately
  if (deps.refresh) {
    try {
      await deps.refresh();
    } catch (e) {
      console.warn('[TIMEOUT] Board refresh after inactivity timeout failed:', e);
    }
  }
}
