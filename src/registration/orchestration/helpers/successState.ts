/**
 * Shared success-state helpers used by both assignment branches.
 *
 * Extracted from assignCourtOrchestrator.ts — do not add business logic here.
 */

import type { ReplacedGroup, DisplacementInfo } from '../../../types/appTypes.js';
import type {
  AssignCourtActions,
  AssignCourtState,
  AssignCourtServices,
} from '../assignCourtOrchestrator.js';

/** Normalize a command-response session so downstream code uses only camelCase scheduledEndAt. */
export function normalizeCommandSession(raw?: {
  id?: string;
  scheduled_end_at?: string;
  scheduledEndAt?: string;
  participantDetails?: Array<{
    memberId: string;
    name: string;
    accountId: string;
    isGuest: boolean;
  }>;
}): {
  id: string | null;
  scheduledEndAt: string | null;
  participantDetails?: Array<{
    memberId: string;
    name: string;
    accountId: string;
    isGuest: boolean;
  }>;
} {
  if (!raw) return { id: null, scheduledEndAt: null };
  return {
    id: raw.id || null,
    scheduledEndAt: raw.scheduled_end_at || raw.scheduledEndAt || null,
    participantDetails: raw.participantDetails,
  };
}

export interface SuccessStateParams {
  courtNumber: number;
  sessionId: string | null;
  scheduledEndAt: string | null;
  replacedGroup: ReplacedGroup | null;
  displacement: DisplacementInfo | null;
  canChangeCourt: boolean;
}

/** Sets the shared success-screen state used by both waitlist and direct-assign branches. */
export function applySuccessState(actions: AssignCourtActions, params: SuccessStateParams): void {
  actions.setJustAssignedCourt(params.courtNumber);
  actions.setAssignedSessionId(params.sessionId);
  actions.setAssignedEndTime(params.scheduledEndAt);
  actions.setReplacedGroup(params.replacedGroup);
  actions.setDisplacement(params.displacement);
  actions.setOriginalCourtData(null);
  actions.setIsChangingCourt(false);
  actions.setWasOvertimeCourt(false);
  actions.setHasAssignedCourt(true);
  actions.setCanChangeCourt(params.canChangeCourt);
  actions.setShowSuccess(true);
}

/** Starts the auto-reset timer that fires resetForm after delayMs (desktop only). */
export function startAutoResetTimer(
  state: AssignCourtState,
  services: Pick<AssignCourtServices, 'clearSuccessResetTimer' | 'resetForm'>
): void {
  if (state.mobileFlow) return;
  services.clearSuccessResetTimer();
  state.successResetTimerRef.current = setTimeout(() => {
    state.successResetTimerRef.current = null;
    services.resetForm();
  }, state.CONSTANTS.AUTO_RESET_SUCCESS_MS);
}
