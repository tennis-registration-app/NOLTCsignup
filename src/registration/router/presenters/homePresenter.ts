/**
 * HomeScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by HomeScreen.
 *
 * Extracted from HomeRoute.jsx — maintains exact prop mapping.
 */

import type { AppState, Handlers } from '../../../types/appTypes.js';

export interface HomeModel {
  // Search functionality (read-only)
  searchInput: string;
  showSuggestions: boolean;
  isSearching: boolean;
  effectiveSearchInput: string;
  getAutocompleteSuggestions: Function;
  // CTA state
  canFirstGroupPlay: boolean;
  canSecondGroupPlay: boolean;
  firstWaitlistEntry: any;
  secondWaitlistEntry: any;
  firstWaitlistEntryData: any;
  secondWaitlistEntryData: any;
  canPassThroughGroupPlay: boolean;
  passThroughEntry: any;
  passThroughEntryData: any;
  // UI state
  showAlert: boolean;
  alertMessage: string;
  isMobileView: boolean;
  CONSTANTS: any;
}

export interface HomeActions {
  // Search setters
  setSearchInput: Function;
  setShowSuggestions: Function;
  // Navigation
  setCurrentScreen: Function;
  setCurrentGroup: Function;
  setMemberNumber: Function;
  setHasWaitlistPriority: Function;
  setCurrentWaitlistEntryId: Function;
  // Callbacks
  handleSuggestionClick: Function;
  markUserTyping: Function;
  findMemberNumber: Function;
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
 * Build the actions (callback/setter) props for HomeScreen
 */
export function buildHomeActions(app: AppState, handlers: Handlers): HomeActions {
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
