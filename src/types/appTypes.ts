/**
 * Canonical type boundaries for the NOLTC registration app.
 *
 * These interfaces lock the runtime shapes of { app } and handlers
 * to prevent silent drift. All 34 handler keys are explicitly enumerated.
 *
 * Consumed via JSDoc import() from .js files:
 *   @param {import('../../types/appTypes').AppState} app
 *
 * NO EXECUTABLE LOGIC IN THIS FILE — types only.
 */

// ============================================
// APP STATE — Canonical Shape
// Assembled by buildRegistrationReturn.js from 6 sub-hooks.
// Partial — covers all presenter-consumed fields. Grows over time.
// ============================================

/** Registration App State — Canonical Shape */
export interface AppState {
  /** Screen state, form data, flags */
  state: RegistrationUiState;
  /** State setter functions */
  setters: RegistrationSetters;
  /** React refs */
  refs: RegistrationRefs;
  /** Computed/derived values */
  derived: DerivedState;
  /** Utility functions */
  helpers: HelperFunctions;
  /** Backend and data store */
  services: Services;
  /** Alert display state and controls */
  alert: AlertState;
  /** Ball price feedback */
  adminPriceFeedback: AdminPriceFeedback;
  /** Guest count tracking */
  guestCounterHook: GuestCounterHook;
  /** Session timeout warnings */
  timeout: TimeoutState;
  /** Member search state and handlers */
  search: SearchState;
  /** Assignment results */
  courtAssignment: CourtAssignmentState;
  /** Court clearing workflow */
  clearCourtFlow: ClearCourtFlow;
  /** Mobile flow state */
  mobile: MobileState;
  /** Court block administration */
  blockAdmin: BlockAdminState;
  /** Waitlist management */
  waitlistAdmin: WaitlistAdminState;
  /** Group and guest management */
  groupGuest: GroupGuestState;
  /** Registration streak tracking */
  streak: StreakState;
  /** Member lookup state */
  memberIdentity: MemberIdentityState;
  /** App constants */
  CONSTANTS: any;
  /** Tennis configuration */
  TENNIS_CONFIG: any;
  /** API configuration */
  API_CONFIG: any;
  /** Business logic service */
  TennisBusinessLogic: any;
  /** Court selection policy */
  computeRegistrationCourtSelection: Function;
  /** Group compatibility check */
  validateGroupCompat: Function;
  /** Assign court orchestrator */
  assignCourtToGroupOrchestrated: Function;
  /** Waitlist orchestrator */
  sendGroupToWaitlistOrchestrated: Function;
  /** Suggestion click orchestrator */
  handleSuggestionClickOrchestrated: Function;
  /** Add player suggestion orchestrator */
  handleAddPlayerSuggestionClickOrchestrated: Function;
  /** Court change orchestrator */
  changeCourtOrchestrated: Function;
  /** Form reset orchestrator */
  resetFormOrchestrated: Function;
  /** Debug logger */
  dbg: Function;
  /** Debug mode flag */
  DEBUG: boolean;
}

export interface RegistrationUiState {
  /** Court and registration data */
  data: {
    /** Current court selection */
    courtSelection: any;
    /** Upcoming court blocks */
    upcomingBlocks: any[];
    [key: string]: any;
  };
  /** Active screen name */
  currentScreen: string;
  /** Success screen visible */
  showSuccess: boolean;
  /** Position in waitlist */
  waitlistPosition: number;
  /** Court change in progress */
  isChangingCourt: boolean;
  /** Assignment in progress */
  isAssigning: boolean;
  /** Waitlist join in progress */
  isJoiningWaitlist: boolean;
  /** Has waitlist priority */
  hasWaitlistPriority: boolean;
  /** Active waitlist entry ID */
  currentWaitlistEntryId: string | null;
  /** Displacement data */
  displacement: any;
  /** Court data before change */
  originalCourtData: any;
  /** Add player form visible */
  showAddPlayer: boolean;
  /** Available court list */
  availableCourts: any[];
  /** Current timestamp */
  currentTime: number;
  /** Court being moved */
  courtToMove: any;
  /** Ball price input value */
  ballPriceInput: string;
  /** Group that was replaced */
  replacedGroup: any;
  /** Ball price in cents */
  ballPriceCents: number | null;
  /** Can change court flag */
  canChangeCourt: boolean;
  /** Time left to change court */
  changeTimeRemaining: number | null;
  /** Time-limited session flag */
  isTimeLimited: boolean;
  /** Reason for time limit */
  timeLimitReason: string | null;
}

export interface RegistrationSetters {
  setDisplacement: Function;
  setIsChangingCourt: Function;
  setWasOvertimeCourt: Function;
  setShowSuccess: Function;
  setCurrentScreen: Function;
  setOriginalCourtData: Function;
  setHasWaitlistPriority: Function;
  setCurrentWaitlistEntryId: Function;
  setCourtToMove: Function;
  setBallPriceInput: Function;
}

export interface RegistrationRefs {
  /** Timer ref for success screen auto-reset */
  successResetTimerRef: { current: ReturnType<typeof setTimeout> | null };
}

export interface DerivedState {
  /** Mobile viewport detected */
  isMobileView: boolean;
  /** First group can play */
  canFirstGroupPlay: boolean;
  /** Second group can play */
  canSecondGroupPlay: boolean;
  /** First waitlist entry */
  firstWaitlistEntry: any;
  /** Second waitlist entry */
  secondWaitlistEntry: any;
  /** First entry data */
  firstWaitlistEntryData: any;
  /** Second entry data */
  secondWaitlistEntryData: any;
  /** Pass-through group can play */
  canPassThroughGroupPlay: boolean;
  /** Pass-through entry */
  passThroughEntry: any;
  /** Pass-through entry data */
  passThroughEntryData: any;
}

export interface HelperFunctions {
  markUserTyping: Function;
  getCourtData: Function;
  clearSuccessResetTimer: Function;
  loadData: Function;
  applyInactivityTimeoutExitSequence: Function;
  getCourtsOccupiedForClearing: Function;
  guardAddPlayerEarly: Function;
  guardAgainstGroupDuplicate: Function;
}

export interface Services {
  /** TennisBackend instance */
  backend: any;
  /** Data store instance */
  dataStore: any;
}

export interface AlertState {
  /** Alert visible */
  showAlert: boolean;
  /** Alert text */
  alertMessage: string;
  /** Show alert with message */
  showAlertMessage: Function;
}

export interface AdminPriceFeedback {
  /** Price validation error */
  priceError: string | null;
  /** Price update success flag */
  showPriceSuccess: boolean;
  setPriceError: Function;
  setShowPriceSuccess: Function;
}

export interface GuestCounterHook {
  /** Current guest count */
  guestCounter: number;
  incrementGuestCounter: Function;
}

export interface TimeoutState {
  /** Timeout warning visible */
  showTimeoutWarning: boolean;
}

export interface SearchState {
  /** Search input value */
  searchInput: string;
  /** Suggestions dropdown visible */
  showSuggestions: boolean;
  /** Search in progress */
  isSearching: boolean;
  /** Debounced search value */
  effectiveSearchInput: string;
  /** Add-player search input */
  addPlayerSearch: string;
  /** Add-player suggestions visible */
  showAddPlayerSuggestions: boolean;
  /** Debounced add-player search */
  effectiveAddPlayerSearch: string;
  /** Get suggestions for input */
  getAutocompleteSuggestions: Function;
  setSearchInput: Function;
  setShowSuggestions: Function;
  handleGroupSearchChange: Function;
  handleGroupSearchFocus: Function;
  handleAddPlayerSearchChange: Function;
  handleAddPlayerSearchFocus: Function;
}

export interface CourtAssignmentState {
  /** Most recently assigned court number */
  justAssignedCourt: number | null;
  /** Current session ID */
  assignedSessionId: string | null;
  /** Session end time ISO string */
  assignedEndTime: string | null;
}

export interface ClearCourtFlow {
  /** Court selected for clearing */
  selectedCourtToClear: number | null;
  setSelectedCourtToClear: Function;
  /** Current step in clear flow (1-4) */
  clearCourtStep: number;
  setClearCourtStep: Function;
  decrementClearCourtStep: Function;
}

export interface MobileState {
  /** Mobile flow active */
  mobileFlow: boolean;
  /** Court preselected from mobile */
  preselectedCourt: number | null;
  /** Mobile mode identifier */
  mobileMode: string | null;
  /** Countdown timer value */
  mobileCountdown: number | null;
  /** Location check in progress */
  checkingLocation: boolean;
  /** QR scanner modal visible */
  showQRScanner: boolean;
  /** GPS failure prompt visible */
  gpsFailedPrompt: boolean;
  /** QR scan result handler */
  onQRScanToken: Function;
  /** QR scanner close handler */
  onQRScannerClose: Function;
  /** Open QR scanner */
  openQRScanner: Function;
  /** Dismiss GPS prompt */
  dismissGpsPrompt: Function;
  /** Get mobile geolocation */
  getMobileGeolocation: Function;
  /** Request mobile reset */
  requestMobileReset: Function;
}

export interface BlockAdminState {
  /** Block modal visible */
  showBlockModal: boolean;
  /** Courts selected for blocking */
  selectedCourtsToBlock: any[];
  /** Block reason message */
  blockMessage: string;
  /** Block start time */
  blockStartTime: string;
  /** Block end time */
  blockEndTime: string;
  /** Block operation in progress */
  blockingInProgress: boolean;
  /** Minutes until block warning */
  blockWarningMinutes: number | null;
  /** Get block status for a court */
  getCourtBlockStatus: Function;
  setShowBlockModal: Function;
  setSelectedCourtsToBlock: Function;
  setBlockMessage: Function;
  setBlockStartTime: Function;
  setBlockEndTime: Function;
  setBlockingInProgress: Function;
  onCancelBlock: Function;
  onBlockCreate: Function;
}

export interface WaitlistAdminState {
  /** Source for waitlist reorder */
  waitlistMoveFrom: any;
  setWaitlistMoveFrom: Function;
  onReorderWaitlist: Function;
}

export interface GroupGuestState {
  /** Current group being registered */
  currentGroup: any[] | null;
  /** Guest form visible */
  showGuestForm: boolean;
  /** Guest name input */
  guestName: string;
  /** Guest sponsor member */
  guestSponsor: any;
  /** Guest name validation error */
  showGuestNameError: boolean;
  /** Sponsor validation error */
  showSponsorError: boolean;
  setCurrentGroup: Function;
  handleRemovePlayer: Function;
  handleSelectSponsor: Function;
  handleCancelGuest: Function;
}

export interface StreakState {
  /** Current streak data */
  registrantStreak: any;
  /** Streak modal visible */
  showStreakModal: boolean;
  /** Streak acknowledged by user */
  streakAcknowledged: boolean;
  setStreakAcknowledged: Function;
}

export interface MemberIdentityState {
  /** Current member number */
  memberNumber: string;
  /** Frequent partner list */
  frequentPartners: any[];
  /** Partners loading flag */
  frequentPartnersLoading: boolean;
  setMemberNumber: Function;
  /** Clear member cache */
  clearCache: Function;
  /** Fetch frequent partners */
  fetchFrequentPartners: Function;
  /** Current member UUID */
  currentMemberId: string | null;
  /** Set current member ID */
  setCurrentMemberId: Function;
}

// ============================================
// HANDLERS (34 keys explicitly enumerated)
// ============================================

/**
 * Handler functions returned by useRegistrationHandlers.
 * All 34 keys are explicitly listed to prevent silent drift.
 *
 * Grouped by module origin:
 * - Admin Handlers (7): from useAdminHandlers
 * - Guest Handlers (4): from useGuestHandlers
 * - Group Handlers (9): from useGroupHandlers
 * - Court Handlers (10): from useCourtHandlers
 * - Navigation Handlers (3): from useNavigationHandlers
 * - Core Handlers (5): inline in useRegistrationHandlers
 */
export interface Handlers {
  // Admin Handlers (7)
  handleClearAllCourts: Function;
  handleAdminClearCourt: Function;
  handleMoveCourt: Function;
  handleClearWaitlist: Function;
  handleRemoveFromWaitlist: Function;
  handlePriceUpdate: Function;
  handleExitAdmin: Function;

  // Guest Handlers (4)
  validateGuestName: Function;
  handleToggleGuestForm: Function;
  handleGuestNameChange: Function;
  handleAddGuest: Function;

  // Group Handlers (9)
  findMemberNumber: Function;
  addFrequentPartner: Function;
  sameGroup: Function;
  handleSuggestionClick: Function;
  handleGroupSuggestionClick: Function;
  handleAddPlayerSuggestionClick: Function;
  handleGroupSelectCourt: Function;
  handleStreakAcknowledge: Function;
  handleGroupJoinWaitlist: Function;

  // Court Handlers (10)
  saveCourtData: Function;
  getAvailableCourts: Function;
  clearCourt: Function;
  assignCourtToGroup: Function;
  changeCourt: Function;
  sendGroupToWaitlist: Function;
  deferWaitlistEntry: Function;
  undoOvertimeAndClearPrevious: Function;
  assignNextFromWaitlist: Function;
  joinWaitlistDeferred: Function;

  // Navigation Handlers (3)
  checkLocationAndProceed: Function;
  handleToggleAddPlayer: Function;
  handleGroupGoBack: Function;

  // Core Handlers (5)
  markUserTyping: Function;
  getCourtData: Function;
  clearSuccessResetTimer: Function;
  resetForm: Function;
  isPlayerAlreadyPlaying: Function;
}

// ============================================
// DOMAIN ENTITIES (add later from verified evidence only)
// ============================================

// Domain entity interfaces can be added here later if widely reused
// (Court, Block, Session, Group, Member, WaitlistEntry, etc.)
// Only add from verified evidence, not speculation.
