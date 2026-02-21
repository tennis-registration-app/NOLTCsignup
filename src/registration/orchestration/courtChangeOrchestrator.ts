/**
 * Court Change Orchestrator
 * Moved from App.jsx
 */

export interface CourtChangeDeps {
  // Read values
  canChangeCourt: boolean;
  justAssignedCourt: number | null;
  replacedGroup: { players: any[]; endTime: any } | null;
  // Setters
  setOriginalCourtData: (data: any) => void;
  setShowSuccess: (show: boolean) => void;
  setIsChangingCourt: (changing: boolean) => void;
  setWasOvertimeCourt: (wasOvertime: boolean) => void;
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
