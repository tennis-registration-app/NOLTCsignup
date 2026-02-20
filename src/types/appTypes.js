// @ts-check
// Canonical shape definitions. Partial — grows over time. See type ratchet in CI.
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
// APP STATE — Canonical Shape
// Assembled by buildRegistrationReturn.js from 6 sub-hooks.
// Partial — covers all presenter-consumed fields. Grows over time.
// ============================================

/**
 * Registration App State — Canonical Shape
 *
 * Assembled by buildRegistrationReturn.js from 6 sub-hooks.
 * Partial — covers all presenter-consumed fields. Grows over time.
 * See type ratchet in CI (npm run type:ratchet).
 *
 * @typedef {Object} AppState
 * @property {RegistrationUiState} state - Screen state, form data, flags
 * @property {RegistrationSetters} setters - State setter functions
 * @property {RegistrationRefs} refs - React refs
 * @property {DerivedState} derived - Computed/derived values
 * @property {HelperFunctions} helpers - Utility functions
 * @property {Services} services - Backend and data store
 * @property {AlertState} alert - Alert display state and controls
 * @property {AdminPriceFeedback} adminPriceFeedback - Ball price feedback
 * @property {GuestCounterHook} guestCounterHook - Guest count tracking
 * @property {TimeoutState} timeout - Session timeout warnings
 * @property {SearchState} search - Member search state and handlers
 * @property {CourtAssignmentState} courtAssignment - Assignment results
 * @property {ClearCourtFlow} clearCourtFlow - Court clearing workflow
 * @property {MobileState} mobile - Mobile flow state
 * @property {BlockAdminState} blockAdmin - Court block administration
 * @property {WaitlistAdminState} waitlistAdmin - Waitlist management
 * @property {GroupGuestState} groupGuest - Group and guest management
 * @property {StreakState} streak - Registration streak tracking
 * @property {MemberIdentityState} memberIdentity - Member lookup state
 * @property {Object} CONSTANTS - App constants
 * @property {Object} TENNIS_CONFIG - Tennis configuration
 * @property {Object} API_CONFIG - API configuration
 * @property {Object} TennisBusinessLogic - Business logic service
 * @property {Function} computeRegistrationCourtSelection - Court selection policy
 * @property {Function} validateGroupCompat - Group compatibility check
 * @property {Function} assignCourtToGroupOrchestrated - Assign court orchestrator
 * @property {Function} sendGroupToWaitlistOrchestrated - Waitlist orchestrator
 * @property {Function} handleSuggestionClickOrchestrated - Suggestion click orchestrator
 * @property {Function} handleAddPlayerSuggestionClickOrchestrated - Add player suggestion orchestrator
 * @property {Function} changeCourtOrchestrated - Court change orchestrator
 * @property {Function} resetFormOrchestrated - Form reset orchestrator
 * @property {Function} dbg - Debug logger
 * @property {boolean} DEBUG - Debug mode flag
 */

/**
 * @typedef {Object} RegistrationUiState
 * @property {Object} data - Court and registration data
 * @property {Object} data.courtSelection - Current court selection
 * @property {Array} data.upcomingBlocks - Upcoming court blocks
 * @property {string} currentScreen - Active screen name
 * @property {boolean} showSuccess - Success screen visible
 * @property {number} waitlistPosition - Position in waitlist
 * @property {boolean} isChangingCourt - Court change in progress
 * @property {boolean} isAssigning - Assignment in progress
 * @property {boolean} isJoiningWaitlist - Waitlist join in progress
 * @property {boolean} hasWaitlistPriority - Has waitlist priority
 * @property {string|null} currentWaitlistEntryId - Active waitlist entry ID
 * @property {Object|null} displacement - Displacement data
 * @property {Object|null} originalCourtData - Court data before change
 * @property {boolean} showAddPlayer - Add player form visible
 * @property {Array} availableCourts - Available court list
 * @property {number} currentTime - Current timestamp
 * @property {Object|null} courtToMove - Court being moved
 * @property {string} ballPriceInput - Ball price input value
 * @property {Object|null} replacedGroup - Group that was replaced
 * @property {number|null} ballPriceCents - Ball price in cents
 * @property {boolean} canChangeCourt - Can change court flag
 * @property {number|null} changeTimeRemaining - Time left to change court
 * @property {boolean} isTimeLimited - Time-limited session flag
 * @property {string|null} timeLimitReason - Reason for time limit
 */

/**
 * @typedef {Object} RegistrationSetters
 * @property {Function} setDisplacement
 * @property {Function} setIsChangingCourt
 * @property {Function} setWasOvertimeCourt
 * @property {Function} setShowSuccess
 * @property {Function} setCurrentScreen
 * @property {Function} setOriginalCourtData
 * @property {Function} setHasWaitlistPriority
 * @property {Function} setCurrentWaitlistEntryId
 * @property {Function} setCourtToMove
 * @property {Function} setBallPriceInput
 */

/**
 * @typedef {Object} RegistrationRefs
 * @property {Object} successResetTimerRef - Timer ref for success screen auto-reset
 */

/**
 * @typedef {Object} DerivedState
 * @property {boolean} isMobileView - Mobile viewport detected
 * @property {boolean} canFirstGroupPlay - First group can play
 * @property {boolean} canSecondGroupPlay - Second group can play
 * @property {Object|null} firstWaitlistEntry - First waitlist entry
 * @property {Object|null} secondWaitlistEntry - Second waitlist entry
 * @property {Object|null} firstWaitlistEntryData - First entry data
 * @property {Object|null} secondWaitlistEntryData - Second entry data
 * @property {boolean} canPassThroughGroupPlay - Pass-through group can play
 * @property {Object|null} passThroughEntry - Pass-through entry
 * @property {Object|null} passThroughEntryData - Pass-through entry data
 */

/**
 * @typedef {Object} HelperFunctions
 * @property {Function} markUserTyping
 * @property {Function} getCourtData
 * @property {Function} clearSuccessResetTimer
 * @property {Function} loadData
 * @property {Function} applyInactivityTimeoutExitSequence
 * @property {Function} getCourtsOccupiedForClearing
 * @property {Function} guardAddPlayerEarly
 * @property {Function} guardAgainstGroupDuplicate
 */

/**
 * @typedef {Object} Services
 * @property {Object} backend - TennisBackend instance
 * @property {Object} dataStore - Data store instance
 */

/**
 * @typedef {Object} AlertState
 * @property {boolean} showAlert - Alert visible
 * @property {string} alertMessage - Alert text
 * @property {Function} showAlertMessage - Show alert with message
 */

/**
 * @typedef {Object} AdminPriceFeedback
 * @property {string|null} priceError - Price validation error
 * @property {boolean} showPriceSuccess - Price update success flag
 * @property {Function} setPriceError
 * @property {Function} setShowPriceSuccess
 */

/**
 * @typedef {Object} GuestCounterHook
 * @property {number} guestCounter - Current guest count
 * @property {Function} incrementGuestCounter
 */

/**
 * @typedef {Object} TimeoutState
 * @property {boolean} showTimeoutWarning - Timeout warning visible
 */

/**
 * @typedef {Object} SearchState
 * @property {string} searchInput - Search input value
 * @property {boolean} showSuggestions - Suggestions dropdown visible
 * @property {boolean} isSearching - Search in progress
 * @property {string} effectiveSearchInput - Debounced search value
 * @property {string} addPlayerSearch - Add-player search input
 * @property {boolean} showAddPlayerSuggestions - Add-player suggestions visible
 * @property {string} effectiveAddPlayerSearch - Debounced add-player search
 * @property {Function} getAutocompleteSuggestions - Get suggestions for input
 * @property {Function} setSearchInput
 * @property {Function} setShowSuggestions
 * @property {Function} handleGroupSearchChange
 * @property {Function} handleGroupSearchFocus
 * @property {Function} handleAddPlayerSearchChange
 * @property {Function} handleAddPlayerSearchFocus
 */

/**
 * @typedef {Object} CourtAssignmentState
 * @property {number|null} justAssignedCourt - Most recently assigned court number
 * @property {string|null} assignedSessionId - Current session ID
 * @property {string|null} assignedEndTime - Session end time ISO string
 */

/**
 * @typedef {Object} ClearCourtFlow
 * @property {number|null} selectedCourtToClear - Court selected for clearing
 * @property {Function} setSelectedCourtToClear
 * @property {number} clearCourtStep - Current step in clear flow (1-4)
 * @property {Function} setClearCourtStep
 * @property {Function} decrementClearCourtStep
 */

/**
 * @typedef {Object} MobileState
 * @property {boolean} mobileFlow - Mobile flow active
 * @property {number|null} preselectedCourt - Court preselected from mobile
 * @property {string|null} mobileMode - Mobile mode identifier
 * @property {number|null} mobileCountdown - Countdown timer value
 * @property {boolean} checkingLocation - Location check in progress
 * @property {boolean} showQRScanner - QR scanner modal visible
 * @property {boolean} gpsFailedPrompt - GPS failure prompt visible
 * @property {Function} onQRScanToken - QR scan result handler
 * @property {Function} onQRScannerClose - QR scanner close handler
 * @property {Function} openQRScanner - Open QR scanner
 * @property {Function} dismissGpsPrompt - Dismiss GPS prompt
 * @property {Function} getMobileGeolocation - Get mobile geolocation
 * @property {Function} requestMobileReset - Request mobile reset
 */

/**
 * @typedef {Object} BlockAdminState
 * @property {boolean} showBlockModal - Block modal visible
 * @property {Array} selectedCourtsToBlock - Courts selected for blocking
 * @property {string} blockMessage - Block reason message
 * @property {string} blockStartTime - Block start time
 * @property {string} blockEndTime - Block end time
 * @property {boolean} blockingInProgress - Block operation in progress
 * @property {number|null} blockWarningMinutes - Minutes until block warning
 * @property {Function} getCourtBlockStatus - Get block status for a court
 * @property {Function} setShowBlockModal
 * @property {Function} setSelectedCourtsToBlock
 * @property {Function} setBlockMessage
 * @property {Function} setBlockStartTime
 * @property {Function} setBlockEndTime
 * @property {Function} setBlockingInProgress
 * @property {Function} onCancelBlock
 * @property {Function} onBlockCreate
 */

/**
 * @typedef {Object} WaitlistAdminState
 * @property {Object|null} waitlistMoveFrom - Source for waitlist reorder
 * @property {Function} setWaitlistMoveFrom
 * @property {Function} onReorderWaitlist
 */

/**
 * @typedef {Object} GroupGuestState
 * @property {Array|null} currentGroup - Current group being registered
 * @property {boolean} showGuestForm - Guest form visible
 * @property {string} guestName - Guest name input
 * @property {Object|null} guestSponsor - Guest sponsor member
 * @property {boolean} showGuestNameError - Guest name validation error
 * @property {boolean} showSponsorError - Sponsor validation error
 * @property {Function} setCurrentGroup
 * @property {Function} handleRemovePlayer
 * @property {Function} handleSelectSponsor
 * @property {Function} handleCancelGuest
 */

/**
 * @typedef {Object} StreakState
 * @property {Object|null} registrantStreak - Current streak data
 * @property {boolean} showStreakModal - Streak modal visible
 * @property {boolean} streakAcknowledged - Streak acknowledged by user
 * @property {Function} setStreakAcknowledged
 */

/**
 * @typedef {Object} MemberIdentityState
 * @property {string} memberNumber - Current member number
 * @property {Array} frequentPartners - Frequent partner list
 * @property {boolean} frequentPartnersLoading - Partners loading flag
 * @property {Function} setMemberNumber
 * @property {Function} clearCache - Clear member cache
 * @property {Function} fetchFrequentPartners - Fetch frequent partners
 * @property {string|null} currentMemberId - Current member UUID
 * @property {Function} setCurrentMemberId - Set current member ID
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
 * Court Handlers (10):
 * @property {Function} saveCourtData
 * @property {Function} getAvailableCourts
 * @property {Function} clearCourt
 * @property {Function} assignCourtToGroup
 * @property {Function} changeCourt
 * @property {Function} sendGroupToWaitlist
 * @property {Function} deferWaitlistEntry
 * @property {Function} undoOvertimeAndClearPrevious
 * @property {Function} assignNextFromWaitlist
 * @property {Function} joinWaitlistDeferred
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
