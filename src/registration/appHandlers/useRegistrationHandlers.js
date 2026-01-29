import { useCallback } from 'react';

// Extracted handler modules (WP5.9.5)
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
 * Extracted from App.jsx — WP5.9.3
 *
 * Contains all handler functions for the registration flow.
 * Handlers are thin wrappers around orchestrators or direct state manipulations.
 *
 * @param {Object} deps - All dependencies needed by handlers
 * @returns {Object} - All handler functions
 */
export function useRegistrationHandlers(deps) {
  const {
    // Backend/services
    backend,
    dataStore,

    // Orchestrators (from orchestration layer)
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,

    // Alert
    showAlertMessage,
    setShowAlert,
    setAlertMessage,

    // Mobile
    getMobileGeolocation,
    setCheckingLocation,
    setGpsFailedPrompt,

    // Navigation
    setCurrentScreen,

    // Data
    data,
    operatingHours,

    // Success/assignment state
    setShowSuccess,
    justAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    hasAssignedCourt,
    setHasAssignedCourt,
    replacedGroup,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    canChangeCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    isChangingCourt,
    setIsChangingCourt,
    setWasOvertimeCourt,

    // Group state
    currentGroup,
    setCurrentGroup,
    currentMemberId,
    setCurrentMemberId,
    memberNumber,
    setMemberNumber,

    // Search state
    setSearchInput,
    setShowSuggestions,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,

    // Guest state
    guestName,
    setGuestName,
    guestSponsor,
    setGuestSponsor,
    showGuestForm,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    guestCounter,
    incrementGuestCounter,

    // Add player state
    showAddPlayer,
    setShowAddPlayer,

    // Waitlist state
    setHasWaitlistPriority,
    currentWaitlistEntryId,
    setCurrentWaitlistEntryId,
    setWaitlistPosition,

    // Streak state
    registrantStreak,
    setRegistrantStreak,
    setShowStreakModal,
    streakAcknowledged,
    setStreakAcknowledged,

    // Clear court state
    clearCourtStep,
    setSelectedCourtToClear,
    setClearCourtStep,
    decrementClearCourtStep,

    // Admin state
    isAssigning,
    setIsAssigning,
    isJoiningWaitlist,
    setIsJoiningWaitlist,
    ballPriceInput,
    setPriceError,
    setCourtToMove,

    // Refs
    successResetTimerRef,
    typingTimeoutRef,

    // Helpers from other hooks
    fetchFrequentPartners,
    clearCache,
    getCourtBlockStatus,

    // Mobile
    mobileFlow,
    preselectedCourt,
    requestMobileReset,

    // Constants
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,

    // Utility functions
    memberDatabase,
    showPriceSuccessWithClear,
    dbg,

    // Guard functions (passed from App.jsx)
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,

    // Validation function
    validateGroupCompat,

    // Functions defined in App.jsx (needed by hooks before this hook can be called)
    markUserTyping,
    getCourtData,
  } = deps;

  // ===== UTILITY FUNCTIONS =====

  // Clear any pending success reset timer
  const clearSuccessResetTimer = useCallback(() => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  }, [successResetTimerRef]);

  // Reset form (moved to orchestration layer - WP5.5)
  const resetForm = useCallback(() => {
    resetFormOrchestrated({
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setAssignedSessionId,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setIsTimeLimited,
      setCurrentScreen,
      setSearchInput,
      setShowSuggestions,
      setShowAddPlayer,
      setAddPlayerSearch,
      setShowAddPlayerSuggestions,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setSelectedCourtToClear,
      setClearCourtStep,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setCourtToMove,
      setHasAssignedCourt,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setShowGuestNameError,
      setShowSponsorError,
      setRegistrantStreak,
      setShowStreakModal,
      setStreakAcknowledged,
      clearCache,
      clearSuccessResetTimer,
    });
  }, [
    resetFormOrchestrated,
    setCurrentGroup,
    setShowSuccess,
    setMemberNumber,
    setCurrentMemberId,
    setJustAssignedCourt,
    setAssignedSessionId,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setCanChangeCourt,
    setIsTimeLimited,
    setCurrentScreen,
    setSearchInput,
    setShowSuggestions,
    setShowAddPlayer,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    setWaitlistPosition,
    setSelectedCourtToClear,
    setClearCourtStep,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCourtToMove,
    setHasAssignedCourt,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
    clearCache,
    clearSuccessResetTimer,
  ]);

  // Check if player is already playing with detailed info
  // Note: This is used by both core handlers and groupHandlers, so it lives here
  const isPlayerAlreadyPlaying = useCallback(
    (playerId) => {
      const courtData = getCourtData();
      return TennisBusinessLogic.isPlayerAlreadyPlaying(playerId, courtData, currentGroup);
    },
    [getCourtData, currentGroup]
  );

  // ============================================
  // Admin Screen Handlers (extracted to adminHandlers.js - WP5.9.5.1)
  // ============================================
  const adminHandlers = useAdminHandlers({
    backend,
    showAlertMessage,
    getCourtData,
    setCourtToMove,
    ballPriceInput,
    setPriceError,
    dataStore,
    TENNIS_CONFIG,
    showPriceSuccessWithClear,
    setCurrentScreen,
    setSearchInput,
  });

  // ============================================
  // Guest Handlers (extracted to guestHandlers.js - WP5.9.5.2)
  // ============================================
  const guestHandlers = useGuestHandlers({
    guestName,
    setGuestName,
    guestSponsor,
    setGuestSponsor,
    showGuestForm,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    guestCounter,
    incrementGuestCounter,
    currentGroup,
    setCurrentGroup,
    memberNumber,
    memberDatabase,
    showAddPlayer,
    setShowAddPlayer,
    setShowAddPlayerSuggestions,
    setAddPlayerSearch,
    markUserTyping,
    getCourtData,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
    TENNIS_CONFIG,
  });

  // ============================================
  // Court Handlers (extracted to courtHandlers.js - WP5.9.5.4)
  // ============================================
  const courtHandlers = useCourtHandlers({
    // State
    data,
    isAssigning,
    mobileFlow,
    preselectedCourt,
    operatingHours,
    currentGroup,
    currentWaitlistEntryId,
    canChangeCourt,
    justAssignedCourt,
    replacedGroup,
    isJoiningWaitlist,
    // Setters
    setIsAssigning,
    setCurrentWaitlistEntryId,
    setHasWaitlistPriority,
    setCurrentGroup,
    setJustAssignedCourt,
    setAssignedSessionId,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setHasAssignedCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowSuccess,
    setGpsFailedPrompt,
    setCurrentScreen,
    setIsJoiningWaitlist,
    setWaitlistPosition,
    // Refs
    successResetTimerRef,
    // Services
    backend,
    // Helpers
    getCourtData,
    getCourtBlockStatus,
    getMobileGeolocation,
    showAlertMessage,
    validateGroupCompat,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
    dbg,
    // Orchestrators
    assignCourtToGroupOrchestrated,
    changeCourtOrchestrated,
    sendGroupToWaitlistOrchestrated,
    // Constants
    CONSTANTS,
    API_CONFIG,
  });

  // ============================================================
  // Group Handlers (extracted to groupHandlers.js - WP5.9.5.3)
  // ============================================================
  const groupHandlers = useGroupHandlers({
    // State
    currentGroup,
    memberDatabase,
    mobileFlow,
    registrantStreak,
    streakAcknowledged,
    preselectedCourt,
    // Setters
    setCurrentGroup,
    setSearchInput,
    setShowSuggestions,
    setMemberNumber,
    setCurrentMemberId,
    setRegistrantStreak,
    setStreakAcknowledged,
    setShowStreakModal,
    setCurrentScreen,
    setAddPlayerSearch,
    setShowAddPlayer,
    setShowAddPlayerSuggestions,
    setHasWaitlistPriority,
    setAlertMessage,
    setShowAlert,
    setShowSuccess,
    // Refs
    successResetTimerRef,
    // Services
    backend,
    // Helpers
    showAlertMessage,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
    getCourtData,
    getAvailableCourts: courtHandlers.getAvailableCourts,
    saveCourtData: courtHandlers.saveCourtData,
    fetchFrequentPartners,
    assignCourtToGroup: courtHandlers.assignCourtToGroup,
    sendGroupToWaitlist: courtHandlers.sendGroupToWaitlist,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
    // Orchestrators
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    // Constants
    CONSTANTS,
    API_CONFIG,
  });

  // ============================================================
  // Navigation Handlers (extracted to navigationHandlers.js - WP5.9.5.4)
  // ============================================================
  const navigationHandlers = useNavigationHandlers({
    // State
    showGuestForm,
    showAddPlayer,
    mobileFlow,
    currentScreen: deps.currentScreen,
    clearCourtStep,
    // Setters
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    setShowAddPlayer,
    setCurrentGroup,
    setMemberNumber,
    setCurrentMemberId,
    setCurrentScreen,
    setCheckingLocation,
    // Helpers
    decrementClearCourtStep,
    requestMobileReset,
    showAlertMessage,
    // Constants
    TENNIS_CONFIG,
  });

  // ===== RETURN ALL HANDLERS =====
  return {
    // Admin handlers (extracted - WP5.9.5.1)
    ...adminHandlers,
    // Guest handlers (extracted - WP5.9.5.2)
    ...guestHandlers,
    // Group handlers (extracted - WP5.9.5.3)
    ...groupHandlers,
    // Court handlers (extracted - WP5.9.5.4)
    ...courtHandlers,
    // Navigation handlers (extracted - WP5.9.5.4)
    ...navigationHandlers,
    // Core handlers (shared across modules)
    markUserTyping,
    getCourtData,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
  };
}
