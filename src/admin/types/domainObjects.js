/**
 * @fileoverview Domain object type definitions for Admin components.
 *
 * These objects group related props to reduce component surface area.
 * See docs/WP5-A_PROP_SURFACES_INVENTORY.md for rationale.
 *
 * RULES:
 * - Objects must be curated, not pass-through dumps
 * - Each field must have explicit type documentation
 * - NO DEFAULTS: factories preserve undefined/null as-is
 * - NO FREEZE: mutation prevention is a separate future effort
 * - AdminServices may ONLY contain backend interfaces (directory/commands)
 * - Factory input keys match existing prop names; domain object field names are curated/stable
 * - Only include fields that map to existing props; no speculative additions
 */

/** @typedef {import('react').ComponentType<unknown>} ComponentType */

// ============================================================
// WET COURTS (cross-cutting, used by multiple components)
// ============================================================

/**
 * Wet court state - cross-cutting state used across Admin components.
 * Maps to actual props: wetCourtsActive, wetCourts, ENABLE_WET_COURTS
 *
 * @typedef {Object} WetCourtsModel
 * @property {boolean|undefined} active - Whether wet court mode is active (from wetCourtsActive)
 * @property {Set<number>|undefined} courts - Set of wet court numbers (from wetCourts)
 * @property {boolean|undefined} enabled - Feature flag (from ENABLE_WET_COURTS)
 */

/**
 * Wet court actions - handlers for wet court operations.
 * Maps to actual props: setWetCourtsActive, setWetCourts, handleEmergencyWetCourt,
 * deactivateWetCourts, onClearWetCourt, onClearAllWetCourts
 *
 * @typedef {Object} WetCourtsActions
 * @property {((active: boolean) => void)|undefined} setActive - Toggle wet court mode (from setWetCourtsActive)
 * @property {((courts: Set<number>) => void)|undefined} setCourts - Update wet court set (from setWetCourts)
 * @property {(() => void)|undefined} activateEmergency - Mark all courts wet (from handleEmergencyWetCourt)
 * @property {(() => void)|undefined} deactivateAll - Clear all wet markers (from deactivateWetCourts)
 * @property {((courtNum: number) => void)|undefined} clearCourt - Clear single wet court (from onClearWetCourt)
 * @property {(() => void)|undefined} clearAllCourts - Clear all wet courts (from onClearAllWetCourts)
 */

/**
 * Creates WetCourtsModel - preserves undefined values.
 * @param {Object} [params={}]
 * @param {boolean} [params.wetCourtsActive] - Active flag
 * @param {Set<number>} [params.wetCourts] - Set of wet court numbers
 * @param {boolean} [params.ENABLE_WET_COURTS] - Feature flag
 * @returns {WetCourtsModel}
 */
export function createWetCourtsModel(params = {}) {
  const { wetCourtsActive, wetCourts, ENABLE_WET_COURTS } = params;
  return {
    active: wetCourtsActive,
    courts: wetCourts,
    enabled: ENABLE_WET_COURTS,
  };
}

/**
 * Creates WetCourtsActions - preserves undefined values.
 * @param {Object} [params={}]
 * @param {Function} [params.setWetCourtsActive] - Toggle wet court mode
 * @param {Function} [params.setWetCourts] - Update wet court set
 * @param {Function} [params.handleEmergencyWetCourt] - Activate emergency wet courts
 * @param {Function} [params.deactivateWetCourts] - Deactivate all wet courts
 * @param {Function} [params.onClearWetCourt] - Clear single wet court
 * @param {Function} [params.onClearAllWetCourts] - Clear all wet courts
 * @returns {WetCourtsActions}
 */
export function createWetCourtsActions(params = {}) {
  const {
    setWetCourtsActive,
    setWetCourts,
    handleEmergencyWetCourt,
    deactivateWetCourts,
    onClearWetCourt,
    onClearAllWetCourts,
  } = params;
  return {
    setActive: setWetCourtsActive,
    setCourts: setWetCourts,
    activateEmergency: handleEmergencyWetCourt,
    deactivateAll: deactivateWetCourts,
    clearCourt: onClearWetCourt,
    clearAllCourts: onClearAllWetCourts,
  };
}

// ============================================================
// BLOCK MANAGEMENT (CompleteBlockManagerEnhanced)
// ============================================================

/**
 * Block state for court blocking functionality.
 * Maps to actual props: courts, courtBlocks, hoursOverrides, initialEditingBlock, suspendedBlocks
 *
 * @typedef {Object} BlockModel
 * @property {Array<Object>|undefined} courts - Array of court objects (from courts)
 * @property {Array<Object>|undefined} blocks - Current block definitions (from courtBlocks)
 * @property {Array<Object>|undefined} hoursOverrides - Holiday/special hours (from hoursOverrides)
 * @property {Object|null|undefined} editingBlock - Block to edit (from initialEditingBlock)
 * @property {Array<Object>|undefined} suspendedBlocks - Blocks paused during wet courts (from suspendedBlocks)
 */

/**
 * Block actions for court blocking operations.
 * Maps to actual props: onApplyBlocks, onEditingBlockConsumed, setSuspendedBlocks, onNotification
 *
 * @typedef {Object} BlockActions
 * @property {((blocks: Array<Object>) => void)|undefined} applyBlocks - Create blocks (from onApplyBlocks)
 * @property {(() => void)|undefined} onEditingConsumed - Clear edit state (from onEditingBlockConsumed)
 * @property {((blocks: Array<Object>) => void)|undefined} setSuspended - Update suspended blocks (from setSuspendedBlocks)
 * @property {((message: string, type?: string) => void)|undefined} notify - Show notification (from onNotification)
 */

/**
 * Creates BlockModel - preserves undefined values.
 * @param {Object} [params={}]
 * @param {Array<Object>} [params.courts] - Array of court objects
 * @param {Array<Object>} [params.courtBlocks] - Array of block objects
 * @param {Array<Object>} [params.hoursOverrides] - Holiday/special hours
 * @param {Object|null} [params.initialEditingBlock] - Block to pre-fill form
 * @param {Array<Object>} [params.suspendedBlocks] - Blocks paused during wet courts
 * @returns {BlockModel}
 */
export function createBlockModel(params = {}) {
  const { courts, courtBlocks, hoursOverrides, initialEditingBlock, suspendedBlocks } = params;
  return {
    courts,
    blocks: courtBlocks,
    hoursOverrides,
    editingBlock: initialEditingBlock,
    suspendedBlocks,
  };
}

/**
 * Creates BlockActions - preserves undefined values.
 * @param {Object} [params={}]
 * @param {Function} [params.onApplyBlocks] - Create blocks callback
 * @param {Function} [params.onEditingBlockConsumed] - Clear edit state callback
 * @param {Function} [params.setSuspendedBlocks] - Update suspended blocks
 * @param {Function} [params.onNotification] - Show notification
 * @returns {BlockActions}
 */
export function createBlockActions(params = {}) {
  const { onApplyBlocks, onEditingBlockConsumed, setSuspendedBlocks, onNotification } = params;
  return {
    applyBlocks: onApplyBlocks,
    onEditingConsumed: onEditingBlockConsumed,
    setSuspended: setSuspendedBlocks,
    notify: onNotification,
  };
}

// ============================================================
// INJECTED UI COMPONENTS
// ============================================================

/**
 * Injected UI components for block management.
 * These are React components passed as props for composition.
 * Maps to actual props: VisualTimeEntry, MiniCalendar, EventCalendarEnhanced,
 * MonthView, EventSummary, HoverCard, QuickActionsMenu, Tennis
 *
 * @typedef {Object} BlockComponents
 * @property {ComponentType|undefined} VisualTimeEntry - Time range picker (from VisualTimeEntry)
 * @property {ComponentType|undefined} MiniCalendar - Date picker (from MiniCalendar)
 * @property {ComponentType|undefined} EventCalendar - Calendar component (from EventCalendarEnhanced)
 * @property {ComponentType|undefined} MonthView - Month view component (from MonthView)
 * @property {ComponentType|undefined} EventSummary - Event summary panel (from EventSummary)
 * @property {ComponentType|undefined} HoverCard - Hover preview (from HoverCard)
 * @property {ComponentType|undefined} QuickActionsMenu - Context menu (from QuickActionsMenu)
 * @property {Object|undefined} Tennis - Global Tennis namespace (from Tennis)
 */

/**
 * Creates BlockComponents - preserves undefined values.
 * @param {Object} [params={}]
 * @param {ComponentType} [params.VisualTimeEntry] - Time range picker
 * @param {ComponentType} [params.MiniCalendar] - Date picker
 * @param {ComponentType} [params.EventCalendarEnhanced] - Calendar component
 * @param {ComponentType} [params.MonthView] - Month view
 * @param {ComponentType} [params.EventSummary] - Event summary
 * @param {ComponentType} [params.HoverCard] - Hover card
 * @param {ComponentType} [params.QuickActionsMenu] - Context menu
 * @param {Object} [params.Tennis] - Global Tennis namespace
 * @returns {BlockComponents}
 */
export function createBlockComponents(params = {}) {
  const {
    VisualTimeEntry,
    MiniCalendar,
    EventCalendarEnhanced,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    Tennis,
  } = params;
  return {
    VisualTimeEntry,
    MiniCalendar,
    EventCalendar: EventCalendarEnhanced,
    MonthView,
    EventSummary,
    HoverCard,
    QuickActionsMenu,
    Tennis,
  };
}

// ============================================================
// ADMIN SERVICES (backend interfaces ONLY)
// ============================================================

/**
 * Backend services for Admin operations.
 * Maps to actual prop: backend
 *
 * ⚠️ CURATED: This object may ONLY contain backend interfaces.
 * Do NOT add data, UI helpers, or unrelated utilities here.
 *
 * @typedef {Object} AdminServices
 * @property {Object|undefined} backend - TennisBackend instance for API calls (from backend)
 */

/**
 * Creates AdminServices - preserves undefined values.
 * ⚠️ ONLY backend interfaces allowed.
 * @param {Object} [params={}]
 * @param {Object} [params.backend] - TennisBackend instance
 * @returns {AdminServices}
 */
export function createAdminServices(params = {}) {
  const { backend } = params;
  return {
    backend,
  };
}
