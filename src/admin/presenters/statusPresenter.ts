/**
 * Status Presenter
 *
 * Pure functions that transform controller domain objects into the props
 * needed by StatusSection two children:
 * 1. CourtStatusGrid receives domain objects directly (pass-through)
 * 2. Inline waitlist UI receives extracted data/actions
 *
 * Extracted from StatusSection.jsx -- maintains exact prop mapping.
 */

import type {
  createStatusModel,
  createWetCourtsModel,
  createAdminServices,
  createStatusActions,
  createWetCourtsActions,
} from '../types/domainObjects';

type StatusModel = ReturnType<typeof createStatusModel>;
type WetCourtsModel = ReturnType<typeof createWetCourtsModel>;
type AdminServices = ReturnType<typeof createAdminServices>;
type StatusActions = ReturnType<typeof createStatusActions>;
type WetCourtsActions = ReturnType<typeof createWetCourtsActions>;

/**
 * Build the data props for StatusSection CourtStatusGrid and waitlist UI.
 */
export function buildStatusModel(statusModel: StatusModel, wetCourtsModel: WetCourtsModel, services: AdminServices) {
  return {
    statusModel,
    wetCourtsModel,
    services,
    waitingGroups: statusModel.waitingGroups,
  };
}

/**
 * Build the action/callback props for StatusSection.
 */
export function buildStatusActions(statusActions: StatusActions, wetCourtsActions: WetCourtsActions) {
  return {
    statusActions,
    wetCourtsActions,
    moveInWaitlist: statusActions.moveInWaitlist,
    removeFromWaitlist: statusActions.removeFromWaitlist,
  };
}
