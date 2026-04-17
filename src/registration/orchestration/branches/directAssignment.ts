/**
 * Direct assignment branch.
 *
 * Handles the case where there is no waitlist entry — assigns the court
 * directly via assignCourtWithPlayers. Called from assignCourtToGroupOrchestrated
 * after the guard gauntlet and block-conflict check.
 */

import { DenialCodes } from '../../../lib/backend/types';
import { normalizeError } from '../../../lib/errors/normalizeError';
import { toast } from '../../../shared/utils/toast.js';
import { createOrchestrationDeps } from '../deps/index.js';
import {
  normalizeCommandSession,
  applySuccessState,
  startAutoResetTimer,
} from '../helpers/successState.js';
import type { AssignCourtResponse, GroupPlayer } from '../../../types/appTypes.js';
import type { AssignCourtDeps } from '../assignCourtOrchestrator.js';

const getRuntimeDeps = (() => {
  let _deps: ReturnType<typeof createOrchestrationDeps> | undefined;
  return () => (_deps ??= createOrchestrationDeps());
})();

export async function executeDirectAssignment(
  courtNumber: number,
  selectableCountAtSelection: number | null,
  allPlayers: GroupPlayer[],
  deps: AssignCourtDeps
): Promise<void> {
  const { state, actions, services } = deps;

  // Get court UUID from court number
  const court = state.courts.find((c) => c.number === courtNumber);
  if (!court) {
    getRuntimeDeps().logger.error('AssignCourt', 'Court not found for number', courtNumber);
    toast('Court not found. Please refresh and try again.', { type: 'error' });
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Determine group type from player count
  const groupType = allPlayers.length <= 3 ? 'singles' : 'doubles';

  actions.setIsAssigning(true); // Set before async work to close the double-submit window
  // Get geolocation for mobile (required by backend for geofence validation)
  const mobileLocation = await services.getMobileGeolocation();

  const assignStartTime = performance.now();
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    '[T+0ms] Calling backend.commands.assignCourtWithPlayers',
    {
      courtId: court.id,
      courtNumber: court.number,
      groupType,
      playerCount: allPlayers.length,
      mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
    }
  );
  let result: AssignCourtResponse;
  try {
    result = await services.backend.commands.assignCourtWithPlayers({
      courtId: court.id,
      players: allPlayers as GroupPlayer[],
      groupType,
      ...(mobileLocation || {}), // Spread latitude/longitude if available
    });
    const apiDuration = Math.round(performance.now() - assignStartTime);
    getRuntimeDeps().logger.debug(
      'AssignCourt',
      `[T+${apiDuration}ms] Court assigned result`,
      result
    );
  } catch (error: unknown) {
    const meta = normalizeError(error);
    const apiDuration = Math.round(performance.now() - assignStartTime);
    getRuntimeDeps().logger.error(
      'AssignCourt',
      `[T+${apiDuration}ms] assignCourtWithPlayers threw error`,
      { category: meta.category, code: meta.code, message: meta.message }
    );
    toast(error instanceof Error ? error.message : 'Failed to assign court. Please try again.', {
      type: 'error',
    });
    actions.setIsAssigning(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  if (!result.ok) {
    getRuntimeDeps().logger.debug('AssignCourt', 'assignCourtWithPlayers returned ok:false', {
      code: result.code,
      message: result.message,
    });
    // Handle "Court occupied" race condition
    if (result.code === DenialCodes.COURT_OCCUPIED) {
      toast('This court was just taken. Refreshing...', { type: 'warning' });
      // Board subscription will auto-refresh, but force immediate refresh
      await services.backend.queries.refresh();
      actions.setIsAssigning(false);
      // FEEDBACK: toast provides user feedback above
      return;
    }
    // Handle mobile location errors - offer QR fallback
    if (state.API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
      actions.setGpsFailedPrompt(true);
      actions.setIsAssigning(false);
      // FEEDBACK: GPS prompt modal provides user feedback
      return;
    }
    toast(result.message || 'Failed to assign court', { type: 'error' });
    actions.setIsAssigning(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Success - clear the assigning flag
  actions.setIsAssigning(false);

  // Success! Update UI state, then refresh board for fresh data
  const successTime = Math.round(performance.now() - assignStartTime);
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    `[T+${successTime}ms] Court assignment successful, updating UI state...`
  );

  // Determine if court change should be allowed
  // If only one court was selectable when user chose, no change option
  const allowCourtChange =
    selectableCountAtSelection !== null ? selectableCountAtSelection > 1 : false;

  // Construct replacedGroup from displacement.participants for SuccessScreen messaging
  const replacedGroupFromDisplacement =
    (result.displacement?.participants?.length ?? 0) > 0
      ? {
          players: result.displacement!.participants.map((name: string) => ({ name })),
          endTime: result.displacement!.restoreUntil,
        }
      : null;

  // Normalize command session to camelCase (backend may return scheduled_end_at)
  const session = normalizeCommandSession(result.session);

  // Update UI state based on result
  applySuccessState(actions, {
    courtNumber,
    sessionId: session.id,
    scheduledEndAt: session.scheduledEndAt,
    replacedGroup: replacedGroupFromDisplacement,
    displacement: result.displacement ?? null, // Will be null if no overtime was displaced
    canChangeCourt: allowCourtChange, // Only true if alternatives exist
  });
  // Direct-assign-only state
  actions.setChangeTimeRemaining(state.CONSTANTS.CHANGE_COURT_TIMEOUT_SEC);
  actions.setIsTimeLimited(result.isTimeLimited || result.isInheritedEndTime || false);
  actions.setTimeLimitReason(result.timeLimitReason || (result.isTimeLimited ? 'block' : null));

  const uiUpdateTime = Math.round(performance.now() - assignStartTime);
  getRuntimeDeps().logger.debug(
    'AssignCourt',
    `[T+${uiUpdateTime}ms] UI state updated, showSuccess=true`
  );

  startAutoResetTimer(state, services);

  if (allowCourtChange) {
    // Any prior countdown is stale — clear before starting a new one
    if (state.changeCourtTimerRef.current) {
      clearInterval(state.changeCourtTimerRef.current);
    }
    const timer = setInterval(() => {
      actions.setChangeTimeRemaining((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer);
          state.changeCourtTimerRef.current = null;
          actions.setCanChangeCourt(false);
          // Don't call resetForm() - let user decide when to leave
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    state.changeCourtTimerRef.current = timer;
  }

  // Explicit refresh to ensure fresh state (belt-and-suspenders with Realtime)
  try {
    await services.backend.queries.refresh();
  } catch {
    // Refresh is best-effort; board subscription will catch up
  }
}
