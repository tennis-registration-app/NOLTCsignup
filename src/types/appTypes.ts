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

// Orchestrator deps types — no circular dependency (orchestrators do not import appTypes)
import type { AssignCourtDeps } from '../registration/orchestration/assignCourtOrchestrator.js';
import type { WaitlistDeps } from '../registration/orchestration/waitlistOrchestrator.js';
import type { SuggestionClickDeps, AddPlayerSuggestionClickDeps } from '../registration/orchestration/memberSelectionOrchestrator.js';
import type { CourtChangeDeps } from '../registration/orchestration/courtChangeOrchestrator.js';
import type { ResetFormDeps } from '../registration/orchestration/resetOrchestrator.js';

// Re-export deps types for consumers
export type { AssignCourtDeps, WaitlistDeps, SuggestionClickDeps, AddPlayerSuggestionClickDeps, CourtChangeDeps, ResetFormDeps };

// ============================================
// UTILITY TYPES
// ============================================

/** React useState setter — direct value only */
type Setter<T> = (value: T) => void;

/** React useState setter — accepts direct value or updater function */
type Updater<T> = (value: T | ((prev: T) => T)) => void;

// ============================================
// CONFIG AND SERVICE INTERFACES
// Evidence: src/lib/config.js, src/lib/apiConfig.js,
//   src/registration/appHandlers/useRegistrationAppState.js,
//   src/lib/backend/index.js, src/lib/TennisCourtDataStore.js,
//   src/lib/TennisBusinessLogic.js
// ============================================

/** Registration CONSTANTS — derived from TENNIS_CONFIG at hook init time */
export interface RegistrationConstants {
  ADMIN_CODE: string;
  MAX_PLAYERS: number;
  MAX_PLAY_DURATION_MS: number;
  MAX_PLAY_DURATION_MIN: number;
  TIMEOUT_WARNING_MIN: number;
  SESSION_TIMEOUT_MS: number;
  SESSION_WARNING_MS: number;
  COURT_COUNT: number;
  CHANGE_COURT_TIMEOUT_SEC: number;
  AUTO_RESET_SUCCESS_MS: number;
  ALERT_DISPLAY_MS: number;
  AUTO_RESET_CLEAR_MS: number;
  DURATIONS: {
    SINGLES_MIN: number;
    DOUBLES_MIN: number;
  };
  MEMBER_COUNT: number;
  MEMBER_ID_START: number;
  MAX_AUTOCOMPLETE_RESULTS: number;
  MAX_FREQUENT_PARTNERS: number;
  MAX_WAITING_DISPLAY: number;
  AVG_GAME_TIME_MIN: number;
  POLL_INTERVAL_MS: number;
  UPDATE_INTERVAL_MS: number;
}

/** API_CONFIG — Proxy-backed, computed per-access from URL context */
export interface ApiConfig {
  SUPABASE_URL: string;
  BASE_URL: string;
  ANON_KEY: string;
  IS_MOBILE: boolean;
  IS_ADMIN: boolean;
  DEVICE_ID: string;
  DEVICE_TYPE: 'admin' | 'mobile' | 'kiosk';
}

/** TENNIS_CONFIG — combined config object from src/lib/config.js */
export interface TennisConfig {
  COURTS: {
    TOTAL_COUNT: number;
    TOP_ROW: number[];
    BOTTOM_ROW: number[];
  };
  TIMING: {
    SINGLES_DURATION_MIN: number;
    DOUBLES_DURATION_MIN: number;
    MAX_PLAY_DURATION_MIN: number;
    MAX_PLAY_DURATION_MS: number;
    AVG_GAME_TIME_MIN: number;
    TIMEOUT_WARNING_MIN: number;
    POLL_INTERVAL_MS: number;
    UPDATE_INTERVAL_MS: number;
    SESSION_TIMEOUT_MS: number;
    SESSION_WARNING_MS: number;
    CHANGE_COURT_TIMEOUT_SEC: number;
    AUTO_RESET_SUCCESS_MS: number;
    ALERT_DISPLAY_MS: number;
    AUTO_RESET_CLEAR_MS: number;
    CLUB_OPEN: number;
    CLUB_CLOSE: number;
  };
  DISPLAY: {
    MAX_WAITING_DISPLAY: number;
    MAX_AUTOCOMPLETE_RESULTS: number;
    MAX_FREQUENT_PARTNERS: number;
    HEADER_MARGIN_LEFT: string;
  };
  PLAYERS: {
    MAX_PER_GROUP: number;
    MIN_PER_GROUP: number;
  };
  STORAGE: {
    KEY: string;
    UPDATE_EVENT: string;
    SETTINGS_KEY: string;
    BLOCK_TEMPLATES_KEY: string;
    RECURRING_BLOCKS_KEY: string;
    BALL_SALES_KEY: string;
    ANALYTICS_KEY: string;
    GUEST_CHARGES_KEY: string;
  };
  ADMIN: { ACCESS_CODE: string };
  DEVICES: { KIOSK_ID: string; ADMIN_ID: string; MOBILE_ID: string };
  PRICING: { TENNIS_BALLS: number };
  GEOLOCATION: {
    ENABLED: boolean;
    CLUB_CENTER: { latitude: number; longitude: number };
    ALLOWED_RADIUS_METERS: number;
    CHECKING_MESSAGE: string;
    DENIAL_MESSAGE: string;
    ERROR_MESSAGE: string;
    TIMEOUT_MS: number;
  };
}

/** Standard backend response envelope. Evidence: src/lib/backend/types.js — CommandResponse */
export interface CommandResponse {
  ok: boolean;
  code?: string;
  message?: string;
  serverNow?: string;
}

/** Directory member (normalized). Evidence: TennisDirectory._normalizeMember */
export interface DirectoryMember {
  id: string;
  accountId: string;
  memberNumber: string;
  displayName: string;
  isPrimary: boolean;
  unclearedStreak?: number;
}

/** TennisBackend facade — .queries, .commands, .directory, .admin */
export interface TennisBackendShape {
  queries: {
    // Evidence: TennisQueries.js:36 — returns normalizeBoard(response) (DomainBoard + _raw)
    // Note: getBoard() JSDoc declares Board from domain.js; blocks field shape differs from BoardBlock
    // (JSDoc says Block[] with startsAt/endsAt; runtime returns {startTime, endTime, title}).
    // Using intersection to accept both until JSDoc is corrected.
    getBoard: () => Promise<DomainBoard & Record<string, unknown>>;
    // Evidence: TennisQueries.js:201 — delegates to getBoard
    refresh: () => Promise<DomainBoard & Record<string, unknown>>;
    // Evidence: TennisQueries.js:218 — returns { ok, partners: [{member_id, display_name, ...}] }
    getFrequentPartners: (memberId: string) => Promise<CommandResponse & { partners?: Array<{ member_id: string; display_name: string; member_number: string; play_count: number }> }>;
    // Evidence: TennisQueries.js:76 — callback receives DomainBoard, returns unsubscribe
    subscribeToBoardChanges: (callback: (board: DomainBoard) => void, options?: { pollIntervalMs?: number }) => () => void;
  };
  commands: {
    // Evidence: TennisCommands.js:58 — returns CommandResponse & { session? }
    assignCourt: (input: { courtId: string; participants: unknown[]; groupType: 'singles' | 'doubles'; addBalls?: boolean; splitBalls?: boolean; latitude?: number; longitude?: number }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:69 — returns CommandResponse
    endSession: (input: { courtId: string; reason?: string; endReason?: string; sessionId?: string }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:90 — returns CommandResponse & { entry?, position? }
    joinWaitlist: (input: { participants: unknown[]; groupType: 'singles' | 'doubles'; latitude?: number; longitude?: number; deferred?: boolean }) => Promise<CommandResponse & { entry?: unknown; position?: number }>;
    // Evidence: TennisCommands.js:101 — returns CommandResponse
    cancelWaitlist: (input: { entryId: string; reason?: string }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:118 — returns CommandResponse
    deferWaitlistEntry: (input: { entryId: string; deferred: boolean }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:135 — returns CommandResponse & { session? }
    assignFromWaitlist: (input: { waitlistEntryId: string; courtId: string; latitude?: number; longitude?: number }) => Promise<CommandResponse & { session?: { id?: string; participantDetails?: Array<{ memberId: string; name: string; accountId: string; isGuest: boolean }>; scheduled_end_at?: string; scheduledEndAt?: string } }>;
    // Evidence: TennisCommands.js:190 — returns CommandResponse & { endedSessionId?, restoredSessionId? }
    undoOvertimeTakeover: (input: { takeoverSessionId: string; displacedSessionId: string }) => Promise<CommandResponse & { endedSessionId?: string; restoredSessionId?: string }>;
    // Evidence: TennisCommands.js:173 — returns CommandResponse & { restoredSessionId? }
    restoreSession: (input: { displacedSessionId: string; takeoverSessionId: string }) => Promise<CommandResponse & { restoredSessionId?: string }>;
    // Evidence: TennisCommands.js:260 — returns CommandResponse & { sessionId?, fromCourtId?, toCourtId? }
    moveCourt: (input: { fromCourtId: string; toCourtId: string }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:278 — no params, returns CommandResponse & { cancelledCount? }
    clearWaitlist: () => Promise<CommandResponse & { cancelledCount?: number }>;
    // Evidence: TennisCommands.js:238 — returns CommandResponse & { transaction? }
    purchaseBalls: (input: { sessionId: string; accountId: string; splitBalls?: boolean; splitAccountIds?: string[] | null; idempotencyKey?: string }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:456 — resolves players, calls assignCourt
    assignCourtWithPlayers: (input: { courtId: string; players: GroupPlayer[]; groupType: 'singles' | 'doubles'; addBalls?: boolean; splitBalls?: boolean; latitude?: number; longitude?: number }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:526 — resolves players, calls joinWaitlist
    joinWaitlistWithPlayers: (input: { players: GroupPlayer[]; groupType: 'singles' | 'doubles'; latitude?: number; longitude?: number; deferred?: boolean }) => Promise<CommandResponse & { entry?: unknown; position?: number; data?: { waitlist?: { id?: string; position?: number } } }>;
    // Evidence: TennisCommands.js:560 — returns CommandResponse
    updateSessionTournament: (input: { sessionId: string; isTournament: boolean }) => Promise<CommandResponse>;
    // Evidence: TennisCommands.js:576 — returns { ok, token?, expiresAt? }
    generateLocationToken: (input?: { validityMinutes?: number }) => Promise<CommandResponse & { token?: string; expiresAt?: string }>;
  };
  directory: {
    // Evidence: TennisDirectory.js:18 — returns normalized Member[]
    searchMembers: (query: string) => Promise<DirectoryMember[]>;
    // Evidence: TennisDirectory.js:38 — returns normalized Member[] for account
    getMembersByAccount: (memberNumber: string) => Promise<DirectoryMember[]>;
    // Evidence: TennisDirectory.js:69 — returns all normalized Member[]
    getAllMembers: () => Promise<DirectoryMember[]>;
    // Evidence: TennisDirectory.js:98 — returns single Member or null
    findMemberByName: (memberNumber: string, name: string) => Promise<DirectoryMember | null>;
    // Evidence: TennisDirectory.js:150 — cache invalidation by member number
    invalidateAccount: (memberNumber: string) => void;
  };
  admin: {
    // Evidence: AdminCommands.js:25 — returns CommandResponse & { block? }
    createBlock: (input: { courtId: string; blockType: string; title: string; startsAt: string; endsAt: string; deviceId: string; deviceType?: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:89 — returns CommandResponse
    cancelBlock: (input: { blockId: string; deviceId: string; deviceType?: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:113 — returns CommandResponse & { session? }
    adminEndSession: (input: { sessionId?: string; courtId?: string; reason?: string; deviceId: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:137 — returns CommandResponse & { sessionsEnded? }
    clearAllCourts: (input: { reason?: string; deviceId: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:160 — returns CommandResponse
    removeFromWaitlist: (input: { waitlistEntryId: string; reason?: string; deviceId: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:312 — returns { ok, settings?, operating_hours?, upcoming_overrides? }
    getSettings: () => Promise<CommandResponse & { settings?: Record<string, unknown>; operating_hours?: OperatingHoursEntry[]; upcoming_overrides?: unknown[] }>;
    // Evidence: AdminCommands.js:329 — returns CommandResponse & { updated? }
    updateSettings: (input: { settings?: Record<string, unknown>; operatingHours?: OperatingHoursEntry[]; operatingHoursOverride?: Record<string, unknown>; deleteOverride?: string }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:346 — returns CommandResponse & { old_position?, new_position? }
    reorderWaitlist: (input: { entryId: string; newPosition: number }) => Promise<CommandResponse & { old_position?: number; new_position?: number }>;
    // Evidence: AdminCommands.js:363 — returns CommandResponse & { sessions? }
    getSessionHistory: (input?: { courtNumber?: number; memberName?: string; dateStart?: string; dateEnd?: string; limit?: number }) => Promise<CommandResponse & { sessions?: unknown[] }>;
    // Evidence: AdminCommands.js:390 — returns CommandResponse & { summary?, heatmap? }
    getAnalytics: (input: { start: string; end: string }) => Promise<CommandResponse & { summary?: Record<string, unknown>; heatmap?: unknown[] }>;
    // Evidence: AdminCommands.js:379 — returns CommandResponse & { heatmap?, daysAnalyzed? }
    getUsageAnalytics: (days?: number) => Promise<CommandResponse & { heatmap?: Array<{ day_of_week: number; hour: number; session_count: number }>; daysAnalyzed?: number }>;
    // Evidence: AdminCommands.js:420 — returns CommandResponse
    aiAssistant: (input: { prompt: string; mode?: string; actions_token?: string | null; confirm_destructive?: boolean }) => Promise<CommandResponse>;
    // Evidence: AdminCommands.js:433 — returns CommandResponse & { session? }
    updateSession: (input: { sessionId: string; participants: Array<{ name: string; type: 'member' | 'guest'; member_id?: string }>; scheduledEndAt: string | null; deviceId: string }) => Promise<CommandResponse>;
  };
}

/** TennisCourtDataStore — cached localStorage wrapper */
export interface DataStoreShape {
  // Evidence: TennisCourtDataStore.js — generic key-value store, values are opaque
  get: (key: string) => Promise<unknown>;
  set: (key: string, data: unknown, options?: { immediate?: boolean }) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: (clearStorage?: boolean) => void;
  refresh: () => void;
  getMetrics: () => {
    cacheHits: number;
    cacheMisses: number;
    totalOperations: number;
    totalResponseTime: number;
    storageOperationsSaved: number;
    avgResponseTime: number;
    cacheHitRate: number;
  };
  resetMetrics: () => void;
}

/** TennisBusinessLogic — static utility methods */
export interface TennisBusinessLogicShape {
  formatPlayerDisplayName: (name: string) => string;
  // Evidence: TennisBusinessLogic.js:62 — courts accessed as court.session?.scheduledEndAt, court.number
  calculateEstimatedWaitTime: (
    position: number,
    courts: DomainCourt[],
    currentTime: Date,
    avgGameTime?: number,
  ) => number;
  // Evidence: TennisBusinessLogic.js:114 — data.courts (DomainCourt[]), data.waitlist (DomainWaitlistEntry[])
  // currentGroup uses UI-layer GroupPlayer (accesses .id, .name)
  isPlayerAlreadyPlaying: (
    playerId: string | number,
    data: RegistrationUiState['data'],
    currentGroup?: GroupPlayer[],
  ) => { isPlaying: boolean; location?: string; courtNumber?: number; position?: number; playerName?: string };
  calculateGameDuration: (
    groupSize: number,
    singlesMinutes?: number,
    doublesMinutes?: number,
    maxPlayers?: number,
  ) => number;
  // Evidence: TennisBusinessLogic.js:191 — both groups accessed via .id
  checkGroupOverlap: (
    group1: GroupPlayer[],
    group2: GroupPlayer[],
  ) => {
    hasOverlap: boolean;
    overlappingPlayers: GroupPlayer[];
    overlappingCount: number;
    isExactMatch: boolean;
    isSubset: boolean;
    isSuperset: boolean;
    group1Size: number;
    group2Size: number;
  };
  // Evidence: TennisBusinessLogic.js:223 — players compared via sameGroup, recentlyCleared has {originalEndTime, players}
  getOriginalEndTimeForGroup: (
    players: GroupPlayer[],
    recentlyCleared: Array<{ originalEndTime: string; players: GroupPlayer[] }>,
  ) => string | null;
  // Evidence: TennisBusinessLogic.js:29 — compares by .memberId, .id, .name
  sameGroup: (a: GroupPlayer[], b: GroupPlayer[]) => boolean;
}

// ============================================
// APP STATE — Canonical Shape
// Assembled by buildRegistrationReturn.ts from 6 sub-hooks.
// Complete — covers all fields returned by buildRegistrationReturn.
// ============================================

/**
 * AppState — the registration app's complete state surface.
 *
 * 33 top-level keys, frozen by contract test. Do not add new top-level keys;
 * instead add fields to the appropriate sub-interface (see CONTRIBUTING.md).
 *
 * Logical groupings (governance only — access paths unchanged):
 *
 * UI State:       state, setters, refs
 * Domain Slices:  alert, adminPriceFeedback, guestCounterHook, timeout, search,
 *                 courtAssignment, clearCourtFlow, mobile, blockAdmin,
 *                 waitlistAdmin, groupGuest, streak, memberIdentity
 * Derived:        derived
 * Helpers:        helpers
 * Services:       services (backend, dataStore)
 * Config:         CONSTANTS, TENNIS_CONFIG, API_CONFIG, TennisBusinessLogic
 * Orchestrators:  computeRegistrationCourtSelection, validateGroupCompat,
 *                 assignCourtToGroupOrchestrated, sendGroupToWaitlistOrchestrated,
 *                 handleSuggestionClickOrchestrated, handleAddPlayerSuggestionClickOrchestrated,
 *                 changeCourtOrchestrated, resetFormOrchestrated
 * Debug:          dbg, DEBUG
 */
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
  CONSTANTS: RegistrationConstants;
  /** Tennis configuration */
  TENNIS_CONFIG: TennisConfig;
  /** API configuration */
  API_CONFIG: ApiConfig;
  /** Business logic service */
  TennisBusinessLogic: TennisBusinessLogicShape;
  // Evidence: overtimeEligibility.js — pure function: (DomainCourt[], UpcomingBlock[]) => CourtSelectionResult
  computeRegistrationCourtSelection: (courts: DomainCourt[], upcomingBlocks?: UpcomingBlock[]) => CourtSelectionResult;
  // Evidence: useRegistrationHelpers.js:127 — (players, guests) => { ok, errors }
  validateGroupCompat: (players: GroupPlayer[], guests: number) => { ok: boolean; errors: string[] };
  // Evidence: assignCourtOrchestrator.ts:74 — async (courtNumber, selectableCount, deps) => void
  assignCourtToGroupOrchestrated: (courtNumber: number | null | undefined, selectableCountAtSelection: number | null, deps: AssignCourtDeps) => Promise<void>;
  // Evidence: waitlistOrchestrator.ts:31 — async (group, deps, options?) => void
  sendGroupToWaitlistOrchestrated: (group: GroupPlayer[] | null, deps: WaitlistDeps, options?: { deferred?: boolean }) => Promise<void>;
  // Evidence: memberSelectionOrchestrator.ts:43 — async (suggestion, deps) => void
  handleSuggestionClickOrchestrated: (suggestion: AutocompleteSuggestion, deps: SuggestionClickDeps) => Promise<void>;
  // Evidence: memberSelectionOrchestrator.ts:235 — async (suggestion, deps) => void
  handleAddPlayerSuggestionClickOrchestrated: (suggestion: AutocompleteSuggestion, deps: AddPlayerSuggestionClickDeps) => Promise<void>;
  // Evidence: courtChangeOrchestrator.ts:19 — (deps) => void
  changeCourtOrchestrated: (deps: CourtChangeDeps) => void;
  // Evidence: resetOrchestrator.ts:57 — async (deps) => void
  resetFormOrchestrated: (deps: ResetFormDeps) => Promise<void>;
  // Evidence: useRegistrationDomainHooks.js:48 — (...args) => { if (DEBUG) logger.debug(...) }
  dbg: (...args: unknown[]) => void;
  /** Debug mode flag */
  DEBUG: boolean;
}

export interface RegistrationUiState {
  /** Court and registration data — board state plus courtSelection */
  data: {
    /** Current court selection result */
    courtSelection: CourtSelectionResult;
    /** Upcoming court blocks for today */
    upcomingBlocks: UpcomingBlock[];
    /** Domain courts from board */
    courts: DomainCourt[];
    /** Domain waitlist from board */
    waitlist: DomainWaitlistEntry[];
    /** Active blocks (derived) */
    blocks: BoardBlock[];
    /** Server timestamp */
    serverNow: string;
    /** Operating hours from board */
    operatingHours: OperatingHoursEntry[];
    [key: string]: unknown;
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
  /** Displacement data from overtime takeover */
  displacement: DisplacementInfo | null;
  /** Court data snapshot before change */
  originalCourtData: OriginalCourtData | null;
  /** Add player form visible */
  showAddPlayer: boolean;
  /** Available court numbers */
  availableCourts: number[];
  /** Current timestamp */
  currentTime: number;
  /** Court number being moved */
  courtToMove: number | null;
  /** Ball price input value */
  ballPriceInput: string;
  /** Group that was replaced on overtime takeover */
  replacedGroup: ReplacedGroup | null;
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
  /** Operating hours data */
  operatingHours: OperatingHoursEntry[] | null;
}

export interface RegistrationSetters {
  // Evidence: useState(() => ({ courts: ..., waitlist: [], blocks: [] })) — uses functional updates
  setData: Updater<RegistrationUiState['data']>;
  // Evidence: useCallback wrapper adds (screen, source?) logging around _setCurrentScreen
  setCurrentScreen: (screen: string, source?: string) => void;
  // Evidence: useState([]) — court numbers
  setAvailableCourts: Setter<number[]>;
  // Evidence: useState(0)
  setWaitlistPosition: Setter<number>;
  // Evidence: useState(null) — operating hours array or null
  setOperatingHours: Setter<OperatingHoursEntry[] | null>;
  // Evidence: useState(false)
  setShowSuccess: Setter<boolean>;
  // Evidence: useState(null) — replaced group snapshot or null
  setReplacedGroup: Setter<ReplacedGroup | null>;
  // Evidence: useState(null) — displacement info or null
  setDisplacement: Setter<DisplacementInfo | null>;
  // Evidence: useState(null) — court data snapshot or null
  setOriginalCourtData: Setter<OriginalCourtData | null>;
  // Evidence: useState(false)
  setCanChangeCourt: Setter<boolean>;
  // Evidence: useState(CONSTANTS.CHANGE_COURT_TIMEOUT_SEC) — uses functional updates (prev => ...)
  setChangeTimeRemaining: Updater<number>;
  // Evidence: useState(false)
  setIsTimeLimited: Setter<boolean>;
  // Evidence: useState(null) — string reason or null
  setTimeLimitReason: Setter<string | null>;
  // Evidence: useState(false)
  setShowAddPlayer: Setter<boolean>;
  // Evidence: useState(false)
  setIsChangingCourt: Setter<boolean>;
  // Evidence: useState(false)
  setWasOvertimeCourt: Setter<boolean>;
  // Evidence: useState(() => Date.now()) — epoch ms
  setLastActivity: Setter<number>;
  // Evidence: useState(() => new Date())
  setCurrentTime: Setter<Date>;
  // Evidence: useState(null) — court number or null
  setCourtToMove: Setter<number | null>;
  // Evidence: useState(false)
  setHasWaitlistPriority: Setter<boolean>;
  // Evidence: useState(null) — waitlist entry UUID or null
  setCurrentWaitlistEntryId: Setter<string | null>;
  // Evidence: useState(false)
  setIsAssigning: Setter<boolean>;
  // Evidence: useState(false)
  setIsJoiningWaitlist: Setter<boolean>;
  // Evidence: useState('')
  setBallPriceInput: Setter<string>;
  // Evidence: useState(TENNIS_CONFIG.PRICING.TENNIS_BALLS * 100) — cents
  setBallPriceCents: Setter<number>;
  // Evidence: useState(false)
  setIsUserTyping: Setter<boolean>;
}

export interface RegistrationRefs {
  /** Timer ref for success screen auto-reset */
  successResetTimerRef: { current: ReturnType<typeof setTimeout> | null };
  /** Timer ref for typing debounce */
  typingTimeoutRef: { current: ReturnType<typeof setTimeout> | null };
}

export interface DerivedState {
  /** Mobile viewport detected */
  isMobileView: boolean;
  /** First group can play */
  canFirstGroupPlay: boolean;
  /** Second group can play */
  canSecondGroupPlay: boolean;
  /** First waitlist entry summary */
  firstWaitlistEntry: WaitlistEntrySummary | null;
  /** Second waitlist entry summary */
  secondWaitlistEntry: WaitlistEntrySummary | null;
  /** First entry data (same ref as firstWaitlistEntry) */
  firstWaitlistEntryData: WaitlistEntrySummary | null;
  /** Second entry data (same ref as secondWaitlistEntry) */
  secondWaitlistEntryData: WaitlistEntrySummary | null;
  /** Pass-through group can play */
  canPassThroughGroupPlay: boolean;
  /** Pass-through entry summary */
  passThroughEntry: WaitlistEntrySummary | null;
  /** Pass-through entry data (same ref as passThroughEntry) */
  passThroughEntryData: WaitlistEntrySummary | null;
  /** Member database lookup (legacy static data) */
  memberDatabase: Record<string, MemberDatabaseEntry>;
}

export interface HelperFunctions {
  // Evidence: useRegistrationHelpers — marks user typing, resets 3s debounce
  markUserTyping: () => void;
  // Evidence: useRegistrationHelpers — returns data (board state object)
  getCourtData: () => RegistrationUiState['data'];
  // Evidence: useRegistrationHelpers — clears successResetTimerRef
  clearSuccessResetTimer: () => void;
  // Evidence: useRegistrationDataLayer — fetches board from backend
  loadData: () => Promise<void>;
  // Evidence: useRegistrationAppState — resets all state for inactivity timeout
  applyInactivityTimeoutExitSequence: () => void;
  // Evidence: useRegistrationHelpers — returns sorted court numbers with active sessions
  getCourtsOccupiedForClearing: () => number[];
  // Evidence: useRegistrationHelpers — checks engagement, shows toast if blocked
  guardAddPlayerEarly: (getBoardData: () => RegistrationUiState['data'], player: GroupPlayer) => boolean;
  // Evidence: useRegistrationHelpers — returns true if player is NOT a duplicate
  guardAgainstGroupDuplicate: (player: GroupPlayer, playersArray: GroupPlayer[]) => boolean;
}

export interface Services {
  /** TennisBackend instance */
  backend: TennisBackendShape;
  /** Data store instance */
  dataStore: DataStoreShape;
}

export interface AlertState {
  /** Alert visible */
  showAlert: boolean;
  /** Alert text */
  alertMessage: string;
  // Evidence: useAlertDisplay — dispatch SET_VISIBILITY
  setShowAlert: Setter<boolean>;
  // Evidence: useAlertDisplay — dispatch SET_MESSAGE
  setAlertMessage: Setter<string>;
  // Evidence: useAlertDisplay — shows alert, auto-hides after alertDurationMs
  showAlertMessage: (message: string) => void;
}

export interface AdminPriceFeedback {
  /** Price validation error */
  priceError: string | null;
  /** Price update success flag */
  showPriceSuccess: boolean;
  // Evidence: useAdminPriceFeedback — dispatch SET_ERROR
  setPriceError: Setter<string>;
  // Evidence: useAdminPriceFeedback — dispatch SET_SUCCESS
  setShowPriceSuccess: Setter<boolean>;
  // Evidence: useAdminPriceFeedback — shows success, clears error, auto-hides after 3s
  showPriceSuccessWithClear: () => void;
}

export interface GuestCounterHook {
  /** Current guest count */
  guestCounter: number;
  // Evidence: useGuestCounter — increments counter for unique negative guest IDs
  incrementGuestCounter: () => void;
}

export interface TimeoutState {
  /** Timeout warning visible */
  showTimeoutWarning: boolean;
}

// New fields for member search/lookup should be added here, not as AppState top-level keys.
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
  // Evidence: useMemberSearch — pure filter returning AutocompleteSuggestion[]
  getAutocompleteSuggestions: (input: string) => AutocompleteSuggestion[];
  // Evidence: useMemberSearch — dispatch SET_SEARCH_INPUT
  setSearchInput: Setter<string>;
  // Evidence: useMemberSearch — dispatch SET_SHOW_SUGGESTIONS
  setShowSuggestions: Setter<boolean>;
  // Evidence: useMemberSearch — dispatch SET_ADD_PLAYER_SEARCH
  setAddPlayerSearch: Setter<string>;
  // Evidence: useMemberSearch — dispatch SET_SHOW_ADD_PLAYER_SUGGESTIONS
  setShowAddPlayerSuggestions: Setter<boolean>;
  // Evidence: useMemberSearch — dispatch SET_API_MEMBERS (normalized account members)
  setApiMembers: Setter<ApiMember[]>;
  // Evidence: useMemberSearch — handles ChangeEvent, detects admin code
  handleGroupSearchChange: (e: { target: { value: string } }) => void;
  // Evidence: useMemberSearch — shows suggestions on focus
  handleGroupSearchFocus: () => void;
  // Evidence: useMemberSearch — handles ChangeEvent for add-player input
  handleAddPlayerSearchChange: (e: { target: { value: string } }) => void;
  // Evidence: useMemberSearch — shows add-player suggestions on focus
  handleAddPlayerSearchFocus: () => void;
}

export interface CourtAssignmentState {
  /** Most recently assigned court number */
  justAssignedCourt: number | null;
  // Evidence: useCourtAssignmentResult — dispatch SET_JUST_ASSIGNED_COURT
  setJustAssignedCourt: Setter<number | null>;
  /** Current session ID */
  assignedSessionId: string | null;
  // Evidence: useCourtAssignmentResult — dispatch SET_ASSIGNED_SESSION_ID
  setAssignedSessionId: Setter<string | null>;
  /** Session end time ISO string */
  assignedEndTime: string | null;
  // Evidence: useCourtAssignmentResult — dispatch SET_ASSIGNED_END_TIME
  setAssignedEndTime: Setter<string | null>;
  /** Court has been assigned */
  hasAssignedCourt: boolean;
  // Evidence: useCourtAssignmentResult — dispatch SET_HAS_ASSIGNED_COURT
  setHasAssignedCourt: Setter<boolean>;
}

export interface ClearCourtFlow {
  /** Court selected for clearing */
  selectedCourtToClear: number | null;
  // Evidence: useClearCourtFlow — dispatch SET_SELECTED_COURT_TO_CLEAR
  setSelectedCourtToClear: Setter<number | null>;
  /** Current step in clear flow (1-4) */
  clearCourtStep: number;
  // Evidence: useClearCourtFlow — dispatch SET_CLEAR_COURT_STEP
  setClearCourtStep: Setter<number>;
  // Evidence: useClearCourtFlow — decrements step for handleGroupGoBack
  decrementClearCourtStep: () => void;
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
  /** Location token */
  locationToken: string | null;
  /** QR scanner modal visible */
  showQRScanner: boolean;
  /** GPS failure prompt visible */
  gpsFailedPrompt: boolean;
  // Evidence: useMobileFlowController — useState(false)
  setMobileFlow: Setter<boolean>;
  // Evidence: useMobileFlowController — useState(null), court number or null
  setPreselectedCourt: Setter<number | null>;
  // Evidence: useMobileFlowController — useState(null), string mode or null
  setMobileMode: Setter<string | null>;
  // Evidence: useMobileFlowController — useState(false)
  setCheckingLocation: Setter<boolean>;
  // Evidence: useMobileFlowController — useState(null), token string or null
  setLocationToken: Setter<string | null>;
  // Evidence: useMobileFlowController — useState(false)
  setShowQRScanner: Setter<boolean>;
  // Evidence: useMobileFlowController — useState(false)
  setGpsFailedPrompt: Setter<boolean>;
  // Evidence: useMobileFlowController — handles QR scan, sets token, shows toast
  onQRScanToken: (token: string) => void;
  // Evidence: useMobileFlowController — closes QR scanner
  onQRScannerClose: () => void;
  // Evidence: useMobileFlowController — opens QR scanner
  openQRScanner: () => void;
  // Evidence: useMobileFlowController — dismisses GPS failure prompt
  dismissGpsPrompt: () => void;
  // Evidence: useMobileFlowController — returns GPS coords, location token, or null
  getMobileGeolocation: () => Promise<{ latitude: number; longitude: number } | { location_token: string } | null>;
  // Evidence: useMobileFlowController — sends resetRegistration postMessage to parent
  requestMobileReset: () => void;
}

// New fields for block scheduling should be added here, not as AppState top-level keys.
export interface BlockAdminState {
  /** Block modal visible */
  showBlockModal: boolean;
  /** Court numbers selected for blocking */
  selectedCourtsToBlock: number[];
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
  // Evidence: useBlockAdmin — dispatch SET_BLOCK_WARNING_MINUTES
  setBlockWarningMinutes: Setter<number | null>;
  // Evidence: useBlockAdmin — checks block status for a court number
  getCourtBlockStatus: (courtNumber: number) => CourtBlockStatusResult | null;
  // Evidence: useBlockAdmin — dispatch SET_SHOW_BLOCK_MODAL
  setShowBlockModal: Setter<boolean>;
  // Evidence: useBlockAdmin — dispatch SET_SELECTED_COURTS_TO_BLOCK
  setSelectedCourtsToBlock: Setter<number[]>;
  // Evidence: useBlockAdmin — dispatch SET_BLOCK_MESSAGE
  setBlockMessage: Setter<string>;
  // Evidence: useBlockAdmin — dispatch SET_BLOCK_START_TIME
  setBlockStartTime: Setter<string>;
  // Evidence: useBlockAdmin — dispatch SET_BLOCK_END_TIME
  setBlockEndTime: Setter<string>;
  // Evidence: useBlockAdmin — dispatch SET_BLOCKING_IN_PROGRESS
  setBlockingInProgress: Setter<boolean>;
  // Evidence: useBlockAdmin — calls handleCancelBlockOp(blockId, courtNum)
  onCancelBlock: (blockId: string, courtNumber: number) => Promise<void>;
  // Evidence: useBlockAdmin — calls handleBlockCreateOp with current state
  onBlockCreate: () => Promise<void>;
}

// New fields for waitlist features should be added here, not as AppState top-level keys.
export interface WaitlistAdminState {
  /** Source for waitlist reorder — queue index or null to cancel */
  waitlistMoveFrom: number | null;
  // Evidence: useWaitlistAdmin — dispatch, called with number or null
  setWaitlistMoveFrom: Setter<number | null>;
  // Evidence: useWaitlistAdmin — calls handleReorderWaitlistOp(fromIndex, toIndex)
  onReorderWaitlist: (fromIndex: number, toIndex: number) => Promise<void>;
}

// New fields for group/guest management should be added here, not as AppState top-level keys.
export interface GroupGuestState {
  /** Current group being registered */
  currentGroup: GroupPlayer[] | null;
  /** Guest form visible */
  showGuestForm: boolean;
  /** Guest name input */
  guestName: string;
  /** Guest sponsor member number */
  guestSponsor: string;
  /** Guest name validation error */
  showGuestNameError: boolean;
  /** Sponsor validation error */
  showSponsorError: boolean;
  // Evidence: useGroupGuest — dispatch SET_CURRENT_GROUP
  setCurrentGroup: Setter<GroupPlayer[] | null>;
  // Evidence: useGroupGuest — dispatch SET_GUEST_NAME
  setGuestName: Setter<string>;
  // Evidence: useGroupGuest — dispatch SET_GUEST_SPONSOR (member number string)
  setGuestSponsor: Setter<string>;
  // Evidence: useGroupGuest — dispatch SET_SHOW_GUEST_FORM
  setShowGuestForm: Setter<boolean>;
  // Evidence: useGroupGuest — dispatch SET_SHOW_GUEST_NAME_ERROR
  setShowGuestNameError: Setter<boolean>;
  // Evidence: useGroupGuest — dispatch SET_SHOW_SPONSOR_ERROR
  setShowSponsorError: Setter<boolean>;
  // Evidence: useGroupGuest — removes player by index
  handleRemovePlayer: (index: number) => void;
  // Evidence: useGroupGuest — selects sponsor and clears error
  handleSelectSponsor: (memberNumber: string) => void;
  // Evidence: useGroupGuest — resets guest form (hides form, clears fields)
  handleCancelGuest: () => void;
}

export interface StreakState {
  /** Current streak count */
  registrantStreak: number;
  // Evidence: useStreak — dispatch SET_REGISTRANT_STREAK (number)
  setRegistrantStreak: Setter<number>;
  /** Streak modal visible */
  showStreakModal: boolean;
  // Evidence: useStreak — dispatch SET_SHOW_STREAK_MODAL
  setShowStreakModal: Setter<boolean>;
  /** Streak acknowledged by user */
  streakAcknowledged: boolean;
  // Evidence: useStreak — dispatch SET_STREAK_ACKNOWLEDGED
  setStreakAcknowledged: Setter<boolean>;
}

export interface MemberIdentityState {
  /** Current member number */
  memberNumber: string;
  /** Frequent partner list */
  frequentPartners: FrequentPartner[];
  /** Partners loading flag */
  frequentPartnersLoading: boolean;
  // Evidence: useMemberIdentity — dispatch SET_MEMBER_NUMBER
  setMemberNumber: Setter<string>;
  // Evidence: useMemberIdentity — clears frequentPartnersCacheRef
  clearCache: () => void;
  // Evidence: useMemberIdentity — fetches partners with caching (TTL 10min)
  fetchFrequentPartners: (memberId: string) => Promise<void>;
  /** Current member UUID */
  currentMemberId: string | null;
  // Evidence: useMemberIdentity — dispatch SET_CURRENT_MEMBER_ID
  setCurrentMemberId: Setter<string | null>;
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
  // Admin Handlers (7) — from adminHandlers.js
  // Evidence: useCallback(() => handleClearAllCourtsOp(...)) — no params, async op
  handleClearAllCourts: () => Promise<void>;
  // Evidence: useCallback((courtNum) => handleAdminClearCourtOp(..., courtNum))
  handleAdminClearCourt: (courtNum: number) => void;
  // Evidence: useCallback((fromCourtNum, toCourtNum) => handleMoveCourtOp(...))
  handleMoveCourt: (fromCourtNum: number, toCourtNum: number) => void;
  // Evidence: useCallback(() => handleClearWaitlistOp(...)) — no params, async op
  handleClearWaitlist: () => Promise<void>;
  // Evidence: useCallback((group) => handleRemoveFromWaitlistOp(..., group))
  handleRemoveFromWaitlist: (group: GroupPlayer[]) => void;
  // Evidence: useCallback(async () => { parseFloat(ballPriceInput)... }) — no params
  handlePriceUpdate: () => Promise<void>;
  // Evidence: useCallback(() => { setCurrentScreen('home'); setSearchInput('') })
  handleExitAdmin: () => void;

  // Guest Handlers (4) — from guestHandlers.js
  // Evidence: useCallback((name) => { words.length < 2 ... }) — returns boolean
  validateGuestName: (name: string) => boolean;
  // Evidence: useCallback((prefillName) => { if (showGuestForm) ... }) — optional string param
  handleToggleGuestForm: (prefillName?: string) => void;
  // Evidence: useCallback((e) => { markUserTyping(); setGuestName(e.target.value) })
  handleGuestNameChange: (e: { target: { value: string } }) => void;
  // Evidence: useCallback(async () => { if (!validateGuestName(guestName)) ... })
  handleAddGuest: () => Promise<void>;

  // Group Handlers (9) — from groupHandlers.js
  // Evidence: useCallback((playerId) => { ... return memberNum or '' }) — returns string
  findMemberNumber: (playerId: string) => string;
  // Evidence: useCallback((player) => { ... setCurrentGroup([...currentGroup, newPlayer]) })
  addFrequentPartner: (player: FrequentPartner['player']) => void;
  // Evidence: useCallback((a=[], b=[]) => { ... return A.every(...) }) — returns boolean
  sameGroup: (a: GroupPlayer[], b: GroupPlayer[]) => boolean;
  // Evidence: useCallback(async (suggestion) => { await handleSuggestionClickOrchestrated(...) })
  handleSuggestionClick: (suggestion: AutocompleteSuggestion) => Promise<void>;
  // Evidence: useCallback(async (suggestion) => { await handleSuggestionClick(suggestion) })
  handleGroupSuggestionClick: (suggestion: AutocompleteSuggestion) => Promise<void>;
  // Evidence: useCallback(async (suggestion) => { await handleAddPlayerSuggestionClickOrchestrated(...) })
  handleAddPlayerSuggestionClick: (suggestion: AutocompleteSuggestion) => Promise<void>;
  // Evidence: useCallback(() => { if (registrantStreak >= 3 ...) ... setCurrentScreen('court') })
  handleGroupSelectCourt: () => void;
  // Evidence: useCallback(() => { setStreakAcknowledged(true); setShowStreakModal(false) })
  handleStreakAcknowledge: () => void;
  // Evidence: useCallback(async () => { await sendGroupToWaitlist(currentGroup) })
  handleGroupJoinWaitlist: () => Promise<void>;

  // Court Handlers (10) — from courtHandlers.js
  // Evidence: useCallback(async (_data) => { ... return true }) — deprecated, returns Promise<boolean>
  saveCourtData: (data: RegistrationUiState['data']) => Promise<boolean>;
  // Evidence: useCallback((checkWaitlistPriority?, _includeOvertime?, excludeCourt?, dataOverride?) => { ... return filtered })
  getAvailableCourts: (
    checkWaitlistPriority?: boolean,
    includeOvertimeIfChanging?: boolean,
    excludeCourtNumber?: number | null,
    dataOverride?: RegistrationUiState['data'],
  ) => number[];
  // Evidence: useCallback(async (courtNumber, clearReason='Cleared') => { ... })
  clearCourt: (courtNumber: number, clearReason?: string) => Promise<void>;
  // Evidence: useCallback(async (courtNumber, selectableCountAtSelection=null) => { ... })
  assignCourtToGroup: (courtNumber: number, selectableCountAtSelection?: number | null) => Promise<void>;
  // Evidence: useCallback(() => { changeCourtOrchestrated({...}) })
  changeCourt: () => void;
  // Evidence: useCallback(async (group, options) => { await sendGroupToWaitlistOrchestrated(...) })
  sendGroupToWaitlist: (group: GroupPlayer[], options?: { deferred?: boolean }) => Promise<void>;
  // Evidence: useCallback(async (entryId) => { await backend.commands.deferWaitlistEntry(...) })
  deferWaitlistEntry: (entryId: string) => Promise<void>;
  // Evidence: useCallback(async (previousCourtNumber, displacement) => { ... })
  undoOvertimeAndClearPrevious: (previousCourtNumber: number, displacement: DisplacementInfo) => Promise<void>;
  // Evidence: useCallback(async () => { ... backend.queries.getBoard() ... })
  assignNextFromWaitlist: () => Promise<void>;
  // Evidence: useCallback(async (group) => { await sendGroupToWaitlist(group, {deferred: true}) })
  joinWaitlistDeferred: (group: GroupPlayer[]) => Promise<void>;

  // Navigation Handlers (3) — from navigationHandlers.js
  // Evidence: useCallback(async (onSuccess) => { ... GeolocationService.verifyAtClub() ... onSuccess() })
  checkLocationAndProceed: (onSuccess: () => void) => Promise<void>;
  // Evidence: useCallback(() => { if (showGuestForm) ... else setShowAddPlayer(!showAddPlayer) })
  handleToggleAddPlayer: () => void;
  // Evidence: useCallback(() => { if (mobileFlow) ... else setCurrentScreen('home') })
  handleGroupGoBack: () => void;

  // Core Handlers (5) — from useRegistrationHandlers.js
  // Evidence: delegates to app.helpers.markUserTyping
  markUserTyping: () => void;
  // Evidence: delegates to app.helpers.getCourtData
  getCourtData: () => RegistrationUiState['data'];
  // Evidence: useCallback(() => { clearTimeout(ref); ref = null })
  clearSuccessResetTimer: () => void;
  // Evidence: useCallback(() => { resetFormOrchestrated(createResetDeps()) })
  resetForm: () => void;
  // Evidence: useCallback((playerId) => TennisBusinessLogic.isPlayerAlreadyPlaying(...))
  isPlayerAlreadyPlaying: (playerId: string) => { isPlaying: boolean; location?: string; courtNumber?: number; position?: number; playerName?: string };
}

// ============================================
// DOMAIN ENTITIES
// Evidence: src/lib/types/domain.js (JSDoc), src/lib/schemas/domain.js (Zod),
//   src/lib/normalize/*.js (actual output shapes)
// ============================================

/** Domain Member — normalized player in a group. Evidence: normalizeMember.js + MemberSchema */
export interface DomainMember {
  memberId: string;
  displayName: string;
  isGuest: boolean;
}

/** Domain Group — 1-4 players. Evidence: normalizeGroup.js + GroupSchema */
export interface DomainGroup {
  id: string;
  players: DomainMember[];
  type: 'singles' | 'doubles';
}

/** Domain Session — active/completed court session. Evidence: normalizeSession.js + SessionSchema */
export interface DomainSession {
  id: string;
  courtNumber: number;
  group: DomainGroup;
  startedAt: string;
  scheduledEndAt: string;
  actualEndAt: string | null;
  endReason: 'completed' | 'cleared_early' | 'admin_override' | null;
  isOvertime: boolean;
  isTournament: boolean;
}

/** Domain Block — court reservation. Evidence: normalizeBlock.js + BlockSchema */
export interface DomainBlock {
  id: string;
  courtNumber: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  blockType?: string;
  isActive: boolean;
  // Legacy aliases — SuccessRoute.jsx accesses these as fallbacks
  startTime?: string;
  endTime?: string;
  title?: string;
}

/** Domain Court — court with current state. Evidence: normalizeCourt.js + CourtSchema */
export interface DomainCourt {
  id: string;
  number: number;
  isOccupied: boolean;
  isBlocked: boolean;
  isOvertime: boolean;
  isAvailable: boolean;
  isTournament: boolean;
  session: DomainSession | null;
  block: DomainBlock | null;
}

/** Domain WaitlistEntry. Evidence: normalizeWaitlistEntry.js + WaitlistEntrySchema */
export interface DomainWaitlistEntry {
  id: string;
  position: number;
  group: DomainGroup;
  joinedAt: string;
  minutesWaiting: number;
  estimatedCourtTime: string | null;
  deferred: boolean;
}

/**
 * Normalized block in Board.blocks (derived from courts). Evidence: normalizeBoard.js:50-58
 * Note: normalizeBoard maps court.block.startsAt → startTime, court.block.endsAt → endTime,
 * court.block.reason → title. But the JSDoc Board type in domain.js declares blocks as Block[]
 * which has startsAt/endsAt. We include both sets for JSDoc compat until domain.js is corrected.
 */
export interface BoardBlock {
  courtNumber: number;
  // Runtime fields from normalizeBoard
  startTime: string;
  endTime: string;
  title: string;
  isActive: boolean;
}

/** Upcoming block in Board.upcomingBlocks. Evidence: normalizeBoard.js:62-72 */
export interface UpcomingBlock {
  id?: string;
  courtNumber: number;
  startTime: string;
  endTime: string;
  title: string;
  reason?: string;
  isActive: boolean;
  // Legacy aliases — SuccessRoute.jsx accesses these as fallbacks
  startsAt?: string;
  endsAt?: string;
}

/** Operating hours entry. Evidence: normalizeBoard.js:75 — passthrough from API */
export interface OperatingHoursEntry {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
}

/**
 * Domain Board — complete normalized state. Evidence: normalizeBoard.js + BoardSchema
 * Note: blocks and upcomingBlocks are optional in JSDoc Board (domain.js:93-96).
 * blocks shape differs between JSDoc (Block[]) and runtime (BoardBlock[]) — see BoardBlock.
 */
export interface DomainBoard {
  serverNow: string;
  courts: DomainCourt[];
  waitlist: DomainWaitlistEntry[];
  blocks?: BoardBlock[];
  upcomingBlocks?: UpcomingBlock[];
  operatingHours?: OperatingHoursEntry[];
}

/** UI player in currentGroup. Evidence: assignCourtOrchestrator.ts:143-159, groupHandlers.js */
export interface GroupPlayer {
  id: string;
  name: string;
  memberNumber: string;
  memberId?: string;
  isGuest?: boolean;
  sponsor?: string;
  accountId?: string;
}

/** Displacement info from overtime takeover. Evidence: assignCourtOrchestrator.ts:431-438 */
export interface DisplacementInfo {
  participants: string[];
  restoreUntil: string;
}

/** Replaced group snapshot. Evidence: assignCourtOrchestrator.ts:431-438, courtChangeOrchestrator.ts:10 */
export interface ReplacedGroup {
  players: Array<{ name: string }>;
  endTime: string;
}

/** Original court data snapshot before change. Evidence: courtChangeOrchestrator.ts:39-45 */
export interface OriginalCourtData {
  players: Array<{ name: string }>;
  startTime: null;
  endTime: string;
  assignedAt: null;
  duration: null;
}

/**
 * Widened type for go-back restore — courts array may contain OriginalCourtData
 * for one render cycle before being replaced with fresh DomainCourt data.
 *
 * Usage: courtPresenter.ts only (go-back restore path).
 * Do not use for normal read paths — those expect DomainCourt[].
 * Deletion condition: remove when go-back restore stores DomainCourt[] directly.
 */
export type CourtDataMutable = Omit<RegistrationUiState['data'], 'courts'> & {
  courts: (DomainCourt | OriginalCourtData)[];
};

/** Court selection result from computeRegistrationCourtSelection. Evidence: overtimeEligibility.js */
export interface CourtSelectionResult {
  showingOvertimeCourts: boolean;
  eligibilityByCourtNumber: Record<number, { eligible: boolean; reason?: string }>;
  selectableCourts: SelectableCourt[];
  getSelectableForGroup: (playerCount: number) => SelectableCourt[];
  getFullTimeForGroup: (playerCount: number) => SelectableCourt[];
  countSelectableForGroup: (playerCount: number) => number;
  countFullTimeForGroup: (playerCount: number) => number;
}

export interface SelectableCourt {
  number: number;
  reason: string;
  minutesAvailable: number | null;
  isUsable: boolean;
}

/** Waitlist entry summary used in derived state. Evidence: useRegistrationDerived.js:32-109 */
export interface WaitlistEntrySummary {
  id: string;
  position: number;
  players: DomainMember[];
}

/** Frequent partner entry. Evidence: useMemberIdentity.js:82-90 */
export interface FrequentPartner {
  player: {
    id: string;
    name: string;
    memberNumber: string;
    memberId: string;
  };
  count: number;
}

/** Autocomplete suggestion from member search. Evidence: useMemberSearch.js:108-118 */
export interface AutocompleteSuggestion {
  memberNumber: string;
  member: {
    id: string;
    name: string;
    accountId: string;
    isPrimary: boolean;
    unclearedStreak: number;
    // Optional enrichment fields — present on API response but not guaranteed
    phone?: string;
    ranking?: number | null;
    winRate?: number;
  };
  displayText: string;
}

/** Member database entry (legacy static data). Evidence: useRegistrationDerived.js:113-176 */
export interface MemberDatabaseEntry {
  familyMembers: Array<{
    id: number;
    name: string;
    phone: string;
    ranking: number;
    winRate: number;
  }>;
  playingHistory: unknown[];
  lastGame: null;
}

/** API member from backend (after normalization). Evidence: normalizeAccountMember in normalizeMember.js */
export interface ApiMember {
  id: string;
  displayName: string;
  accountId: string;
  isPrimary: boolean;
  memberNumber: string;
}

/** Block status result. Evidence: court-blocks.js — getCourtBlockStatus returns this or null */
export interface CourtBlockStatusResult {
  isBlocked: boolean;
  blockId?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
