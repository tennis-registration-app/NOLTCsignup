// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
// WP5.9.4.2: Streamlined to use useRegistrationAppState and useRegistrationHandlers
/* global Tennis */
import React from 'react';

// Import registration-specific services
import { GeolocationService } from './services';

// Registration router (WP5.9.1)
import { RegistrationRouter } from './router';

// Registration state and handlers hooks (WP5.9.3, WP5.9.4)
import { useRegistrationHandlers, useRegistrationAppState } from './appHandlers';

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.GeolocationService = window.GeolocationService || GeolocationService;

// Main TennisRegistration Component
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  // Get all state, effects, hooks, and derived values
  const app = useRegistrationAppState({ isMobileView });

  // Get all handlers, passing everything they need
  const handlers = useRegistrationHandlers({
    // Services
    backend: app.services.backend,
    dataStore: app.services.dataStore,

    // Orchestrators (from orchestration layer - accessed via app)
    assignCourtToGroupOrchestrated: app.assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated: app.sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated: app.handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated: app.handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated: app.changeCourtOrchestrated,
    resetFormOrchestrated: app.resetFormOrchestrated,

    // Alert
    showAlertMessage: app.alert.showAlertMessage,
    setShowAlert: app.alert.setShowAlert,
    setAlertMessage: app.alert.setAlertMessage,

    // Mobile
    getMobileGeolocation: app.mobile.getMobileGeolocation,
    setCheckingLocation: app.mobile.setCheckingLocation,
    setGpsFailedPrompt: app.mobile.setGpsFailedPrompt,
    mobileFlow: app.mobile.mobileFlow,
    preselectedCourt: app.mobile.preselectedCourt,
    requestMobileReset: app.mobile.requestMobileReset,

    // Navigation
    setCurrentScreen: app.setters.setCurrentScreen,
    currentScreen: app.state.currentScreen,

    // Data
    data: app.state.data,
    operatingHours: app.state.operatingHours,

    // Success/assignment state
    setShowSuccess: app.setters.setShowSuccess,
    justAssignedCourt: app.courtAssignment.justAssignedCourt,
    setJustAssignedCourt: app.courtAssignment.setJustAssignedCourt,
    setAssignedSessionId: app.courtAssignment.setAssignedSessionId,
    hasAssignedCourt: app.courtAssignment.hasAssignedCourt,
    setHasAssignedCourt: app.courtAssignment.setHasAssignedCourt,
    replacedGroup: app.state.replacedGroup,
    setReplacedGroup: app.setters.setReplacedGroup,
    setDisplacement: app.setters.setDisplacement,
    setOriginalCourtData: app.setters.setOriginalCourtData,
    canChangeCourt: app.state.canChangeCourt,
    setCanChangeCourt: app.setters.setCanChangeCourt,
    setChangeTimeRemaining: app.setters.setChangeTimeRemaining,
    setIsTimeLimited: app.setters.setIsTimeLimited,
    setTimeLimitReason: app.setters.setTimeLimitReason,
    isChangingCourt: app.state.isChangingCourt,
    setIsChangingCourt: app.setters.setIsChangingCourt,
    setWasOvertimeCourt: app.setters.setWasOvertimeCourt,

    // Group state
    currentGroup: app.groupGuest.currentGroup,
    setCurrentGroup: app.groupGuest.setCurrentGroup,
    currentMemberId: app.memberIdentity.currentMemberId,
    setCurrentMemberId: app.memberIdentity.setCurrentMemberId,
    memberNumber: app.memberIdentity.memberNumber,
    setMemberNumber: app.memberIdentity.setMemberNumber,

    // Search state
    setSearchInput: app.search.setSearchInput,
    setShowSuggestions: app.search.setShowSuggestions,
    setAddPlayerSearch: app.search.setAddPlayerSearch,
    setShowAddPlayerSuggestions: app.search.setShowAddPlayerSuggestions,

    // Guest state
    guestName: app.groupGuest.guestName,
    setGuestName: app.groupGuest.setGuestName,
    guestSponsor: app.groupGuest.guestSponsor,
    setGuestSponsor: app.groupGuest.setGuestSponsor,
    showGuestForm: app.groupGuest.showGuestForm,
    setShowGuestForm: app.groupGuest.setShowGuestForm,
    setShowGuestNameError: app.groupGuest.setShowGuestNameError,
    setShowSponsorError: app.groupGuest.setShowSponsorError,
    guestCounter: app.guestCounterHook.guestCounter,
    incrementGuestCounter: app.guestCounterHook.incrementGuestCounter,

    // Add player state
    showAddPlayer: app.state.showAddPlayer,
    setShowAddPlayer: app.setters.setShowAddPlayer,

    // Waitlist state
    setHasWaitlistPriority: app.setters.setHasWaitlistPriority,
    currentWaitlistEntryId: app.state.currentWaitlistEntryId,
    setCurrentWaitlistEntryId: app.setters.setCurrentWaitlistEntryId,
    setWaitlistPosition: app.setters.setWaitlistPosition,

    // Streak state
    registrantStreak: app.streak.registrantStreak,
    setRegistrantStreak: app.streak.setRegistrantStreak,
    setShowStreakModal: app.streak.setShowStreakModal,
    streakAcknowledged: app.streak.streakAcknowledged,
    setStreakAcknowledged: app.streak.setStreakAcknowledged,

    // Clear court state
    clearCourtStep: app.clearCourtFlow.clearCourtStep,
    setSelectedCourtToClear: app.clearCourtFlow.setSelectedCourtToClear,
    setClearCourtStep: app.clearCourtFlow.setClearCourtStep,
    decrementClearCourtStep: app.clearCourtFlow.decrementClearCourtStep,

    // Admin state
    isAssigning: app.state.isAssigning,
    setIsAssigning: app.setters.setIsAssigning,
    isJoiningWaitlist: app.state.isJoiningWaitlist,
    setIsJoiningWaitlist: app.setters.setIsJoiningWaitlist,
    ballPriceInput: app.state.ballPriceInput,
    setPriceError: app.adminPriceFeedback.setPriceError,
    setCourtToMove: app.setters.setCourtToMove,

    // Refs
    successResetTimerRef: app.refs.successResetTimerRef,
    typingTimeoutRef: app.refs.typingTimeoutRef,

    // Helpers from other hooks
    fetchFrequentPartners: app.memberIdentity.fetchFrequentPartners,
    clearCache: app.memberIdentity.clearCache,
    getCourtBlockStatus: app.blockAdmin.getCourtBlockStatus,

    // Constants
    CONSTANTS: app.CONSTANTS,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
    API_CONFIG: app.API_CONFIG,

    // Utility functions
    memberDatabase: app.derived.memberDatabase,
    showPriceSuccessWithClear: app.adminPriceFeedback.showPriceSuccessWithClear,
    dbg: app.dbg,

    // Guard functions
    guardAddPlayerEarly: app.helpers.guardAddPlayerEarly,
    guardAgainstGroupDuplicate: app.helpers.guardAgainstGroupDuplicate,

    // Validation function
    validateGroupCompat: app.validateGroupCompat,

    // Functions defined in useRegistrationAppState
    markUserTyping: app.helpers.markUserTyping,
    getCourtData: app.helpers.getCourtData,
  });

  // Render the router with grouped props only (WP6.0.2b)
  return <RegistrationRouter app={app} handlers={handlers} />;
};

export default TennisRegistration;
