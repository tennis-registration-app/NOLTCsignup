import { useCallback } from 'react';
import { logger } from '../../../lib/logger.js';
import { isCourtEligibleForGroup } from '../../../lib/types/domain.js';
import {
  getSelectableCourtsStrict,
  getFreeCourtsInfo,
} from '../../../tennis/domain/availability.js';
import { toast } from '../../../shared/utils/toast.js';
import { readJSON, readDataSafe } from '../../../lib/storage.js';
import { STORAGE } from '../../../lib/constants.js';
import { COURT_CLEAR_FAILED } from '../../../shared/constants/toastMessages.js';

/**
 * Court Handlers
 * Extracted from useRegistrationHandlers
 * Accepts named slices from the app state object.
 */
export function useCourtHandlers({
  state,
  setters,
  mobile,
  groupGuest,
  courtAssignment,
  services,
  helpers,
  blockAdmin,
  alert,
  refs,
  // Top-level app values
  assignCourtToGroupOrchestrated,
  changeCourtOrchestrated,
  sendGroupToWaitlistOrchestrated,
  validateGroupCompat,
  dbg,
  CONSTANTS,
  API_CONFIG,
  // Core handlers created in parent scope
  core,
}) {
  const {
    data,
    isAssigning,
    currentWaitlistEntryId,
    canChangeCourt,
    isJoiningWaitlist,
    operatingHours,
    replacedGroup,
  } = state;
  const {
    setIsAssigning,
    setCurrentWaitlistEntryId,
    setHasWaitlistPriority,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCanChangeCourt,
    setChangeTimeRemaining,
    setIsTimeLimited,
    setTimeLimitReason,
    setShowSuccess,
    setCurrentScreen,
    setIsJoiningWaitlist,
    setWaitlistPosition,
  } = setters;
  const { mobileFlow, preselectedCourt, getMobileGeolocation, setGpsFailedPrompt } = mobile;
  const { currentGroup, setCurrentGroup } = groupGuest;
  const {
    justAssignedCourt,
    setJustAssignedCourt,
    setAssignedSessionId,
    setAssignedEndTime,
    setHasAssignedCourt,
  } = courtAssignment;
  const { backend } = services;
  const { getCourtData } = helpers;
  const { getCourtBlockStatus } = blockAdmin;
  const { showAlertMessage } = alert;
  const { successResetTimerRef } = refs;
  const { clearSuccessResetTimer, resetForm, isPlayerAlreadyPlaying } = core;

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
      try {
        // Use API state by default, fall back to localStorage only if state not available
        const courtData = dataOverride || getCourtData();
        const boardData = courtData?.courts?.length > 0 ? courtData : readDataSafe();
        const now = new Date();

        // Get blocks from the board data if available, otherwise localStorage
        const blocks = courtData?.blocks || readJSON(STORAGE.BLOCKS) || [];
        const wetSet = new Set();

        let selectable = [];

        if (checkWaitlistPriority) {
          // Waitlist priority mode: ONLY show truly free courts (no overtime fallback)
          const info = getFreeCourtsInfo({ data: boardData, now, blocks, wetSet });
          selectable = info.free || [];
          dbg('Waitlist priority mode - free courts only:', selectable);
        } else {
          // Non-waitlist mode: use standard selectable logic (free first, then overtime fallback)
          selectable = getSelectableCourtsStrict({ data: boardData, now, blocks, wetSet });
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
        toast(COURT_CLEAR_FAILED, { type: 'error' });
        return;
      }
      logger.debug('CourtHandlers', `Court ${courtNumber} cleared successfully`);
      // success UI stays the same (thanks/close), no manual writes needed—
      // DataStore.set inside the service will emit both events.
    },
    [clearViaService]
  );

  // Factory function to assemble assignCourt deps (grouped structure)
  const createAssignCourtDeps = useCallback(
    () => ({
      state: {
        isAssigning,
        mobileFlow,
        preselectedCourt,
        operatingHours,
        currentGroup,
        courts: data.courts,
        currentWaitlistEntryId,
        CONSTANTS,
        successResetTimerRef,
        API_CONFIG,
      },
      actions: {
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
      },
      services: {
        backend,
        getCourtBlockStatus,
        getMobileGeolocation,
        validateGroupCompat,
        clearSuccessResetTimer,
        resetForm,
        dbg,
      },
      ui: {
        showAlertMessage,
      },
    }),
    [
      isAssigning,
      mobileFlow,
      preselectedCourt,
      operatingHours,
      currentGroup,
      data.courts,
      currentWaitlistEntryId,
      CONSTANTS,
      successResetTimerRef,
      API_CONFIG,
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
      backend,
      getCourtBlockStatus,
      getMobileGeolocation,
      validateGroupCompat,
      clearSuccessResetTimer,
      resetForm,
      dbg,
      showAlertMessage,
    ]
  );

  // VERBATIM COPY: assignCourtToGroup from line ~416
  // deps now assembled by createAssignCourtDeps factory
  const assignCourtToGroup = useCallback(
    async (courtNumber, selectableCountAtSelection = null) => {
      return assignCourtToGroupOrchestrated(
        courtNumber,
        selectableCountAtSelection,
        createAssignCourtDeps()
      );
    },
    [assignCourtToGroupOrchestrated, createAssignCourtDeps]
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
    async (group, options) => {
      await sendGroupToWaitlistOrchestrated(
        group,
        {
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
        },
        options
      );
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

  // Defer waitlist entry — moved from courtPresenter.js onDeferWaitlist
  const deferWaitlistEntry = useCallback(
    async (entryId) => {
      try {
        const res = await backend.commands.deferWaitlistEntry({
          entryId,
          deferred: true,
        });
        if (res?.ok) {
          toast('Staying on waitlist — we will notify you when a full court opens', {
            type: 'success',
          });
        } else {
          toast(res?.message || 'Failed to defer', { type: 'error' });
        }
      } catch (err) {
        logger.error('CourtHandlers', 'deferWaitlistEntry failed', err);
        toast('Failed to defer — please try again', { type: 'error' });
      }
      resetForm();
    },
    [backend, resetForm]
  );

  // Undo overtime takeover — moved from courtPresenter.js onCourtSelect pre-step
  const undoOvertimeAndClearPrevious = useCallback(
    async (previousCourtNumber, displacement) => {
      if (displacement && displacement.displacedSessionId && displacement.takeoverSessionId) {
        try {
          const undoResult = await backend.commands.undoOvertimeTakeover({
            takeoverSessionId: displacement.takeoverSessionId,
            displacedSessionId: displacement.displacedSessionId,
          });
          // If undo failed with conflict, fall back to clearCourt
          if (!undoResult.ok) {
            logger.warn(
              'CourtHandlers',
              'Undo returned conflict, falling back to clearCourt',
              undoResult
            );
            await clearCourt(previousCourtNumber, 'Bumped');
          }
          // If ok: true, the undo endpoint already ended the takeover session - no clearCourt needed
        } catch (err) {
          logger.error('CourtHandlers', 'Undo takeover failed', err);
          // Fallback: just clear the court if undo fails
          await clearCourt(previousCourtNumber, 'Bumped');
        }
      } else {
        // No displacement - just clear the court normally
        await clearCourt(previousCourtNumber, 'Bumped');
      }
    },
    [backend, clearCourt]
  );

  // Assign next group from waitlist — moved from courtPresenter.js onAssignNext
  const assignNextFromWaitlist = useCallback(async () => {
    logger.debug('CourtHandlers', 'ASSIGN NEXT button clicked');
    try {
      // Get current board state
      const board = await backend.queries.getBoard();

      // Find first waiting entry
      const firstWaiting = board?.waitlist?.find((e) => e.status === 'waiting');
      if (!firstWaiting) {
        showAlertMessage('No entries waiting in queue');
        return;
      }

      // Find first available court (respecting singles-only restrictions)
      const waitlistPlayerCount = firstWaiting.group?.players?.length || 0;
      const availableCourt = board?.courts?.find(
        (c) =>
          c.isAvailable && !c.isBlocked && isCourtEligibleForGroup(c.number, waitlistPlayerCount)
      );
      if (!availableCourt) {
        showAlertMessage('No courts available');
        return;
      }

      // Assign using API
      const res = await backend.commands.assignFromWaitlist({
        waitlistEntryId: firstWaiting.id,
        courtId: availableCourt.id,
      });

      if (res?.ok) {
        toast(`Assigned to Court ${availableCourt.number}`, {
          type: 'success',
        });
        showAlertMessage(`Assigned to Court ${availableCourt.number}`);
      } else {
        toast(res?.message || 'Failed assigning next', {
          type: 'error',
        });
        showAlertMessage(res?.message || 'Failed assigning next');
      }
    } catch (err) {
      logger.error('CourtHandlers', 'ASSIGN NEXT error', err);
      showAlertMessage(err.message || 'Failed assigning next');
    }
  }, [backend, showAlertMessage]);

  // Join waitlist as deferred — moved from courtPresenter.js onJoinWaitlistDeferred
  const joinWaitlistDeferred = useCallback(
    async (group) => {
      try {
        await sendGroupToWaitlist(group, { deferred: true });
        toast("You'll be notified when a full-time court is available", {
          type: 'success',
        });
      } catch (err) {
        logger.error('CourtHandlers', 'joinWaitlistDeferred failed', err);
        toast('Failed to join waitlist — please try again', {
          type: 'error',
        });
      }
      resetForm();
    },
    [sendGroupToWaitlist, resetForm]
  );

  return {
    saveCourtData,
    getAvailableCourts,
    clearCourt,
    assignCourtToGroup,
    changeCourt,
    sendGroupToWaitlist,
    deferWaitlistEntry,
    undoOvertimeAndClearPrevious,
    assignNextFromWaitlist,
    joinWaitlistDeferred,
  };
}
