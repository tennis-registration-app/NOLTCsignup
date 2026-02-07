/**
 * Reset Orchestrators
 * Moved from App.jsx — WP5.5 facade extraction
 *
 * DEPENDENCY CHECKLIST for resetFormOrchestrated:
 * Reads: (none - pure reset)
 *
 * Calls (setters - approximately 35):
 *   - setCurrentGroup
 *   - setShowSuccess
 *   - setMemberNumber
 *   - setCurrentMemberId
 *   - setJustAssignedCourt
 *   - setAssignedSessionId
 *   - setAssignedEndTime
 *   - setReplacedGroup
 *   - setDisplacement
 *   - setOriginalCourtData
 *   - setCanChangeCourt
 *   - setIsTimeLimited
 *   - setCurrentScreen
 *   - setSearchInput
 *   - setShowSuggestions
 *   - setShowAddPlayer
 *   - setAddPlayerSearch
 *   - setShowAddPlayerSuggestions
 *   - setHasWaitlistPriority
 *   - setCurrentWaitlistEntryId
 *   - setWaitlistPosition
 *   - setSelectedCourtToClear
 *   - setClearCourtStep
 *   - setIsChangingCourt
 *   - setWasOvertimeCourt
 *   - setCourtToMove
 *   - setHasAssignedCourt
 *   - setShowGuestForm
 *   - setGuestName
 *   - setGuestSponsor
 *   - setShowGuestNameError
 *   - setShowSponsorError
 *   - setRegistrantStreak
 *   - setShowStreakModal
 *   - setStreakAcknowledged
 *
 * Calls (helpers):
 *   - clearCache
 *   - clearSuccessResetTimer
 *
 * Returns: void (same as original)
 *
 * ---
 *
 * DEPENDENCY CHECKLIST for applyInactivityTimeoutOrchestrated:
 * Reads: (none - pure reset)
 *
 * Calls: Same setters as resetForm plus any additional privacy-related state
 *
 * Calls (helpers):
 *   - clearSuccessResetTimer
 *
 * Returns: void (same as original)
 */

export function resetFormOrchestrated(deps) {
  // WP4-2: Grouped deps structure — { actions, services }
  const {
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
    services: { clearCache, clearSuccessResetTimer },
  } = deps;

  // ===== ORIGINAL resetForm FUNCTION BODY (VERBATIM) =====
  console.log('[RESET] resetForm() called at', new Date().toISOString());
  // Clear any pending success timer to prevent stale callbacks
  clearSuccessResetTimer();

  setCurrentGroup([]);
  setShowSuccess(false);
  setMemberNumber('');
  setCurrentMemberId(null);
  setJustAssignedCourt(null);
  setAssignedSessionId(null); // Clear session ID from previous assignment
  setAssignedEndTime(null); // Clear end time from previous assignment
  setReplacedGroup(null);
  setDisplacement(null);
  setOriginalCourtData(null);
  setCanChangeCourt(false);
  setIsTimeLimited(false);
  setCurrentScreen('home', 'resetForm');
  setSearchInput('');
  setShowSuggestions(false);
  setShowAddPlayer(false);
  setAddPlayerSearch('');
  setShowAddPlayerSuggestions(false);
  setHasWaitlistPriority(false);
  setCurrentWaitlistEntryId(null); // Clear waitlist entry ID
  setWaitlistPosition(0); // Reset API waitlist position
  // NOTE: Do NOT clear mobile-waitlist-entry-id here - user is still on waitlist
  // It should only be cleared when they successfully get assigned a court
  setSelectedCourtToClear(null);
  setClearCourtStep(1);
  setIsChangingCourt(false);
  setWasOvertimeCourt(false);
  setCourtToMove(null);
  setHasAssignedCourt(false);
  clearCache(); // Clear frequent partners cache (WP5.3 R8b.3)
  setShowGuestForm(false);
  setGuestName('');
  setGuestSponsor('');
  setShowGuestNameError(false);
  setShowSponsorError(false);
  // Reset uncleared session tracking
  setRegistrantStreak(0);
  setShowStreakModal(false);
  setStreakAcknowledged(false);
  // ===== END ORIGINAL FUNCTION BODY =====
}

export function applyInactivityTimeoutOrchestrated(deps) {
  const {
    // Setters
    setCurrentGroup,
    setShowSuccess,
    setMemberNumber,
    setCurrentMemberId,
    setJustAssignedCourt,
    setReplacedGroup,
    setDisplacement,
    setOriginalCourtData,
    setCanChangeCourt,
    setIsTimeLimited,
    setCurrentScreen,
    setAssignedSessionId,
    setAssignedEndTime,
    setCurrentWaitlistEntryId,
    setWaitlistPosition,
    setCourtToMove,
    setHasAssignedCourt,
    setShowGuestForm,
    setGuestName,
    setGuestSponsor,
    setRegistrantStreak,
    setShowStreakModal,
    setStreakAcknowledged,
    setSearchInput,
    setShowSuggestions,
    setShowAddPlayer,
    setAddPlayerSearch,
    setShowAddPlayerSuggestions,
    setHasWaitlistPriority,
    setSelectedCourtToClear,
    setClearCourtStep,
    setIsChangingCourt,
    setWasOvertimeCourt,
    // Helpers
    clearSuccessResetTimer,
  } = deps;

  // ===== ORIGINAL applyInactivityTimeoutExitSequence FUNCTION BODY (VERBATIM) =====
  clearSuccessResetTimer(); // Prevent delayed timer firing after timeout

  // === Original timeout sequence (preserved order) ===
  setCurrentGroup([]);
  setShowSuccess(false);
  setMemberNumber('');
  setCurrentMemberId(null);
  setJustAssignedCourt(null);
  setReplacedGroup(null);
  setDisplacement(null);
  setOriginalCourtData(null);
  setCanChangeCourt(false);
  setIsTimeLimited(false);
  setCurrentScreen('home', 'sessionTimeout');

  // Phase 3.3b: Clear privacy-sensitive and flow state after navigation
  setAssignedSessionId(null);
  setAssignedEndTime(null);
  setCurrentWaitlistEntryId(null);
  setWaitlistPosition(0);
  setCourtToMove(null);
  setHasAssignedCourt(false);
  setShowGuestForm(false);
  setGuestName('');
  setGuestSponsor('');
  setRegistrantStreak(0);
  setShowStreakModal(false);
  setStreakAcknowledged(false);

  // === Continue original sequence ===
  setSearchInput('');
  setShowSuggestions(false);
  setShowAddPlayer(false);
  setAddPlayerSearch('');
  setShowAddPlayerSuggestions(false);
  setHasWaitlistPriority(false);
  setSelectedCourtToClear(null);
  setClearCourtStep(1);
  setIsChangingCourt(false);
  setWasOvertimeCourt(false);
  // ===== END ORIGINAL FUNCTION BODY =====
}
