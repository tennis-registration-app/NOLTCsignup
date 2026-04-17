/**
 * Assign Court Orchestrator
 *
 * Thin dispatcher: runs the guard gauntlet and block-conflict check,
 * then delegates to the appropriate assignment branch.
 *
 * Conceptual stages (in execution order):
 *
 *   1. GUARD GAUNTLET — five sequential early-exit guards:
 *        double-submit prevention → operating hours → court number validity
 *        → group has players → group compatibility (domain rules)
 *
 *   2. PLAYER NORMALIZATION — splits currentGroup into two arrays
 *        (members-only for domain validation, all players for assignment),
 *        derives session duration from player count.
 *
 *   3. BLOCK-CONFLICT CHECK — async: fetches upcoming block on selected court;
 *        if the block starts before the session would end, prompts to confirm.
 *        See helpers/blockConflictCheck.ts.
 *
 *   4. WAITLIST BRANCH (early-exit) — when currentWaitlistEntryId is set,
 *        calls assignFromWaitlist, clears waitlist state, shows success, returns.
 *        See branches/waitlistAssignment.ts.
 *
 *   5. DIRECT ASSIGNMENT — calls assignCourtWithPlayers; handles denial codes
 *        (COURT_OCCUPIED → refresh, GPS failure → fallback prompt).
 *        See branches/directAssignment.ts.
 *
 * Safe modification protocol:
 *   - Run the test suite first: tests/unit/orchestration/assignCourtOrchestrator.test.ts
 *   - Add a failing test before changing behaviour (guards, denial codes, success state)
 *   - Do not reorder stages — guards must run before normalization, normalization
 *     before the branch split, branch split before direct assignment
 */

import { createOrchestrationDeps } from './deps/index.js';
import { durationForGroupSize } from '../../lib/dateUtils';
import {
  guardNotAssigning,
  guardOperatingHours,
  guardCourtNumber,
  guardGroup,
  guardGroupCompat,
} from './helpers/index.js';
import { runBlockConflictCheck } from './helpers/blockConflictCheck.js';
import { executeWaitlistAssignment } from './branches/waitlistAssignment.js';
import { executeDirectAssignment } from './branches/directAssignment.js';
import { toast } from '../../shared/utils/toast.js';
import type {
  RegistrationConstants,
  ApiConfig,
  TennisBackendShape,
  Setter,
  GroupPlayer,
  DomainCourt,
  OperatingHoursEntry,
  ReplacedGroup,
  DisplacementInfo,
  OriginalCourtData,
  CourtBlockStatusResult,
} from '../../types/appTypes.js';

export interface AssignCourtState {
  isAssigning: boolean;
  mobileFlow: boolean;
  preselectedCourt: number | null;
  operatingHours: OperatingHoursEntry[] | null;
  currentGroup: GroupPlayer[];
  courts: DomainCourt[];
  currentWaitlistEntryId: string | null;
  CONSTANTS: RegistrationConstants;
  API_CONFIG: ApiConfig;
  successResetTimerRef: { current: ReturnType<typeof setTimeout> | null };
  changeCourtTimerRef: { current: ReturnType<typeof setInterval> | null };
}

export interface AssignCourtActions {
  setIsAssigning: (v: boolean) => void;
  setCurrentWaitlistEntryId: (v: string | null) => void;
  setHasWaitlistPriority: (v: boolean) => void;
  setCurrentGroup: Setter<GroupPlayer[]>;
  setJustAssignedCourt: Setter<number>;
  setAssignedSessionId: Setter<string | null>;
  setAssignedEndTime: Setter<string | null>;
  setReplacedGroup: Setter<ReplacedGroup | null>;
  setDisplacement: Setter<DisplacementInfo | null>;
  setOriginalCourtData: Setter<OriginalCourtData | null>;
  setIsChangingCourt: (v: boolean) => void;
  setWasOvertimeCourt: (v: boolean) => void;
  setHasAssignedCourt: (v: boolean) => void;
  setCanChangeCourt: (v: boolean) => void;
  setChangeTimeRemaining: (v: number | ((prev: number) => number)) => void;
  setIsTimeLimited: (v: boolean) => void;
  setTimeLimitReason: (v: string | null) => void;
  setShowSuccess: (v: boolean) => void;
  setGpsFailedPrompt: (v: boolean) => void;
}

export interface AssignCourtServices {
  backend: Pick<TennisBackendShape, 'commands' | 'queries'>;
  getCourtBlockStatus: (courtNumber: number) => CourtBlockStatusResult | null;
  getMobileGeolocation: () => Promise<{
    latitude?: number;
    longitude?: number;
    location_token?: string;
  } | null>;
  validateGroupCompat: (
    players: Pick<GroupPlayer, 'id' | 'name'>[],
    guests: number
  ) => { ok: boolean; errors: string[] };
  clearSuccessResetTimer: () => void;
  resetForm: () => void;
}

export interface AssignCourtUI {
  showAlertMessage: (message: string) => void;
  confirm?: (msg: string) => boolean;
}

export interface AssignCourtDeps {
  state: AssignCourtState;
  actions: AssignCourtActions;
  services: AssignCourtServices;
  ui: AssignCourtUI;
}

// =============================================================================
export async function assignCourtToGroupOrchestrated(
  courtNumber: number | null | undefined,
  selectableCountAtSelection: number | null,
  deps: AssignCourtDeps
): Promise<void> {
  const { state, services, ui } = deps;

  // Lazy runtime deps — initialised on first use, after fast-fail guards
  let _runtimeDeps: ReturnType<typeof createOrchestrationDeps> | undefined;
  const getRuntimeDeps = () => (_runtimeDeps ??= createOrchestrationDeps());

  // ===== GUARD SECTION =====

  // Guard 1: Prevent double-submit (silent)
  const assigningCheck = guardNotAssigning(state.isAssigning);
  if (!assigningCheck.ok) {
    getRuntimeDeps().logger.debug(
      'AssignCourt',
      'Assignment already in progress, ignoring duplicate request'
    );
    // SILENT-GUARD: double-submit prevention — no user feedback needed
    return;
  }

  // Mobile: Use preselected court if in mobile flow
  if (state.mobileFlow && state.preselectedCourt && !courtNumber) {
    courtNumber = state.preselectedCourt;
    getRuntimeDeps().logger.debug('AssignCourt', 'Mobile: Using preselected court', courtNumber);
  }

  // Guard 2: Check operating hours (toast)
  const now = new Date();
  const hoursCheck = guardOperatingHours({
    operatingHours: state.operatingHours,
    currentHour: now.getHours(),
    currentMinutes: now.getMinutes(),
    dayOfWeek: now.getDay(),
  });
  if (!hoursCheck.ok) {
    if (hoursCheck.ui?.action === 'toast') {
      toast(
        hoursCheck.ui.args[0] as string,
        hoursCheck.ui.args[1] as
          | { type?: 'info' | 'error' | 'success' | 'warning'; duration?: number }
          | undefined
      );
    }
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Guard 3: Validate court number (alert)
  const courtCheck = guardCourtNumber({
    courtNumber,
    courtCount: state.CONSTANTS.COURT_COUNT,
  });
  if (!courtCheck.ok) {
    if (courtCheck.ui?.action === 'alert') {
      ui.showAlertMessage(courtCheck.ui.args[0]);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }
  // guardCourtNumber rejects null/undefined/out-of-range — narrow for TS
  if (courtNumber == null) return; // unreachable after guard, satisfies TS narrowing

  // Guard 4: Validate group has players (alert)
  const groupCheck = guardGroup({ currentGroup: state.currentGroup });
  if (!groupCheck.ok) {
    if (groupCheck.ui?.action === 'alert') {
      ui.showAlertMessage(groupCheck.ui.args[0]);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Create arrays for validation and assignment
  // Handle both field name formats: id/name (legacy) and memberId/displayName (API)
  const players = state.currentGroup
    .filter((p) => !p.isGuest) // Non-guests for validation
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
    }))
    .filter((p) => p && p.id && p.name);

  const allPlayers = state.currentGroup // ALL players including guests for court assignment
    .map((p) => ({
      id: String(p.id || p.memberId || '').trim(),
      name: String(p.name || p.displayName || '').trim(),
      ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
      ...(p.sponsor && { sponsor: p.sponsor }),
      ...(p.memberNumber && { memberNumber: p.memberNumber }),
    }))
    .filter((p) => p && p.id && p.name);

  const guests = state.currentGroup.filter((p) => p.isGuest).length;

  // Guard 5: Domain validation (alert)
  const compatCheck = guardGroupCompat({
    players,
    guests,
    validateGroupCompat: services.validateGroupCompat,
  });
  if (!compatCheck.ok) {
    if (compatCheck.ui?.action === 'alert') {
      ui.showAlertMessage(compatCheck.ui.args[0]);
    }
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Duration determined from group size (including guests)
  const duration = durationForGroupSize(allPlayers.length); // typically 60/90

  // Canonical group object (use allPlayers so guests appear on court)
  const group = { players: allPlayers, guests };

  // ===== BLOCK-CONFLICT CHECK =====
  const shouldProceed = await runBlockConflictCheck(courtNumber, duration, deps);
  if (!shouldProceed) return;

  getRuntimeDeps().logger.debug('AssignCourt', 'UI preparing to assignCourt with', {
    courtNumber,
    group,
    duration,
  });

  // ===== BRANCH DISPATCH =====

  if (state.currentWaitlistEntryId) {
    await executeWaitlistAssignment(courtNumber, deps);
    return;
  }

  await executeDirectAssignment(
    courtNumber,
    selectableCountAtSelection,
    allPlayers as GroupPlayer[],
    deps
  );
}
