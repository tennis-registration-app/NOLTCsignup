/**
 * Admin Controller Builder
 *
 * Pure function that assembles domain models/actions into a single controller object.
 * This mirrors what App.jsx does with useMemo wrappers, but as a testable pure function.
 *
 * Usage in App.jsx (future refactor):
 *   const controller = useMemo(() => buildAdminController(deps), [deps]);
 *
 * @module admin/controller/buildAdminController
 */

import {
  createWetCourtsModel,
  createWetCourtsActions,
  createBlockModel,
  createBlockActions,
  createBlockComponents,
  createAdminServices,
  createStatusModel,
  createStatusActions,
  createCalendarModel,
  createCalendarActions,
  createAIAssistantModel,
  createAIAssistantActions,
  createAIAssistantServices,
  createAIAssistantComponents,
} from '../types/domainObjects.js';

/**
 * @typedef {Object} AdminControllerDeps
 * @property {Object} backend - TennisBackend instance
 * @property {Object} [dataStore] - TennisCourtDataStore instance (for AI)
 * @property {Array<Object>} courts - Court data array
 * @property {Array<Object>} courtBlocks - Active court blocks
 * @property {Array<Object>} waitingGroups - Waitlist entries
 * @property {Array<Object>} hoursOverrides - Holiday/special hours
 * @property {Object|null} blockToEdit - Block being edited
 * @property {Array<Object>} suspendedBlocks - Blocks suspended during wet courts
 * @property {boolean} wetCourtsActive - Whether wet court mode is active
 * @property {Set<number>} wetCourts - Set of wet court numbers
 * @property {boolean} ENABLE_WET_COURTS - Feature flag
 * @property {Date} selectedDate - Currently selected date
 * @property {Date} currentTime - Current time
 * @property {string} calendarView - Calendar view mode ('day'|'week'|'month')
 * @property {number} refreshTrigger - Refresh trigger counter
 * @property {string} activeTab - Active admin tab
 * @property {boolean} showAIAssistant - AI assistant modal visibility
 * @property {boolean} USE_REAL_AI - Use real AI vs mock
 * @property {Object} settings - Admin settings
 * @property {Object} actions - Action handlers from App.jsx
 */

/**
 * Build the complete admin controller object.
 *
 * @param {AdminControllerDeps} deps - Dependencies from React state/hooks
 * @returns {Object} Controller with all domain objects grouped by section
 */
export function buildAdminController(deps) {
  const {
    // Services
    backend,
    dataStore,
    // State
    courts,
    courtBlocks,
    waitingGroups,
    hoursOverrides,
    blockToEdit,
    suspendedBlocks,
    wetCourtsActive,
    wetCourts,
    ENABLE_WET_COURTS,
    selectedDate,
    currentTime,
    calendarView,
    refreshTrigger,
    activeTab,
    showAIAssistant,
    USE_REAL_AI,
    settings,
    // Actions
    actions,
    // Components (for injection)
    components,
  } = deps;

  // Build services
  const adminServices = createAdminServices({ backend });
  const aiServices = createAIAssistantServices({ backend, dataStore });

  // Build wet courts domain objects
  const wetCourtsModel = createWetCourtsModel({
    wetCourtsActive,
    wetCourts,
    ENABLE_WET_COURTS,
  });
  const wetCourtsActions = createWetCourtsActions({
    setWetCourtsActive: actions?.setWetCourtsActive,
    setWetCourts: actions?.setWetCourts,
    handleEmergencyWetCourt: actions?.handleEmergencyWetCourt,
    deactivateWetCourts: actions?.deactivateWetCourts,
    onClearWetCourt: actions?.clearWetCourt,
  });

  // Build block domain objects
  const blockModel = createBlockModel({
    courts,
    courtBlocks,
    hoursOverrides,
    initialEditingBlock: blockToEdit,
    suspendedBlocks,
  });
  const blockActions = createBlockActions({
    onApplyBlocks: actions?.applyBlocks,
    onEditingBlockConsumed: actions?.onEditingBlockConsumed,
    setSuspendedBlocks: actions?.setSuspendedBlocks,
    onNotification: actions?.showNotification,
  });
  const blockComponents = components
    ? createBlockComponents({
        VisualTimeEntry: components.VisualTimeEntry,
        MiniCalendar: components.MiniCalendar,
        EventCalendarEnhanced: components.EventCalendarEnhanced,
        MonthView: components.MonthView,
        EventSummary: components.EventSummary,
        HoverCard: components.HoverCard,
        QuickActionsMenu: components.QuickActionsMenu,
        Tennis: components.Tennis,
      })
    : undefined;

  // Build status domain objects
  const statusModel = createStatusModel({
    courts,
    courtBlocks,
    selectedDate,
    currentTime,
    waitingGroups,
  });
  const statusActions = createStatusActions({
    clearCourt: actions?.clearCourt,
    moveCourt: actions?.moveCourt,
    clearAllCourts: actions?.clearAllCourts,
    handleEditBlockFromStatus: actions?.handleEditBlockFromStatus,
    moveInWaitlist: actions?.moveInWaitlist,
    removeFromWaitlist: actions?.removeFromWaitlist,
  });

  // Build calendar domain objects
  const calendarModel = createCalendarModel({
    courts,
    currentTime,
    hoursOverrides,
    calendarView,
    refreshTrigger,
  });
  const calendarActions = createCalendarActions({
    onRefresh: actions?.bumpRefreshTrigger,
  });

  // Build AI domain objects
  const aiModel = createAIAssistantModel({
    activeTab,
    showAIAssistant,
    USE_REAL_AI,
    courts,
    settings,
    waitingGroups,
  });
  const aiActions = createAIAssistantActions({
    setShowAIAssistant: actions?.setShowAIAssistant,
    onAISettingsChanged: actions?.handleAISettingsChanged,
    loadData: actions?.reloadSettings,
    clearCourt: actions?.clearCourt,
    clearAllCourts: actions?.clearAllCourts,
    moveCourt: actions?.moveCourt,
    updateBallPrice: actions?.updateBallPrice,
    refreshData: actions?.refreshData,
  });
  const aiComponents = components
    ? createAIAssistantComponents({
        AIAssistant: components.AIAssistant,
        AIAssistantAdmin: components.AIAssistantAdmin,
      })
    : undefined;

  return {
    // Services
    services: adminServices,

    // Grouped by section (matches tab structure)
    wetCourts: {
      model: wetCourtsModel,
      actions: wetCourtsActions,
    },
    blocks: {
      model: blockModel,
      actions: blockActions,
      components: blockComponents,
    },
    status: {
      model: statusModel,
      actions: statusActions,
    },
    calendar: {
      model: calendarModel,
      actions: calendarActions,
    },
    ai: {
      model: aiModel,
      actions: aiActions,
      services: aiServices,
      components: aiComponents,
    },
  };
}

/**
 * Controller surface keys - used for contract tests.
 * This is the stable public API of buildAdminController.
 */
export const CONTROLLER_KEYS = {
  topLevel: ['services', 'wetCourts', 'blocks', 'status', 'calendar', 'ai'],
  wetCourts: {
    model: ['active', 'courts', 'enabled'],
    actions: [
      'setActive',
      'setCourts',
      'activateEmergency',
      'deactivateAll',
      'clearCourt',
      'clearAllCourts',
    ],
  },
  blocks: {
    model: ['courts', 'blocks', 'hoursOverrides', 'editingBlock', 'suspendedBlocks'],
    actions: ['applyBlocks', 'onEditingConsumed', 'setSuspended', 'notify'],
    components: [
      'VisualTimeEntry',
      'MiniCalendar',
      'EventCalendar',
      'MonthView',
      'EventSummary',
      'HoverCard',
      'QuickActionsMenu',
      'Tennis',
    ],
  },
  status: {
    model: ['courts', 'courtBlocks', 'selectedDate', 'currentTime', 'waitingGroups'],
    actions: [
      'clearCourt',
      'moveCourt',
      'clearAllCourts',
      'editBlock',
      'moveInWaitlist',
      'removeFromWaitlist',
    ],
  },
  calendar: {
    model: ['courts', 'currentTime', 'hoursOverrides', 'calendarView', 'refreshTrigger'],
    actions: ['onRefresh'],
  },
  ai: {
    model: ['activeTab', 'showAIAssistant', 'USE_REAL_AI', 'courts', 'settings', 'waitingGroups'],
    actions: [
      'setShowAIAssistant',
      'onAISettingsChanged',
      'loadData',
      'clearCourt',
      'clearAllCourts',
      'moveCourt',
      'updateBallPrice',
      'refreshData',
    ],
    services: ['backend', 'dataStore'],
    components: ['AIAssistant', 'AIAssistantAdmin'],
  },
  services: ['backend'],
};
