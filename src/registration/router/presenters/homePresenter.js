// @ts-check
/**
 * HomeScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by HomeScreen.
 *
 * Extracted from HomeRoute.jsx — maintains exact prop mapping.
 */

/**
 * Build the model (data) props for HomeScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @returns {Object} Model props for HomeScreen
 */
export function buildHomeModel(app) {
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
 * Build the actions (callback/setter) props for HomeScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @returns {Object} Action props for HomeScreen
 */
export function buildHomeActions(app, handlers) {
  // Destructure from app (verbatim from HomeRoute)
  const { search, setters, memberIdentity, groupGuest } = app;
  const { setSearchInput, setShowSuggestions } = search;
  const { setCurrentScreen, setHasWaitlistPriority, setCurrentWaitlistEntryId } = setters;
  const { setMemberNumber } = memberIdentity;
  const { setCurrentGroup } = groupGuest;

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
