/**
 * GroupScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by GroupScreen.
 *
 * Extracted from GroupRoute.jsx — maintains exact prop mapping.
 *
 * Workflow-owned fields (15 in model+actions) are sourced from the
 * `workflow` parameter, which GroupRoute reads directly from WorkflowContext.
 * Shell/global fields continue to come from `app`.
 */

import type { AppState, CourtSelectionResult, FrequentPartner, GroupPlayer, Handlers, RegistrationConstants, RegistrationUiState } from '../../../types/appTypes.js';

/** Workflow-owned fields that buildGroupModel and buildGroupActions read. */
export interface GroupWorkflow {
  groupGuest: {
    currentGroup: GroupPlayer[] | null;
    showGuestForm: boolean;
    guestName: string;
    guestSponsor: string;
    showGuestNameError: boolean;
    showSponsorError: boolean;
    handleRemovePlayer: Function;
    handleSelectSponsor: Function;
    handleCancelGuest: Function;
  };
  memberIdentity: {
    memberNumber: string;
    frequentPartners: FrequentPartner[];
    frequentPartnersLoading: boolean;
  };
  showAddPlayer: boolean;
  isAssigning: boolean;
  isJoiningWaitlist: boolean;
}

export interface GroupModel {
  // Data
  data: RegistrationUiState['data'];
  currentGroup: GroupPlayer[] | null;
  memberNumber: string;
  availableCourts: number[];
  courtSelection?: CourtSelectionResult;
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
 * Build the model (data) props for GroupScreen.
 *
 * Workflow-owned fields come from the `workflow` parameter (WorkflowContext).
 * Shell/global fields come from `app`.
 */
export function buildGroupModel(app: AppState, workflow: GroupWorkflow): GroupModel {
  // Shell fields from app
  const { state, derived, alert, session, mobile, search, CONSTANTS } = app;
  const { timeout } = session;
  const { data, availableCourts } = state;
  const { courtSelection } = data;
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

  // Workflow fields from context
  const {
    currentGroup,
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
  } = workflow.groupGuest;
  const { memberNumber, frequentPartners, frequentPartnersLoading } = workflow.memberIdentity;
  const { showAddPlayer } = workflow;

  return {
    // Data — workflow-sourced
    currentGroup,
    memberNumber,
    frequentPartners,
    frequentPartnersLoading,
    // Data — shell-sourced
    data,
    availableCourts,
    courtSelection,
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
    // Add player state — workflow-sourced
    showAddPlayer,
    // Add player state — shell-sourced
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    // Guest form state — workflow-sourced
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
 * Build the actions (callback) props for GroupScreen.
 *
 * Workflow-owned reads/pass-throughs come from the `workflow` parameter.
 * Shell/handler fields come from `app` and `handlers`.
 */
export function buildGroupActions(app: AppState, workflow: GroupWorkflow, handlers: Handlers): GroupActions {
  // Workflow fields from context
  const { isAssigning, isJoiningWaitlist } = workflow;
  const { handleRemovePlayer, handleSelectSponsor, handleCancelGuest } = workflow.groupGuest;

  // Shell fields from app
  const { search } = app;
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
