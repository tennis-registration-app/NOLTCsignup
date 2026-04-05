/**
 * Block-conflict check helper.
 *
 * Called after the guard gauntlet to determine whether the selected court has
 * an upcoming block that would cut the session short. If a conflict exists and
 * the user declines to proceed, returns false (caller should abort assignment).
 */

import type { AssignCourtDeps } from '../assignCourtOrchestrator.js';

/**
 * Check whether an upcoming block conflicts with the requested session duration.
 *
 * @returns true if assignment should proceed, false if user cancelled
 */
export async function runBlockConflictCheck(
  courtNumber: number,
  duration: number,
  deps: AssignCourtDeps
): Promise<boolean> {
  const { services, ui } = deps;

  const blockStatus = await services.getCourtBlockStatus(courtNumber);
  if (blockStatus && !blockStatus.isCurrent && blockStatus.startTime) {
    const nowBlock = new Date();
    const blockStart = new Date(blockStatus.startTime);
    const sessionEnd = new Date(nowBlock.getTime() + duration * 60000);

    if (blockStart < sessionEnd) {
      const minutesUntilBlock = Math.ceil((blockStart.getTime() - nowBlock.getTime()) / 60000);
      const confirmMsg = `⚠️ This court has a block starting in ${minutesUntilBlock} minutes (${blockStatus.reason}). You may not get your full ${duration} minutes.\n\nDo you want to take this court anyway?`;

      if (!ui.confirm) throw new Error('AssignCourtUI.confirm not injected — wiring bug');
      const proceed = ui.confirm(confirmMsg);
      if (!proceed) {
        ui.showAlertMessage('Please select a different court or join the waitlist.');
        return false;
      }
    }
  }

  return true;
}
