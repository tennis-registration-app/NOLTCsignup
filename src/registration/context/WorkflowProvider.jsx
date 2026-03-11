/**
 * WorkflowProvider — owns per-registration-flow state.
 *
 * All state in this provider resets when the parent bumps the React `key` prop.
 * This replaces 23 explicit setter calls in resetOrchestrator.ts.
 *
 * Step 1 scope:
 *   Hooks:   useGroupGuest, useStreak, useCourtAssignmentResult, useMemberIdentity
 *   useState: 15 fields moved from useRegistrationUiState
 *
 * Shell state (navigation, board data, alerts, mobile, search, guestCounter,
 * session timeout) remains outside this provider.
 */

import React, { createContext, useContext, useState } from 'react';
import { TENNIS_CONFIG } from '@lib';

// Domain hooks — zero or single-dep, all reset on remount
import { useGroupGuest } from '../group/useGroupGuest';
import { useStreak } from '../streak/useStreak';
import { useCourtAssignmentResult } from '../court/useCourtAssignmentResult';
import { useMemberIdentity } from '../memberIdentity/useMemberIdentity';

const WorkflowContext = createContext(null);

export function WorkflowProvider(/** @type {any} */ { backend, children }) {
  // ===== HOOKS (4) — remount resets all internal useReducer state =====
  const groupGuest = useGroupGuest();
  const streak = useStreak();
  const courtAssignment = useCourtAssignmentResult();
  const memberIdentity = useMemberIdentity({ backend });

  // ===== useState FIELDS (15) — remount resets to initial values =====

  // Waitlist
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [hasWaitlistPriority, setHasWaitlistPriority] = useState(false);
  const [currentWaitlistEntryId, setCurrentWaitlistEntryId] = useState(null);

  // Async operation flags
  const [isAssigning, setIsAssigning] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);

  // Success/assignment result
  const [replacedGroup, setReplacedGroup] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  const [originalCourtData, setOriginalCourtData] = useState(null);

  // Court change
  const [canChangeCourt, setCanChangeCourt] = useState(false);
  const [changeTimeRemaining, setChangeTimeRemaining] = useState(
    TENNIS_CONFIG.TIMING.CHANGE_COURT_TIMEOUT_SEC
  );
  const [isChangingCourt, setIsChangingCourt] = useState(false);
  const [, setWasOvertimeCourt] = useState(false);

  // Time limit
  const [isTimeLimited, setIsTimeLimited] = useState(false);
  const [timeLimitReason, setTimeLimitReason] = useState(null);

  // UI flags
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const value = {
    // Hooks
    groupGuest,
    streak,
    courtAssignment,
    memberIdentity,

    // Waitlist state + setters
    waitlistPosition,
    setWaitlistPosition,
    hasWaitlistPriority,
    setHasWaitlistPriority,
    currentWaitlistEntryId,
    setCurrentWaitlistEntryId,

    // Async flags
    isAssigning,
    setIsAssigning,
    isJoiningWaitlist,
    setIsJoiningWaitlist,

    // Success/assignment
    replacedGroup,
    setReplacedGroup,
    displacement,
    setDisplacement,
    originalCourtData,
    setOriginalCourtData,

    // Court change
    canChangeCourt,
    setCanChangeCourt,
    changeTimeRemaining,
    setChangeTimeRemaining,
    isChangingCourt,
    setIsChangingCourt,
    setWasOvertimeCourt,

    // Time limit
    isTimeLimited,
    setIsTimeLimited,
    timeLimitReason,
    setTimeLimitReason,

    // UI flags
    showAddPlayer,
    setShowAddPlayer,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

/**
 * Read workflow state from context.
 * Must be called inside WorkflowProvider.
 */
export function useWorkflowContext() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflowContext must be used within WorkflowProvider');
  }
  return ctx;
}
