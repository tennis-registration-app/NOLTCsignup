/**
 * Blocking Presenter
 *
 * Pure functions that transform controller domain objects into the props
 * expected by CompleteBlockManagerEnhanced.
 *
 * Extracted from BlockingSection.jsx — maintains exact prop mapping.
 *
 * The only logic is the blockingView → defaultView mapping:
 *   'create' → 'create'
 *   'future' → 'calendar'
 *   'list'   → 'timeline'
 */

/** @type {Record<string, string>} */
const VIEW_MAP = {
  create: 'create',
  future: 'calendar',
  list: 'timeline',
};

/**
 * Build the data/model props for CompleteBlockManagerEnhanced.
 *
 * @param {string} blockingView - UI view mode from tab state
 * @param {import('../types/domainObjects.js').WetCourtsModel} wetCourtsModel
 * @param {import('../types/domainObjects.js').BlockModel} blockModel
 * @param {import('../types/domainObjects.js').BlockComponents} components
 * @param {import('../types/domainObjects.js').AdminServices} services
 * @returns {Object} Data props for CompleteBlockManagerEnhanced
 */
export function buildBlockingModel(blockingView, wetCourtsModel, blockModel, components, services) {
  return {
    wetCourtsModel,
    blockModel,
    components,
    services,
    defaultView: VIEW_MAP[blockingView] || blockingView,
  };
}

/**
 * Build the action/callback props for CompleteBlockManagerEnhanced.
 *
 * @param {import('../types/domainObjects.js').WetCourtsActions} wetCourtsActions
 * @param {import('../types/domainObjects.js').BlockActions} blockActions
 * @returns {Object} Action props for CompleteBlockManagerEnhanced
 */
export function buildBlockingActions(wetCourtsActions, blockActions) {
  return {
    wetCourtsActions,
    blockActions,
  };
}

/**
 * Exported for contract tests.
 */
export { VIEW_MAP };
