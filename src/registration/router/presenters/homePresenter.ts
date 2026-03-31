/**
 * HomeScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by HomeScreen.
 *
 * Extracted from HomeRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, GroupPlayer, Handlers, WaitlistEntrySummary, RegistrationConstants } from '../../../types/appTypes.js';

/** Workflow-owned fields that buildHomeActions reads. */
export interface HomeWorkflow {
  groupGuest: {
    setCurrentGroup: (group: GroupPlayer[]) => void;
  };
  memberIdentity: {
    setMemberNumber: (v: string) => void;
  };
  setHasWaitlistPriority: (v: boolean) => void;
  setCurrentWaitlistEntryId: (v: string | null) => void;
}

export interface HomeModel {
  // Search functionality (read-only)
  searchInput: string;
  showSuggestions: boolean;
  isSearching: boolean;
  effectiveSearchInput: string;
  getAutocompleteSuggestions: import('../../../types/appTypes').SearchState['getAutocompleteSuggestions'];
  // CTA state
  canFirstGroupPlay: boolean;
  canSecondGroupPlay: boolean;
  firstWaitlistEntry: WaitlistEntrySummary | null;
  secondWaitlistEntry: WaitlistEntrySummary | null;
  firstWaitlistEntryData: WaitlistEntrySummary | null;
  secondWaitlistEntryData: WaitlistEntrySummary | null;
  canPassThroughGroupPlay: boolean;
  passThroughEntry: WaitlistEntrySummary | null;
  passThroughEntryData: WaitlistEntrySummary | null;
  // UI state
  showAlert: boolean;
  alertMessage: string;
  isMobileView: boolean;
  CONSTANTS: RegistrationConstants;
}

export interface HomeActions {
  // Search setters
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  // Navigation
  setCurrentScreen: import('../../../types/appTypes').RegistrationSetters['setCurrentScreen'];
  setCurrentGroup: (group: GroupPlayer[]) => void;
  setMemberNumber: (v: string) => void;
  setHasWaitlistPriority: (v: boolean) => void;
  setCurrentWaitlistEntryId: ((v: string | null) => void) | undefined;
  // Callbacks
  handleSuggestionClick: (suggestion: import('../../../types/appTypes').AutocompleteSuggestion) => Promise<void>;
  markUserTyping: () => void;
  findMemberNumber: (playerId: string) => string;
  // Clear court
  onClearCourtClick: () => void;
}

/**
 * Build the model (data) props for HomeScreen
 */
export function buildHomeModel(app: AppState): HomeModel {
  // Destructure from app (verbatim from HomeRoute)
  const { search, derived, alert, CONSTANTS } = app;
  const {
    searchInput,
    showSuggestions,
    isSearching,
    effectiveSearchInput,
    getAutocompleteSuggestions,
  } = search;
  const {
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntry,
    secondWaitlistEntry,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    canPassThroughGroupPlay,
    passThroughEntry,
    passThroughEntryData,
    isMobileView,
  } = derived;
  const { showAlert, alertMessage } = alert;

  return {
    // Search functionality (read-only)
    searchInput,
    showSuggestions,
    isSearching,
    effectiveSearchInput,
    getAutocompleteSuggestions,
    // CTA state
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntry,
    secondWaitlistEntry,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    canPassThroughGroupPlay,
    passThroughEntry,
    passThroughEntryData,
    // UI state
    showAlert,
    alertMessage,
    isMobileView,
    CONSTANTS,
  };
}

/**
 * Build the actions (callback/setter) props for HomeScreen.
 *
 * Workflow-owned setters come from the `workflow` parameter (WorkflowContext).
 * Shell/global fields come from `app` and `handlers`.
 */
export function buildHomeActions(app: AppState, workflow: HomeWorkflow, handlers: Handlers): HomeActions {
  // Workflow fields from context
  const { setCurrentGroup } = workflow.groupGuest;
  const { setMemberNumber } = workflow.memberIdentity;
  const { setHasWaitlistPriority, setCurrentWaitlistEntryId } = workflow;

  // Shell fields from app
  const { search, setters } = app;
  const { setSearchInput, setShowSuggestions } = search;
  const { setCurrentScreen } = setters;

  // Destructure from handlers (verbatim from HomeRoute)
  const { handleSuggestionClick, markUserTyping, findMemberNumber, checkLocationAndProceed } =
    handlers;

  return {
    // Search setters
    setSearchInput,
    setShowSuggestions,
    // Navigation
    setCurrentScreen,
    setCurrentGroup,
    setMemberNumber,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    // Callbacks
    handleSuggestionClick,
    markUserTyping,
    findMemberNumber,
    // Clear court (wrapped callback)
    onClearCourtClick: () => {
      checkLocationAndProceed(() => setCurrentScreen('clearCourt', 'homeClearCourtClick'));
    },
  };
}
