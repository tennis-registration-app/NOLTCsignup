// @ts-check
/**
 * @fileoverview Canonical JSDoc type boundaries for the NOLTC registration app.
 *
 * These typedefs lock the runtime shapes of { app } and handlers
 * to prevent silent drift. All 34 handler keys are explicitly enumerated.
 *
 * NO EXECUTABLE LOGIC IN THIS FILE — typedefs only.
 * The `export {}` at the bottom is a module sentinel for tooling compatibility.
 */

// ============================================
// APP STATE (minimal — expand only from verified evidence)
// ============================================

/**
 * Application state object passed through the registration app.
 * Properties will be added as they are verified at construction points.
 *
 * @typedef {Object} AppState
 */

// ============================================
// HANDLERS (34 keys explicitly enumerated)
// ============================================

/**
 * Handler functions returned by useRegistrationHandlers.
 * All 34 keys are explicitly listed to prevent silent drift.
 *
 * Grouped by module origin (comments only — typedef is flat):
 * - Admin Handlers (7): from useAdminHandlers
 * - Guest Handlers (4): from useGuestHandlers
 * - Group Handlers (9): from useGroupHandlers
 * - Court Handlers (6): from useCourtHandlers
 * - Navigation Handlers (3): from useNavigationHandlers
 * - Core Handlers (5): inline in useRegistrationHandlers
 *
 * @typedef {Object} Handlers
 *
 * Admin Handlers (7):
 * @property {Function} handleClearAllCourts
 * @property {Function} handleAdminClearCourt
 * @property {Function} handleMoveCourt
 * @property {Function} handleClearWaitlist
 * @property {Function} handleRemoveFromWaitlist
 * @property {Function} handlePriceUpdate
 * @property {Function} handleExitAdmin
 *
 * Guest Handlers (4):
 * @property {Function} validateGuestName
 * @property {Function} handleToggleGuestForm
 * @property {Function} handleGuestNameChange
 * @property {Function} handleAddGuest
 *
 * Group Handlers (9):
 * @property {Function} findMemberNumber
 * @property {Function} addFrequentPartner
 * @property {Function} sameGroup
 * @property {Function} handleSuggestionClick
 * @property {Function} handleGroupSuggestionClick
 * @property {Function} handleAddPlayerSuggestionClick
 * @property {Function} handleGroupSelectCourt
 * @property {Function} handleStreakAcknowledge
 * @property {Function} handleGroupJoinWaitlist
 *
 * Court Handlers (6):
 * @property {Function} saveCourtData
 * @property {Function} getAvailableCourts
 * @property {Function} clearCourt
 * @property {Function} assignCourtToGroup
 * @property {Function} changeCourt
 * @property {Function} sendGroupToWaitlist
 *
 * Navigation Handlers (3):
 * @property {Function} checkLocationAndProceed
 * @property {Function} handleToggleAddPlayer
 * @property {Function} handleGroupGoBack
 *
 * Core Handlers (5):
 * @property {Function} markUserTyping
 * @property {Function} getCourtData
 * @property {Function} clearSuccessResetTimer
 * @property {Function} resetForm
 * @property {Function} isPlayerAlreadyPlaying
 */

// ============================================
// DOMAIN ENTITIES (add later from verified evidence only)
// ============================================

// Domain entity typedefs can be added here later if widely reused
// (Court, Block, Session, Group, Member, WaitlistEntry, etc.)
// Only add from verified evidence, not speculation.

// ============================================
// MODULE SENTINEL (for tooling compatibility)
// ============================================

export {};
