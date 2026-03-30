/**
 * Waitlist Presenter
 *
 * Pure functions that structure the controller domain objects
 * into the shape needed by WaitlistSection rendering.
 *
 * Extracted from WaitlistSection.jsx -- maintains exact prop mapping.
 */

import type {
  createWaitlistModel,
  createWaitlistActions,
} from '../types/domainObjects';

type WaitlistModel = ReturnType<typeof createWaitlistModel>;
type WaitlistActions = ReturnType<typeof createWaitlistActions>;

/**
 * Build the data props for WaitlistSection.
 */
export function buildWaitlistModel(waitlistModel: WaitlistModel) {
  return {
    waitingGroups: waitlistModel.waitingGroups,
  };
}

/**
 * Build the action/callback props for WaitlistSection.
 */
export function buildWaitlistActions(waitlistActions: WaitlistActions) {
  return {
    moveInWaitlist: waitlistActions.moveInWaitlist,
    removeFromWaitlist: waitlistActions.removeFromWaitlist,
  };
}
