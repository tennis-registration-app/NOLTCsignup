import { useCallback } from 'react';
import { logger } from '../../../lib/logger.js';

/**
 * Court Handlers
 * Extracted from useRegistrationHandlers — WP5.9.5.4
 * Verbatim function bodies, no logic changes.
 */
export function useCourtHandlers(deps) {
  const {
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
  } = deps;

  // VERBATIM COPY: saveCourtData from line ~206
  // @deprecated — localStorage persistence removed; API commands handle state
  const saveCourtData = useCallback(async (_data) => {
    // TennisDataService.saveData removed — API is source of truth
    // Callers should migrate to TennisCommands for write operations
    logger.warn('CourtHandlers', 'DEPRECATED: localStorage persistence removed. Use API commands.');
    return true; // Return success to avoid breaking callers during migration
  }, []);

  // VERBATIM COPY: getAvailableCourts from line ~214
  const getAvailableCourts = useCallback(
    (
      checkWaitlistPriority = true,
      _includeOvertimeIfChanging = false,
      excludeCourtNumber = null,
      dataOverride = null
    ) => {
      const Av = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
      if (!Av?.getSelectableCourtsStrict || !Av?.getFreeCourtsInfo) {
        logger.warn('CourtHandlers', 'Availability functions not available');
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
        logger.error('CourtHandlers', 'Error in getAvailableCourts', error);
        return [];
      }
    },
    [getCourtData, dbg]
  );

  // VERBATIM COPY: clearViaService from line ~367 (internal helper, not exported)
  const clearViaService = useCallback(
    async (courtNumber, clearReason) => {
      // Get court UUID from court number
      const court = data.courts.find((c) => c.number === courtNumber);
      if (!court) {
        logger.error('CourtHandlers', '[clearViaService] Court not found for number', courtNumber);
        return { success: false, error: 'Court not found' };
      }

      logger.debug('CourtHandlers', '[clearViaService] Using TennisBackend for court', court.id);

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
        logger.error('CourtHandlers', '[clearViaService] Error', error);
        return { success: false, error: error.message || 'Failed to clear court' };
      }
    },
    [data.courts, backend]
  );

  // VERBATIM COPY: clearCourt from line ~397
  const clearCourt = useCallback(
    async (courtNumber, clearReason = 'Cleared') => {
      logger.debug(
        'CourtHandlers',
        `[Registration UI] clearCourt called for court ${courtNumber} with reason: ${clearReason}`
      );

      const res = await clearViaService(courtNumber, clearReason);
      if (!res?.success) {
        window.Tennis?.UI?.toast(res?.error || 'Failed to clear court');
        return;
      }
      logger.debug('CourtHandlers', `Court ${courtNumber} cleared successfully`);
      // success UI stays the same (thanks/close), no manual writes needed—
      // DataStore.set inside the service will emit both events.
    },
    [clearViaService]
  );

  // VERBATIM COPY: assignCourtToGroup from line ~416
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

  // VERBATIM COPY: changeCourt from line ~503
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

  // VERBATIM COPY: sendGroupToWaitlist from line ~527
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

  return {
    saveCourtData,
    getAvailableCourts,
    clearCourt,
    assignCourtToGroup,
    changeCourt,
    sendGroupToWaitlist,
  };
}
