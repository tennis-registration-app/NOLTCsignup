import { useCallback } from 'react';

// Extracted handler modules (WP5.9.5)
import { useAdminHandlers, useGuestHandlers, useGroupHandlers } from './handlers';

// Import services for handlers that need them
import { GeolocationService } from '../services';

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

  // Wrapper function to check location before proceeding
  const checkLocationAndProceed = useCallback(
    async (onSuccess) => {
      // Skip location check if disabled
      if (!TENNIS_CONFIG.GEOLOCATION.ENABLED) {
        console.log('⚠️ Geolocation check disabled for development');
        onSuccess();
        return;
      }

      setCheckingLocation(true);

      try {
        const locationResult = await GeolocationService.verifyAtClub();

        if (locationResult.success) {
          // Location verified, proceed with action
          onSuccess();
        } else {
          // Not at club
          showAlertMessage(locationResult.message);
        }
      } catch (error) {
        // Location check failed (timeout, permission denied, etc.)
        console.error('Location check failed:', error);
        showAlertMessage(TENNIS_CONFIG.GEOLOCATION.ERROR_MESSAGE);
      } finally {
        setCheckingLocation(false);
      }
    },
    [TENNIS_CONFIG, setCheckingLocation, showAlertMessage]
  );

  // getCourtData is passed in as a dep from App.jsx (needed by hooks before this hook)

  // Save court data using the data service
  // @deprecated — localStorage persistence removed; API commands handle state
  const saveCourtData = useCallback(async (_data) => {
    // TennisDataService.saveData removed — API is source of truth
    // Callers should migrate to TennisCommands for write operations
    console.warn('[saveCourtData] DEPRECATED: localStorage persistence removed. Use API commands.');
    return true; // Return success to avoid breaking callers during migration
  }, []);

  // Get available courts (strict selectable API - single source of truth)
  const getAvailableCourts = useCallback(
    (
      checkWaitlistPriority = true,
      _includeOvertimeIfChanging = false,
      excludeCourtNumber = null,
      dataOverride = null
    ) => {
      const Av = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
      if (!Av?.getSelectableCourtsStrict || !Av?.getFreeCourtsInfo) {
        console.warn('Availability functions not available');
        return [];
      }

      try {
        // Use API state by default, fall back to localStorage only if state not available
        const courtData = dataOverride || getCourtData();
        const boardData =
          courtData?.courts?.length > 0 ? courtData : window.Tennis?.Storage?.readDataSafe();
        const now = new Date();

        // Get blocks from the board data if available, otherwise localStorage
        const blocks =
          courtData?.blocks ||
          window.Tennis?.Storage?.readJSON(window.Tennis?.Storage?.STORAGE?.BLOCKS) ||
          [];
        const wetSet = new Set();

        let selectable = [];

        if (checkWaitlistPriority) {
          // Waitlist priority mode: ONLY show truly free courts (no overtime fallback)
          const info = Av.getFreeCourtsInfo({ data: boardData, now, blocks, wetSet });
          selectable = info.free || [];
          dbg('Waitlist priority mode - free courts only:', selectable);
        } else {
          // Non-waitlist mode: use standard selectable logic (free first, then overtime fallback)
          selectable = Av.getSelectableCourtsStrict({ data: boardData, now, blocks, wetSet });
          dbg('Standard selectable courts:', selectable);
        }

        // Apply excludeCourtNumber filter if specified
        const filtered = excludeCourtNumber
          ? selectable.filter((n) => n !== excludeCourtNumber)
          : selectable;

        return filtered;
      } catch (error) {
        console.error('Error in getAvailableCourts:', error);
        return [];
      }
    },
    [getCourtData, dbg]
  );

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

  // Clear a court via TennisBackend
  const clearViaService = useCallback(
    async (courtNumber, clearReason) => {
      // Get court UUID from court number
      const court = data.courts.find((c) => c.number === courtNumber);
      if (!court) {
        console.error('[clearViaService] Court not found for number:', courtNumber);
        return { success: false, error: 'Court not found' };
      }

      console.log('[clearViaService] Using TennisBackend for court:', court.id);

      try {
        const result = await backend.commands.endSession({
          courtId: court.id,
          reason: clearReason || 'completed',
        });

        // Map {ok, message} to {success, error} for compatibility
        return {
          success: result.ok,
          error: result.ok ? undefined : result.message,
        };
      } catch (error) {
        console.error('[clearViaService] Error:', error);
        return { success: false, error: error.message || 'Failed to clear court' };
      }
    },
    [data.courts, backend]
  );

  const clearCourt = useCallback(
    async (courtNumber, clearReason = 'Cleared') => {
      console.log(
        `[Registration UI] clearCourt called for court ${courtNumber} with reason: ${clearReason}`
      );

      const res = await clearViaService(courtNumber, clearReason);
      if (!res?.success) {
        window.Tennis?.UI?.toast(res?.error || 'Failed to clear court');
        return;
      }
      console.log(`Court ${courtNumber} cleared successfully`);
      // success UI stays the same (thanks/close), no manual writes needed—
      // DataStore.set inside the service will emit both events.
    },
    [clearViaService]
  );

  // Assign court (moved to orchestration layer - WP5.5)
  const assignCourtToGroup = useCallback(
    async (courtNumber, selectableCountAtSelection = null) => {
      return assignCourtToGroupOrchestrated(courtNumber, selectableCountAtSelection, {
        // Read values
        isAssigning,
        mobileFlow,
        preselectedCourt,
        operatingHours,
        currentGroup,
        courts: data.courts,
        currentWaitlistEntryId,
        CONSTANTS,
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
        // Services
        backend,
        // Helpers
        getCourtBlockStatus,
        getMobileGeolocation,
        showAlertMessage,
        validateGroupCompat,
        clearSuccessResetTimer,
        resetForm,
        successResetTimerRef,
        dbg,
        API_CONFIG,
      });
    },
    [
      assignCourtToGroupOrchestrated,
      isAssigning,
      mobileFlow,
      preselectedCourt,
      operatingHours,
      currentGroup,
      data.courts,
      currentWaitlistEntryId,
      CONSTANTS,
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
      backend,
      getCourtBlockStatus,
      getMobileGeolocation,
      showAlertMessage,
      validateGroupCompat,
      clearSuccessResetTimer,
      resetForm,
      successResetTimerRef,
      dbg,
      API_CONFIG,
    ]
  );

  // Change court assignment (moved to orchestration layer - WP5.5)
  const changeCourt = useCallback(() => {
    changeCourtOrchestrated({
      canChangeCourt,
      justAssignedCourt,
      replacedGroup,
      setOriginalCourtData,
      setShowSuccess,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setCurrentScreen,
    });
  }, [
    changeCourtOrchestrated,
    canChangeCourt,
    justAssignedCourt,
    replacedGroup,
    setOriginalCourtData,
    setShowSuccess,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCurrentScreen,
  ]);

  // Send group to waitlist (moved to orchestration layer - WP5.5)
  const sendGroupToWaitlist = useCallback(
    async (group) => {
      await sendGroupToWaitlistOrchestrated(group, {
        // Read values
        isJoiningWaitlist,
        currentGroup,
        mobileFlow,
        // Setters
        setIsJoiningWaitlist,
        setWaitlistPosition,
        setGpsFailedPrompt,
        // Services/helpers
        backend,
        getMobileGeolocation,
        validateGroupCompat,
        isPlayerAlreadyPlaying,
        showAlertMessage,
        API_CONFIG,
      });
    },
    [
      sendGroupToWaitlistOrchestrated,
      isJoiningWaitlist,
      currentGroup,
      mobileFlow,
      setIsJoiningWaitlist,
      setWaitlistPosition,
      setGpsFailedPrompt,
      backend,
      getMobileGeolocation,
      validateGroupCompat,
      isPlayerAlreadyPlaying,
      showAlertMessage,
      API_CONFIG,
    ]
  );

  // ============================================
  // Admin Screen Handlers (extracted to adminHandlers.js - WP5.9.5.1)
  // ============================================
  const adminHandlers = useAdminHandlers({
    backend,
    showAlertMessage,
    clearCourt,
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
    getAvailableCourts,
    saveCourtData,
    fetchFrequentPartners,
    assignCourtToGroup,
    sendGroupToWaitlist,
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
  // Navigation Handlers
  // ============================================================

  const handleToggleAddPlayer = useCallback(() => {
    if (showGuestForm) {
      // If guest form is showing, close it and reset
      setShowGuestForm(false);
      setGuestName('');
      setGuestSponsor('');
      setShowGuestNameError(false);
      setShowSponsorError(false);
      setShowAddPlayer(false);
    } else {
      // Normal toggle behavior
      setShowAddPlayer(!showAddPlayer);
    }
  }, [
    showGuestForm,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setShowGuestNameError,
    setShowSponsorError,
    showAddPlayer,
    setShowAddPlayer,
  ]);

  const handleGroupGoBack = useCallback(() => {
    if (mobileFlow) {
      // Check if we're in Clear Court workflow - handle navigation properly
      if (deps.currentScreen === 'clearCourt') {
        // In Clear Court, Back should go to previous step or exit
        if (clearCourtStep > 1) {
          decrementClearCourtStep();
        } else {
          // Exit Clear Court workflow
          requestMobileReset();
        }
      } else {
        // For other screens, close the registration overlay
        requestMobileReset();
      }
    } else {
      // Desktop behavior - go back to home
      setCurrentGroup([]);
      setMemberNumber('');
      setCurrentMemberId(null);
      setCurrentScreen('home', 'groupGoBack');
    }
  }, [
    mobileFlow,
    deps.currentScreen,
    clearCourtStep,
    decrementClearCourtStep,
    requestMobileReset,
    setCurrentGroup,
    setMemberNumber,
    setCurrentMemberId,
    setCurrentScreen,
  ]);

  // ===== RETURN ALL HANDLERS =====
  return {
    // Admin handlers (extracted - WP5.9.5.1)
    ...adminHandlers,
    // Guest handlers (extracted - WP5.9.5.2)
    ...guestHandlers,
    // Group handlers (extracted - WP5.9.5.3)
    ...groupHandlers,
    // Core handlers
    markUserTyping,
    checkLocationAndProceed,
    getCourtData,
    saveCourtData,
    getAvailableCourts,
    assignCourtToGroup,
    changeCourt,
    clearCourt,
    sendGroupToWaitlist,
    clearSuccessResetTimer,
    resetForm,
    isPlayerAlreadyPlaying,
    // Navigation handlers
    handleToggleAddPlayer,
    handleGroupGoBack,
  };
}
