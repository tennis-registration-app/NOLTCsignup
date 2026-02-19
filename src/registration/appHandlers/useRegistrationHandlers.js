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
    services: { backend },
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,
    alert: { showAlertMessage, setShowAlert, setAlertMessage },
    mobile: { getMobileGeolocation, setGpsFailedPrompt, mobileFlow, preselectedCourt },
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
      data,
      operatingHours,
      replacedGroup,
      canChangeCourt,
      currentWaitlistEntryId,
      isAssigning,
      isJoiningWaitlist,
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
      setGuestName,
      setGuestSponsor,
      setShowGuestForm,
      setShowGuestNameError,
      setShowSponsorError,
    },
    memberIdentity: { setCurrentMemberId, setMemberNumber, fetchFrequentPartners, clearCache },
    search: { setSearchInput, setShowSuggestions, setAddPlayerSearch, setShowAddPlayerSuggestions },
    streak: {
      registrantStreak,
      setRegistrantStreak,
      setShowStreakModal,
      streakAcknowledged,
      setStreakAcknowledged,
    },
    clearCourtFlow: { setSelectedCourtToClear, setClearCourtStep },
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
  // Court Handlers (extracted to courtHandlers.js)
  // Must be first: adminHandlers and groupHandlers depend on court outputs
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

  // ============================================
  // Admin Screen Handlers (extracted to adminHandlers.js)
  // ============================================
  const adminHandlers = useAdminHandlers({
    services: app.services,
    alert: app.alert,
    helpers: app.helpers,
    setters: app.setters,
    search: app.search,
    state: app.state,
    adminPriceFeedback: app.adminPriceFeedback,
    TENNIS_CONFIG,
    court: courtHandlers,
  });

  // ============================================
  // Guest Handlers (extracted to guestHandlers.js)
  // ============================================
  const guestHandlers = useGuestHandlers({
    groupGuest: app.groupGuest,
    guestCounterHook: app.guestCounterHook,
    memberIdentity: app.memberIdentity,
    derived: app.derived,
    setters: app.setters,
    search: app.search,
    helpers: app.helpers,
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
    state: app.state,
    setters: app.setters,
    groupGuest: app.groupGuest,
    memberIdentity: app.memberIdentity,
    mobile: app.mobile,
    clearCourtFlow: app.clearCourtFlow,
    alert: app.alert,
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
