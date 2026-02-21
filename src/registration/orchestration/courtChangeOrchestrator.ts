/**
 * Court Change Orchestrator
 * Moved from App.jsx
 */

import type { ReplacedGroup, OriginalCourtData, Setter } from '../../types/appTypes.js';

export interface CourtChangeDeps {
  // Read values
  canChangeCourt: boolean;
  justAssignedCourt: number | null;
  replacedGroup: ReplacedGroup | null;
  // Setters
  setOriginalCourtData: Setter<OriginalCourtData | null>;
  setShowSuccess: Setter<boolean>;
  setIsChangingCourt: Setter<boolean>;
  setWasOvertimeCourt: Setter<boolean>;
  setCurrentScreen: (screen: string, reason: string) => void;
}

export function changeCourtOrchestrated(deps: CourtChangeDeps): void {
  const {
    // Read values
    canChangeCourt,
    justAssignedCourt,
    replacedGroup,
    // Setters
    setOriginalCourtData,
    setShowSuccess,
    setIsChangingCourt,
    setWasOvertimeCourt,
    setCurrentScreen,
  } = deps;

  // ===== ORIGINAL FUNCTION BODY (VERBATIM) =====
  if (!canChangeCourt || !justAssignedCourt) return;

  // Store the original court data if it was an overtime court we replaced
  if (replacedGroup) {
    // We had replaced an overtime court - restore the original group
    setOriginalCourtData({
      players: replacedGroup.players,
      startTime: null, // We don't have the original start time
      endTime: replacedGroup.endTime,
      assignedAt: null,
      duration: null,
    });
  }

  // Check if we're leaving an overtime court selection
  const wasOvertime = replacedGroup !== null;

  // Don't clear the court yet - just navigate to selection
  setShowSuccess(false);
  setIsChangingCourt(true);
  setWasOvertimeCourt(wasOvertime);
  setCurrentScreen('court', 'changeCourt');
  // ===== END ORIGINAL FUNCTION BODY =====
}
