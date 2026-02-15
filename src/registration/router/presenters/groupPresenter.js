// @ts-check
/**
 * GroupScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by GroupScreen.
 *
 * Extracted from GroupRoute.jsx — maintains exact prop mapping.
 */

/**
 * Build the model (data) props for GroupScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @returns {Object} Model props for GroupScreen
 */
export function buildGroupModel(app) {
  // Destructure from app (verbatim from GroupRoute)
  const { state, groupGuest, memberIdentity, derived, alert, timeout, mobile, search, CONSTANTS } =
    app;
  const { data, showAddPlayer, availableCourts } = state;
  const { courtSelection } = data;
  const {
    currentGroup,
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
  } = groupGuest;
  const { memberNumber, frequentPartners, frequentPartnersLoading } = memberIdentity;
  const { isMobileView } = derived;
  const { showAlert, alertMessage } = alert;
  const { showTimeoutWarning } = timeout;
  const { mobileFlow, preselectedCourt } = mobile;
  const {
    searchInput,
    showSuggestions,
    effectiveSearchInput,
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    getAutocompleteSuggestions,
  } = search;

  return {
    // Data
    data,
    currentGroup,
    memberNumber,
    availableCourts,
    courtSelection,
    frequentPartners,
    frequentPartnersLoading,
    // UI state
    showAlert,
    alertMessage,
    showTimeoutWarning,
    isMobileView,
    // Mobile flow
    mobileFlow,
    preselectedCourt,
    // Search state
    searchInput,
    showSuggestions,
    effectiveSearchInput,
    // Add player state
    showAddPlayer,
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    // Guest form state
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
    // Utilities (data)
    getAutocompleteSuggestions,
    CONSTANTS,
  };
}

/**
 * Build the actions (callback) props for GroupScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @returns {Object} Action props for GroupScreen
 */
export function buildGroupActions(app, handlers) {
  // Destructure from app (verbatim from GroupRoute)
  const { state, groupGuest, search } = app;
  const { isAssigning, isJoiningWaitlist } = state;
  const { handleRemovePlayer, handleSelectSponsor, handleCancelGuest } = groupGuest;
  const {
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
  } = search;

  // Destructure from handlers (verbatim from GroupRoute)
  const {
    handleGroupSuggestionClick,
    handleAddPlayerSuggestionClick,
    handleToggleAddPlayer,
    handleToggleGuestForm,
    handleGuestNameChange,
    handleAddGuest,
    addFrequentPartner,
    handleGroupSelectCourt,
    handleGroupJoinWaitlist,
    handleGroupGoBack,
    resetForm,
    isPlayerAlreadyPlaying,
    sameGroup,
  } = handlers;

  return {
    // Callbacks (renamed to on* convention)
    onSearchChange: handleGroupSearchChange,
    onSearchFocus: handleGroupSearchFocus,
    onSuggestionClick: handleGroupSuggestionClick,
    onAddPlayerSearchChange: handleAddPlayerSearchChange,
    onAddPlayerSearchFocus: handleAddPlayerSearchFocus,
    onAddPlayerSuggestionClick: handleAddPlayerSuggestionClick,
    onToggleAddPlayer: handleToggleAddPlayer,
    onToggleGuestForm: handleToggleGuestForm,
    onRemovePlayer: handleRemovePlayer,
    onSelectSponsor: handleSelectSponsor,
    onGuestNameChange: handleGuestNameChange,
    onAddGuest: handleAddGuest,
    onCancelGuest: handleCancelGuest,
    onAddFrequentPartner: addFrequentPartner,
    onSelectCourt: handleGroupSelectCourt,
    isAssigning,
    onJoinWaitlist: handleGroupJoinWaitlist,
    joiningWaitlist: isJoiningWaitlist,
    onGoBack: handleGroupGoBack,
    onStartOver: resetForm,
    // Utilities (functions)
    isPlayerAlreadyPlaying,
    sameGroup,
  };
}
