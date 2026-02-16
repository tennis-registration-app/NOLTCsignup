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
  // Destructure everything from app that was previously passed as individual props
  const {
    services: { backend, dataStore },
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,
    alert: { showAlertMessage, setShowAlert, setAlertMessage },
    mobile: {
      getMobileGeolocation,
      setCheckingLocation,
      setGpsFailedPrompt,
      mobileFlow,
      preselectedCourt,
      requestMobileReset,
    },
    setters: {
      setCurrentScreen,
      setShowSuccess,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setChangeTimeRemaining,
      setIsTimeLimited,
      setTimeLimitReason,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setShowAddPlayer,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setWaitlistPosition,
      setIsAssigning,
      setIsJoiningWaitlist,
      setCourtToMove,
    },
    state: {
      currentScreen,
      data,
      operatingHours,
      replacedGroup,
      canChangeCourt,
      showAddPlayer,
      currentWaitlistEntryId,
      isAssigning,
      isJoiningWaitlist,
      ballPriceInput,
    },
    courtAssignment: {
      justAssignedCourt,
      setJustAssignedCourt,
      setAssignedSessionId,
      setAssignedEndTime,
      setHasAssignedCourt,
    },
    groupGuest: {
      currentGroup,
      setCurrentGroup,
      guestName,
      setGuestName,
      guestSponsor,
      setGuestSponsor,
      showGuestForm,
      setShowGuestForm,
      setShowGuestNameError,
      setShowSponsorError,
    },
    memberIdentity: {
      setCurrentMemberId,
      memberNumber,
      setMemberNumber,
      fetchFrequentPartners,
      clearCache,
    },
    search: { setSearchInput, setShowSuggestions, setAddPlayerSearch, setShowAddPlayerSuggestions },
    guestCounterHook: { guestCounter, incrementGuestCounter },
    streak: {
      registrantStreak,
      setRegistrantStreak,
      setShowStreakModal,
      streakAcknowledged,
      setStreakAcknowledged,
    },
    clearCourtFlow: {
      clearCourtStep,
      setSelectedCourtToClear,
      setClearCourtStep,
      decrementClearCourtStep,
    },
    adminPriceFeedback: { setPriceError, showPriceSuccessWithClear },
    refs: { successResetTimerRef },
    blockAdmin: { getCourtBlockStatus },
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    derived: { memberDatabase },
    dbg,
    helpers: { guardAddPlayerEarly, guardAgainstGroupDuplicate, markUserTyping, getCourtData },
    validateGroupCompat,
  } = app;

  // ===== UTILITY FUNCTIONS =====

  // Clear any pending success reset timer
  const clearSuccessResetTimer = useCallback(() => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  }, [successResetTimerRef]);

  // Factory function to assemble reset deps (grouped structure)
  const createResetDeps = useCallback(
    () => ({
      actions: {
        setCurrentGroup,
        setShowSuccess,
        setMemberNumber,
        setCurrentMemberId,
        setJustAssignedCourt,
        setAssignedSessionId,
        setAssignedEndTime,
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
      },
      services: {
        clearCache,
        clearSuccessResetTimer,
        refresh: () => backend.queries.refresh(),
      },
    }),
    [
      setCurrentGroup,
      setShowSuccess,
      setMemberNumber,
      setCurrentMemberId,
      setJustAssignedCourt,
      setAssignedSessionId,
      setAssignedEndTime,
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
      backend.queries,
    ]
  );

  // Reset form (moved to orchestration layer)
  // deps now assembled by createResetDeps factory
  const resetForm = useCallback(() => {
    resetFormOrchestrated(createResetDeps());
  }, [resetFormOrchestrated, createResetDeps]);

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
  // Admin Screen Handlers (extracted to adminHandlers.js)
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
  // Guest Handlers (extracted to guestHandlers.js)
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
  // Court Handlers (extracted to courtHandlers.js)
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
    setAssignedEndTime,
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
  // Group Handlers (extracted to groupHandlers.js)
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
  // Navigation Handlers (extracted to navigationHandlers.js)
  // ============================================================
  const navigationHandlers = useNavigationHandlers({
    // State
    showGuestForm,
    showAddPlayer,
    mobileFlow,
    currentScreen,
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
    markUserTyping,
    getCourtData,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
  };
}
