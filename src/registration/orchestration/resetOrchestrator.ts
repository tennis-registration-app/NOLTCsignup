/**
 * Reset Orchestrators
 * Moved from App.jsx
 */

import { logger } from '../../lib/logger.js';

export interface ResetFormActions {
  setCurrentGroup: (v: any[]) => void;
  setShowSuccess: (v: boolean) => void;
  setMemberNumber: (v: string) => void;
  setCurrentMemberId: (v: string | null) => void;
  setJustAssignedCourt: (v: number | null) => void;
  setAssignedSessionId: (v: string | null) => void;
  setAssignedEndTime: (v: string | null) => void;
  setReplacedGroup: (v: any) => void;
  setDisplacement: (v: any) => void;
  setOriginalCourtData: (v: any) => void;
  setCanChangeCourt: (v: boolean) => void;
  setIsTimeLimited: (v: boolean) => void;
  setCurrentScreen: (screen: string, reason: string) => void;
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setShowAddPlayer: (v: boolean) => void;
  setAddPlayerSearch: (v: string) => void;
  setShowAddPlayerSuggestions: (v: boolean) => void;
  setHasWaitlistPriority: (v: boolean) => void;
  setCurrentWaitlistEntryId: (v: string | null) => void;
  setWaitlistPosition: (v: number) => void;
  setSelectedCourtToClear: (v: number | null) => void;
  setClearCourtStep: (v: number) => void;
  setIsChangingCourt: (v: boolean) => void;
  setWasOvertimeCourt: (v: boolean) => void;
  setCourtToMove: (v: any) => void;
  setHasAssignedCourt: (v: boolean) => void;
  setShowGuestForm: (v: boolean) => void;
  setGuestName: (v: string) => void;
  setGuestSponsor: (v: string) => void;
  setShowGuestNameError: (v: boolean) => void;
  setShowSponsorError: (v: boolean) => void;
  setRegistrantStreak: (v: number) => void;
  setShowStreakModal: (v: boolean) => void;
  setStreakAcknowledged: (v: boolean) => void;
}

export interface ResetFormServices {
  clearCache: () => void;
  clearSuccessResetTimer: () => void;
  refresh?: () => Promise<any>;
}

export interface ResetFormDeps {
  actions: ResetFormActions;
  services: ResetFormServices;
}

export async function resetFormOrchestrated(deps: ResetFormDeps): Promise<void> {
  // Grouped deps structure — { actions, services }
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
  logger.info('RESET', 'resetForm() called at', new Date().toISOString());
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
  clearCache(); // Clear frequent partners cache
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

  // Force-refresh board data so HomeScreen shows fresh state immediately
  if (deps.services.refresh) {
    try {
      await deps.services.refresh();
    } catch (e) {
      console.warn('[RESET] Board refresh after reset failed:', e);
    }
  }
}

export interface InactivityTimeoutDeps {
  // Setters
  setCurrentGroup: (v: any[]) => void;
  setShowSuccess: (v: boolean) => void;
  setMemberNumber: (v: string) => void;
  setCurrentMemberId: (v: string | null) => void;
  setJustAssignedCourt: (v: number | null) => void;
  setReplacedGroup: (v: any) => void;
  setDisplacement: (v: any) => void;
  setOriginalCourtData: (v: any) => void;
  setCanChangeCourt: (v: boolean) => void;
  setIsTimeLimited: (v: boolean) => void;
  setCurrentScreen: (screen: string, reason: string) => void;
  setAssignedSessionId: (v: string | null) => void;
  setAssignedEndTime: (v: string | null) => void;
  setCurrentWaitlistEntryId: (v: string | null) => void;
  setWaitlistPosition: (v: number) => void;
  setCourtToMove: (v: any) => void;
  setHasAssignedCourt: (v: boolean) => void;
  setShowGuestForm: (v: boolean) => void;
  setGuestName: (v: string) => void;
  setGuestSponsor: (v: string) => void;
  setRegistrantStreak: (v: number) => void;
  setShowStreakModal: (v: boolean) => void;
  setStreakAcknowledged: (v: boolean) => void;
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setShowAddPlayer: (v: boolean) => void;
  setAddPlayerSearch: (v: string) => void;
  setShowAddPlayerSuggestions: (v: boolean) => void;
  setHasWaitlistPriority: (v: boolean) => void;
  setSelectedCourtToClear: (v: number | null) => void;
  setClearCourtStep: (v: number) => void;
  setIsChangingCourt: (v: boolean) => void;
  setWasOvertimeCourt: (v: boolean) => void;
  // Helpers
  clearSuccessResetTimer: () => void;
  refresh?: () => Promise<any>;
}

export async function applyInactivityTimeoutOrchestrated(
  deps: InactivityTimeoutDeps
): Promise<void> {
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

  // Force-refresh board data so HomeScreen shows fresh state immediately
  if (deps.refresh) {
    try {
      await deps.refresh();
    } catch (e) {
      console.warn('[TIMEOUT] Board refresh after inactivity timeout failed:', e);
    }
  }
}
