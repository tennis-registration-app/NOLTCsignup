/**
 * GroupScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by GroupScreen.
 *
 * Extracted from GroupRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, CourtSelectionResult, FrequentPartner, GroupPlayer, Handlers, RegistrationConstants, RegistrationUiState } from '../../../types/appTypes.js';

export interface GroupModel {
  // Data
  data: RegistrationUiState['data'];
  currentGroup: GroupPlayer[] | null;
  memberNumber: string;
  availableCourts: number[];
  courtSelection: CourtSelectionResult;
  frequentPartners: FrequentPartner[];
  frequentPartnersLoading: boolean;
  // UI state
  showAlert: boolean;
  alertMessage: string;
  showTimeoutWarning: boolean;
  isMobileView: boolean;
  // Mobile flow
  mobileFlow: boolean;
  preselectedCourt: number | null;
  // Search state
  searchInput: string;
  showSuggestions: boolean;
  effectiveSearchInput: string;
  // Add player state
  showAddPlayer: boolean;
  addPlayerSearch: string;
  showAddPlayerSuggestions: boolean;
  effectiveAddPlayerSearch: string;
  // Guest form state
  showGuestForm: boolean;
  guestName: string;
  guestSponsor: string;
  showGuestNameError: boolean;
  showSponsorError: boolean;
  // Utilities (data)
  getAutocompleteSuggestions: Function;
  CONSTANTS: RegistrationConstants;
}

export interface GroupActions {
  // Callbacks (renamed to on* convention)
  onSearchChange: Function;
  onSearchFocus: Function;
  onSuggestionClick: Function;
  onAddPlayerSearchChange: Function;
  onAddPlayerSearchFocus: Function;
  onAddPlayerSuggestionClick: Function;
  onToggleAddPlayer: Function;
  onToggleGuestForm: Function;
  onRemovePlayer: Function;
  onSelectSponsor: Function;
  onGuestNameChange: Function;
  onAddGuest: Function;
  onCancelGuest: Function;
  onAddFrequentPartner: Function;
  onSelectCourt: Function;
  isAssigning: boolean;
  onJoinWaitlist: Function;
  joiningWaitlist: boolean;
  onGoBack: Function;
  onStartOver: Function;
  // Utilities (functions)
  isPlayerAlreadyPlaying: Function;
  sameGroup: Function;
}

/**
 * Build the model (data) props for GroupScreen
 */
export function buildGroupModel(app: AppState): GroupModel {
  // Destructure from app (verbatim from GroupRoute, migrated to players slice)
  const { state, players, derived, alert, session, mobile, search, CONSTANTS } =
    app;
  const { timeout } = session;
  const { data, showAddPlayer, availableCourts } = state;
  const { courtSelection } = data;
  const {
    currentGroup,
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
  } = players.groupGuest;
  const { memberNumber, frequentPartners, frequentPartnersLoading } = players.memberIdentity;
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
 */
export function buildGroupActions(app: AppState, handlers: Handlers): GroupActions {
  // Destructure from app (verbatim from GroupRoute)
  const { state, players, search } = app;
  const { isAssigning, isJoiningWaitlist } = state;
  const { handleRemovePlayer, handleSelectSponsor, handleCancelGuest } = players.groupGuest;
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
