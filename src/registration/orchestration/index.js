/**
 * Orchestration Facade
 *
 * This module provides a single import point for all registration orchestrators.
 * Orchestrators are moved here from App.jsx to centralize coordination logic.
 *
 * WP5.5 Phase: Moving functions verbatim, no behavior changes.
 * Future phases may standardize return shapes and add unit tests.
 */

// Helpers (available for optional use at boundaries)
export { success, failure, wrapAsync } from './helpers/resultNormalizer.js';

// Orchestrators will be added here as they are moved:
export { changeCourtOrchestrated } from './courtChangeOrchestrator.js';
export { resetFormOrchestrated, applyInactivityTimeoutOrchestrated } from './resetOrchestrator.js';
export {
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
} from './memberSelectionOrchestrator.js';
// export { sendGroupToWaitlistOrchestrated } from './waitlistOrchestrator.js';
// export { assignCourtToGroupOrchestrated } from './assignCourtOrchestrator.js';
