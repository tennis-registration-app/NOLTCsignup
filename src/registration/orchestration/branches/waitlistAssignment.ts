/**
 * Waitlist assignment branch.
 *
 * Handles the case where currentWaitlistEntryId is set — assigns the user
 * directly from the waitlist entry rather than performing a fresh court search.
 * Called from assignCourtToGroupOrchestrated after the guard gauntlet.
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
import type { AssignCourtDeps } from '../assignCourtOrchestrator.js';

const getRuntimeDeps = (() => {
  let _deps: ReturnType<typeof createOrchestrationDeps> | undefined;
  return () => (_deps ??= createOrchestrationDeps());
})();

export async function executeWaitlistAssignment(
  courtNumber: number,
  deps: AssignCourtDeps
): Promise<void> {
  const { state, actions, services } = deps;

  actions.setIsAssigning(true); // Guard against double-submit in waitlist path
  // Get court UUID for the waitlist assignment
  const waitlistCourt = state.courts.find((c) => c.number === courtNumber);
  if (!waitlistCourt) {
    getRuntimeDeps().logger.error(
      'AssignCourt',
      'Court not found for waitlist assignment',
      courtNumber
    );
    toast('Court not found. Please refresh and try again.', { type: 'error' });
    // FEEDBACK: toast provides user feedback above
    actions.setIsAssigning(false);
    return;
  }

  // Get geolocation for mobile (required by backend for geofence validation)
  const waitlistMobileLocation = await services.getMobileGeolocation();

  try {
    const result = await services.backend.commands.assignFromWaitlist({
      waitlistEntryId: state.currentWaitlistEntryId!,
      courtId: waitlistCourt.id,
      ...(waitlistMobileLocation || {}),
    });
    getRuntimeDeps().logger.debug('AssignCourt', 'Waitlist group assigned result', result);

    if (!result.ok) {
      // Handle "Court occupied" race condition
      if (result.code === DenialCodes.COURT_OCCUPIED) {
        toast('This court was just taken. Refreshing...', { type: 'warning' });
        actions.setCurrentWaitlistEntryId(null);
        await services.backend.queries.refresh();
        // FEEDBACK: toast provides user feedback above
        actions.setIsAssigning(false);
        return;
      }
      // Handle mobile location errors - offer QR fallback
      if (state.API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
        actions.setGpsFailedPrompt(true);
        // FEEDBACK: GPS prompt modal provides user feedback
        actions.setIsAssigning(false);
        return;
      }
      toast(result.message || 'Failed to assign court from waitlist', {
        type: 'error',
      });
      actions.setCurrentWaitlistEntryId(null);
      // FEEDBACK: toast provides user feedback above
      actions.setIsAssigning(false);
      return;
    }

    // Clear the waitlist entry ID after successful assignment
    actions.setCurrentWaitlistEntryId(null);
    actions.setHasWaitlistPriority(false);
    // Also clear mobile sessionStorage waitlist entry
    sessionStorage.removeItem('mobile-waitlist-entry-id');

    // Board subscription will auto-refresh
    getRuntimeDeps().logger.debug(
      'AssignCourt',
      'Waitlist assignment successful, waiting for board refresh signal'
    );

    // Normalize command session to camelCase (backend may return scheduled_end_at)
    const session = normalizeCommandSession(result.session);

    // Update currentGroup with participant details for ball purchases
    if (session.participantDetails) {
      const groupFromWaitlist = session.participantDetails.map((p) => ({
        id: p.memberId,
        memberNumber: p.memberId,
        name: p.name,
        accountId: p.accountId,
        isGuest: p.isGuest,
      }));
      actions.setCurrentGroup(groupFromWaitlist);
    }

    // Update UI state
    applySuccessState(actions, {
      courtNumber,
      sessionId: session.id,
      scheduledEndAt: session.scheduledEndAt,
      replacedGroup: null,
      displacement: null,
      canChangeCourt: false, // Waitlist groups typically don't get court change option
    });

    startAutoResetTimer(state, services);

    // Explicit refresh to ensure fresh state (belt-and-suspenders with Realtime).
    // Best-effort only: the assignment already succeeded above; a refresh
    // failure must not surface as "Failed to assign court from waitlist".
    try {
      await services.backend.queries.refresh();
    } catch (refreshError) {
      getRuntimeDeps().logger.warn(
        'AssignCourt',
        'Post-waitlist-assignment refresh failed (assignment still succeeded)',
        refreshError
      );
    }

    // EARLY-EXIT: waitlist flow complete — success screen shown
    actions.setIsAssigning(false);
    return;
  } catch (error: unknown) {
    const meta = normalizeError(error);
    getRuntimeDeps().logger.error('AssignCourt', 'assignFromWaitlist failed', {
      category: meta.category,
      code: meta.code,
      message: meta.message,
    });
    actions.setCurrentWaitlistEntryId(null);
    toast(error instanceof Error ? error.message : 'Failed to assign court from waitlist', {
      type: 'error',
    });
    // FEEDBACK: toast provides user feedback above
    actions.setIsAssigning(false);
    return;
  }
}
