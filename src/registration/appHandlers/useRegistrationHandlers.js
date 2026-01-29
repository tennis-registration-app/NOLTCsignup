import { useCallback } from 'react';

// Extracted handler modules (WP5.9.5)
import { useAdminHandlers, useGuestHandlers } from './handlers';

// Import services for handlers that need them
import { GeolocationService } from '../services';

// Import validation services
import { DataValidation, TennisBusinessLogic } from '@lib';

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
  const isPlayerAlreadyPlaying = useCallback(
    (playerId) => {
      const courtData = getCourtData();
      return TennisBusinessLogic.isPlayerAlreadyPlaying(playerId, courtData, currentGroup);
    },
    [getCourtData, currentGroup]
  );

  // Find member number
  const findMemberNumber = useCallback(
    (playerId) => {
      // First check if the playerId itself is a member number
      if (memberDatabase[playerId]) {
        return playerId;
      }

      // Then check family members
      for (const [memberNum, member] of Object.entries(memberDatabase)) {
        if (member.familyMembers.some((m) => String(m.id) === String(playerId))) {
          return memberNum;
        }
      }
      return '';
    },
    [memberDatabase]
  );

  // Add frequent partner
  const addFrequentPartner = useCallback(
    (player) => {
      console.log('🔵 addFrequentPartner called with:', JSON.stringify(player, null, 2));

      // Validate player object
      if (!DataValidation.isValidPlayer(player)) {
        console.log('🔴 Invalid player data - validation failed:', {
          player,
          hasId: !!player?.id,
          idType: typeof player?.id,
          idValue: player?.id,
          hasName: !!player?.name,
          nameType: typeof player?.name,
          nameValue: player?.name,
        });
        showAlertMessage('Invalid player data. Please try again.');
        return;
      }

      // Player from getFrequentPartners already has API data
      const enriched = player;

      // Ensure player has at least a name
      if (!enriched?.name && !player?.name) {
        showAlertMessage('Player must have a name');
        return;
      }

      // Check if player is already playing or on waitlist
      if (!guardAddPlayerEarly(getCourtData, enriched)) {
        return; // Toast message already shown by guardAddPlayerEarly
      }

      // Validate group size
      if (currentGroup.length >= CONSTANTS.MAX_PLAYERS) {
        showAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
        return;
      }

      // Check for duplicate in current group
      if (!guardAgainstGroupDuplicate(enriched, currentGroup)) {
        window.Tennis?.UI?.toast(`${enriched.name} is already in this group`);
        return;
      }

      // For API backend, use the data directly; for legacy, look up memberNumber
      const newPlayer = {
        name: enriched.name,
        memberNumber: enriched.memberNumber || findMemberNumber(enriched.id),
        id: enriched.id,
        memberId: enriched.memberId || enriched.id,
        phone: enriched.phone || '',
        ranking: enriched.ranking || null,
        winRate: enriched.winRate || 0.5,
        accountId: enriched.accountId, // Include accountId for API backend
      };
      console.log('🔵 Adding frequent partner to group:', newPlayer);
      setCurrentGroup([...currentGroup, newPlayer]);
    },
    [
      showAlertMessage,
      guardAddPlayerEarly,
      getCourtData,
      currentGroup,
      CONSTANTS,
      guardAgainstGroupDuplicate,
      findMemberNumber,
      setCurrentGroup,
    ]
  );

  // Helper to compare groups (ID-first, name fallback)
  const sameGroup = useCallback((a = [], b = []) => {
    const norm = (p) => {
      // Ensure we're working with strings before calling toLowerCase
      const memberId = String(p?.memberId || '');
      const id = String(p?.id || '');
      const name = String(p?.name || '');

      return memberId.toLowerCase() || id.toLowerCase() || name.trim().toLowerCase();
    };
    if (a.length !== b.length) return false;
    const A = a.map(norm).sort();
    const B = b.map(norm).sort();
    return A.every((x, i) => x === B[i]);
  }, []);

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

  // Handle suggestion click (moved to orchestration layer - WP5.5)
  const handleSuggestionClick = useCallback(
    async (suggestion) => {
      await handleSuggestionClickOrchestrated(suggestion, {
        // Read values
        currentGroup,
        // Setters
        setSearchInput,
        setShowSuggestions,
        setMemberNumber,
        setCurrentMemberId,
        setRegistrantStreak,
        setStreakAcknowledged,
        setCurrentGroup,
        setCurrentScreen,
        // Services/helpers
        backend,
        fetchFrequentPartners,
        isPlayerAlreadyPlaying,
        guardAddPlayerEarly,
        getCourtData,
        getAvailableCourts,
        showAlertMessage,
      });
    },
    [
      handleSuggestionClickOrchestrated,
      currentGroup,
      setSearchInput,
      setShowSuggestions,
      setMemberNumber,
      setCurrentMemberId,
      setRegistrantStreak,
      setStreakAcknowledged,
      setCurrentGroup,
      setCurrentScreen,
      backend,
      fetchFrequentPartners,
      isPlayerAlreadyPlaying,
      guardAddPlayerEarly,
      getCourtData,
      getAvailableCourts,
      showAlertMessage,
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
  // GroupScreen Handlers
  // ============================================================

  const handleGroupSuggestionClick = useCallback(
    async (suggestion) => {
      await handleSuggestionClick(suggestion);
      // For mobile flow, clear search after adding first player
      if (mobileFlow) {
        setSearchInput('');
        setShowSuggestions(false);
      }
    },
    [handleSuggestionClick, mobileFlow, setSearchInput, setShowSuggestions]
  );

  // Handle add player suggestion click (moved to orchestration layer - WP5.5)
  const handleAddPlayerSuggestionClick = useCallback(
    async (suggestion) => {
      await handleAddPlayerSuggestionClickOrchestrated(suggestion, {
        // Read values
        currentGroup,
        // Setters
        setAddPlayerSearch,
        setShowAddPlayer,
        setShowAddPlayerSuggestions,
        setCurrentGroup,
        setHasWaitlistPriority,
        setAlertMessage,
        setShowAlert,
        // Services/helpers
        guardAddPlayerEarly,
        guardAgainstGroupDuplicate,
        isPlayerAlreadyPlaying,
        getAvailableCourts,
        getCourtData,
        saveCourtData,
        findMemberNumber,
        showAlertMessage,
        CONSTANTS,
      });
    },
    [
      handleAddPlayerSuggestionClickOrchestrated,
      currentGroup,
      setAddPlayerSearch,
      setShowAddPlayer,
      setShowAddPlayerSuggestions,
      setCurrentGroup,
      setHasWaitlistPriority,
      setAlertMessage,
      setShowAlert,
      guardAddPlayerEarly,
      guardAgainstGroupDuplicate,
      isPlayerAlreadyPlaying,
      getAvailableCourts,
      getCourtData,
      saveCourtData,
      findMemberNumber,
      showAlertMessage,
      CONSTANTS,
    ]
  );

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

  const handleGroupSelectCourt = useCallback(() => {
    console.log('[handleGroupSelectCourt] registrantStreak:', registrantStreak);
    console.log('[handleGroupSelectCourt] streakAcknowledged:', streakAcknowledged);

    // Check if streak >= 3 and not yet acknowledged
    if (registrantStreak >= 3 && !streakAcknowledged) {
      console.log('[handleGroupSelectCourt] Showing streak modal');
      setShowStreakModal(true);
      return;
    }

    // Mobile: Skip court selection if we have a preselected court
    if (mobileFlow && preselectedCourt) {
      assignCourtToGroup(preselectedCourt);
    } else {
      setCurrentScreen('court', 'selectCourtButton');
    }
  }, [
    registrantStreak,
    streakAcknowledged,
    setShowStreakModal,
    mobileFlow,
    preselectedCourt,
    assignCourtToGroup,
    setCurrentScreen,
  ]);

  // Handler for streak modal acknowledgment
  const handleStreakAcknowledge = useCallback(() => {
    setStreakAcknowledged(true);
    setShowStreakModal(false);
    // Now proceed to court selection
    if (mobileFlow && preselectedCourt) {
      assignCourtToGroup(preselectedCourt);
    } else {
      setCurrentScreen('court', 'selectCourtButton');
    }
  }, [
    setStreakAcknowledged,
    setShowStreakModal,
    mobileFlow,
    preselectedCourt,
    assignCourtToGroup,
    setCurrentScreen,
  ]);

  const handleGroupJoinWaitlist = useCallback(async () => {
    try {
      await sendGroupToWaitlist(currentGroup);
      setShowSuccess(true);
    } catch (error) {
      console.error('[handleGroupJoinWaitlist] Error:', error);
    }
    // Mobile: trigger success signal
    if (window.UI?.__mobileSendSuccess__) {
      window.UI.__mobileSendSuccess__();
    }

    // Don't auto-reset in mobile flow - let the overlay handle timing
    if (!mobileFlow) {
      clearSuccessResetTimer();
      successResetTimerRef.current = setTimeout(() => {
        successResetTimerRef.current = null;
        resetForm();
      }, CONSTANTS.AUTO_RESET_SUCCESS_MS);
    }
  }, [
    sendGroupToWaitlist,
    currentGroup,
    setShowSuccess,
    mobileFlow,
    clearSuccessResetTimer,
    successResetTimerRef,
    resetForm,
    CONSTANTS,
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
    addFrequentPartner,
    findMemberNumber,
    sameGroup,
    handleSuggestionClick,
    handleGroupSuggestionClick,
    handleAddPlayerSuggestionClick,
    handleToggleAddPlayer,
    handleGroupSelectCourt,
    handleStreakAcknowledge,
    handleGroupJoinWaitlist,
    handleGroupGoBack,
  };
}
