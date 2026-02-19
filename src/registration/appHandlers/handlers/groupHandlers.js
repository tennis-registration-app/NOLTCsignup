import { useCallback } from 'react';

// Import validation services
import { DataValidation } from '@lib';
import { logger } from '../../../lib/logger.js';
import { getTennisUI, getUI } from '../../../platform/windowBridge.js';
import { ALREADY_IN_GROUP } from '../../../shared/constants/toastMessages.js';

/**
 * Group Handlers
 * Extracted from useRegistrationHandlers
 * Accepts named slices from the app state object.
 *
 * Handles group management: player selection, frequent partners,
 * streak acknowledgment, waitlist joining, court selection.
 */
export function useGroupHandlers({
  groupGuest,
  derived,
  mobile,
  streak,
  search,
  memberIdentity,
  setters,
  alert,
  refs,
  services,
  helpers,
  // Court handler outputs
  court,
  // Core handlers created in parent scope
  core,
  // Top-level app values
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
  CONSTANTS,
}) {
  const { currentGroup, setCurrentGroup } = groupGuest;
  const { memberDatabase } = derived;
  const { mobileFlow, preselectedCourt } = mobile;
  const {
    registrantStreak,
    streakAcknowledged,
    setRegistrantStreak,
    setStreakAcknowledged,
    setShowStreakModal,
  } = streak;
  const { setSearchInput, setShowSuggestions, setAddPlayerSearch, setShowAddPlayerSuggestions } =
    search;
  const { setMemberNumber, setCurrentMemberId, fetchFrequentPartners } = memberIdentity;
  const { setCurrentScreen, setShowAddPlayer, setHasWaitlistPriority, setShowSuccess } = setters;
  const { setAlertMessage, setShowAlert, showAlertMessage } = alert;
  const { successResetTimerRef } = refs;
  const { backend } = services;
  const { guardAddPlayerEarly, guardAgainstGroupDuplicate, getCourtData } = helpers;
  const { getAvailableCourts, saveCourtData, assignCourtToGroup, sendGroupToWaitlist } = court;
  const { clearSuccessResetTimer, resetForm, isPlayerAlreadyPlaying } = core;

  // VERBATIM COPY: findMemberNumber from line ~366
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

  // VERBATIM COPY: addFrequentPartner from line ~385
  const addFrequentPartner = useCallback(
    (player) => {
      logger.debug(
        'GroupHandlers',
        'addFrequentPartner called with',
        JSON.stringify(player, null, 2)
      );

      // Validate player object
      if (!DataValidation.isValidPlayer(player)) {
        logger.debug('GroupHandlers', 'Invalid player data - validation failed', {
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
        const tennisUI = getTennisUI();
        tennisUI?.toast(ALREADY_IN_GROUP(enriched.name), { type: 'warning' });
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
      logger.debug('GroupHandlers', 'Adding frequent partner to group', newPlayer);
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

  // VERBATIM COPY: sameGroup from line ~457
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

  // VERBATIM COPY: handleSuggestionClick from line ~671
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

  // VERBATIM COPY: handleGroupSuggestionClick from line ~767
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

  // VERBATIM COPY: handleAddPlayerSuggestionClick from line ~780
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

  // VERBATIM COPY: handleGroupSelectCourt from line ~851
  const handleGroupSelectCourt = useCallback(() => {
    logger.debug('GroupHandlers', '[handleGroupSelectCourt] registrantStreak', registrantStreak);
    logger.debug(
      'GroupHandlers',
      '[handleGroupSelectCourt] streakAcknowledged',
      streakAcknowledged
    );

    // Check if streak >= 3 and not yet acknowledged
    if (registrantStreak >= 3 && !streakAcknowledged) {
      logger.debug('GroupHandlers', '[handleGroupSelectCourt] Showing streak modal');
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

  // VERBATIM COPY: handleStreakAcknowledge from line ~878
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

  // VERBATIM COPY: handleGroupJoinWaitlist from line ~897
  const handleGroupJoinWaitlist = useCallback(async () => {
    try {
      await sendGroupToWaitlist(currentGroup);
      setShowSuccess(true);
    } catch (error) {
      logger.error('GroupHandlers', '[handleGroupJoinWaitlist] Error', error);
    }
    // Mobile: trigger success signal
    const ui = getUI();
    if (ui?.__mobileSendSuccess__) {
      ui.__mobileSendSuccess__();
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

  return {
    findMemberNumber,
    addFrequentPartner,
    sameGroup,
    handleSuggestionClick,
    handleGroupSuggestionClick,
    handleAddPlayerSuggestionClick,
    handleGroupSelectCourt,
    handleStreakAcknowledge,
    handleGroupJoinWaitlist,
  };
}
