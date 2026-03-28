/**
 * buildRegistrationReturn
 * Extracted from useRegistrationAppState
 * Refactored to accept grouped objects
 *
 * Assembles the return object for useRegistrationAppState.
 * Accepts grouped module objects instead of 150+ individual params.
 * Return shape is unchanged — matches AppState interface.
 */

import type {
  AppState,
  SessionSlice,
  AdminSlice,
  RegistrationConstants,
  RegistrationUiState,
  RegistrationSetters,
  RegistrationRefs,
  DerivedState,
  HelperFunctions,
  AlertState,
  AdminPriceFeedback,
  GuestCounterHook,
  SearchState,
  MobileState,
  BlockAdminState,
  WaitlistAdminState,
  TimeoutState,
  TennisConfig,
  ApiConfig,
  TennisBusinessLogicShape,
  TennisBackendShape,
  DataStoreShape,
  CourtBlockStatusResult,
} from '../../../types/appTypes.js';

/**
 * Fields from useRegistrationUiState — shell-owned state values + setters only.
 * Workflow fields (15 useState) have moved to WorkflowProvider.
 */
type UiModule = Pick<RegistrationUiState,
  'data' | 'currentScreen' | 'availableCourts' | 'operatingHours' |
  'showSuccess' | 'currentTime' | 'courtToMove' | 'ballPriceInput' | 'ballPriceCents'
> & Pick<RegistrationSetters,
  'setData' | 'setCurrentScreen' | 'setAvailableCourts' | 'setOperatingHours' |
  'setShowSuccess' | 'setLastActivity' | 'setCurrentTime' | 'setCourtToMove' |
  'setBallPriceInput' | 'setBallPriceCents' | 'setIsUserTyping'
>;

/**
 * Fields from useRegistrationDomainHooks — shell-owned hooks only (8 hooks).
 * Workflow hooks (GroupGuest, Streak, CourtAssignment, MemberIdentity) moved to WorkflowProvider.
 */
type DomainModule =
  & Omit<AlertState, never>
  & Omit<AdminPriceFeedback, never>
  & Omit<GuestCounterHook, never>
  & Omit<SearchState, never>
  & Omit<MobileState, never>
  & Omit<BlockAdminState, 'getCourtBlockStatus'>
  & Omit<WaitlistAdminState, never>;

/** Fields from useRegistrationRuntime — React refs */
type RuntimeModule = RegistrationRefs;

/** Fields from useRegistrationDataLayer */
interface DataLayerModule {
  loadData: HelperFunctions['loadData'];
}

/** Fields from useRegistrationHelpers + local helpers */
type HelpersModule = HelperFunctions;

/** Fields from useRegistrationDerived */
type DerivedModule = DerivedState;

/** Fields from useSessionTimeout */
type TimeoutModule = TimeoutState;

export interface BuildRegistrationReturnParams {
  // Module objects — typed to match each source hook's return shape
  ui: UiModule;
  domain: DomainModule;
  runtime: RuntimeModule;
  _dataLayer: DataLayerModule;
  helpers: HelpersModule;
  derived: DerivedModule;
  timeout: TimeoutModule;

  // Services
  backend: TennisBackendShape;
  dataStore: DataStoreShape | null;

  // Constants and config
  CONSTANTS: RegistrationConstants;
  TENNIS_CONFIG: TennisConfig;
  API_CONFIG: ApiConfig;
  TennisBusinessLogic: TennisBusinessLogicShape;
  dbg: AppState['dbg'];
  DEBUG: boolean;

  // Standalone functions
  getCourtBlockStatus: (courtNumber: number) => CourtBlockStatusResult | null;
  computeRegistrationCourtSelection: AppState['computeRegistrationCourtSelection'];

  // Orchestrators
  assignCourtToGroupOrchestrated: AppState['assignCourtToGroupOrchestrated'];
  sendGroupToWaitlistOrchestrated: AppState['sendGroupToWaitlistOrchestrated'];
  handleSuggestionClickOrchestrated: AppState['handleSuggestionClickOrchestrated'];
  handleAddPlayerSuggestionClickOrchestrated: AppState['handleAddPlayerSuggestionClickOrchestrated'];
  changeCourtOrchestrated: AppState['changeCourtOrchestrated'];
  resetFormOrchestrated: AppState['resetFormOrchestrated'];

  // Validation
  validateGroupCompat: AppState['validateGroupCompat'];
}

export function buildRegistrationReturn({
  // Module objects
  ui,
  domain,
  runtime,
  _dataLayer,
  helpers,
  derived,
  timeout,

  // Services
  backend,
  dataStore,

  // Constants and config
  CONSTANTS,
  TENNIS_CONFIG,
  API_CONFIG,
  TennisBusinessLogic,
  dbg,
  DEBUG,

  // Standalone functions
  getCourtBlockStatus,
  computeRegistrationCourtSelection,

  // Orchestrators
  assignCourtToGroupOrchestrated,
  sendGroupToWaitlistOrchestrated,
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
  changeCourtOrchestrated,
  resetFormOrchestrated,

  // Validation
  validateGroupCompat,
}: BuildRegistrationReturnParams): AppState {
  return {
    // Core state — shell-owned fields only.
    // Workflow fields (14) removed — now consumed exclusively via WorkflowContext.
    state: {
      data: ui.data,
      currentScreen: ui.currentScreen,
      availableCourts: ui.availableCourts,
      operatingHours: ui.operatingHours,
      showSuccess: ui.showSuccess,
      currentTime: ui.currentTime,
      courtToMove: ui.courtToMove,
      ballPriceInput: ui.ballPriceInput,
      ballPriceCents: ui.ballPriceCents,
    },

    // Setters — shell-owned only.
    // Workflow setters (15) removed — now consumed exclusively via WorkflowContext.
    setters: {
      setData: ui.setData,
      setCurrentScreen: ui.setCurrentScreen,
      setAvailableCourts: ui.setAvailableCourts,
      setOperatingHours: ui.setOperatingHours,
      setShowSuccess: ui.setShowSuccess,
      setLastActivity: ui.setLastActivity,
      setCurrentTime: ui.setCurrentTime,
      setCourtToMove: ui.setCourtToMove,
      setBallPriceInput: ui.setBallPriceInput,
      setBallPriceCents: ui.setBallPriceCents,
      setIsUserTyping: ui.setIsUserTyping,
    },

    // Refs
    refs: {
      successResetTimerRef: runtime.successResetTimerRef,
      typingTimeoutRef: runtime.typingTimeoutRef,
    },

    // Derived/computed values
    derived: {
      isMobileView: derived.isMobileView,
      canFirstGroupPlay: derived.canFirstGroupPlay,
      canSecondGroupPlay: derived.canSecondGroupPlay,
      firstWaitlistEntry: derived.firstWaitlistEntry,
      secondWaitlistEntry: derived.secondWaitlistEntry,
      firstWaitlistEntryData: derived.firstWaitlistEntryData,
      secondWaitlistEntryData: derived.secondWaitlistEntryData,
      canPassThroughGroupPlay: derived.canPassThroughGroupPlay,
      passThroughEntry: derived.passThroughEntry,
      passThroughEntryData: derived.passThroughEntryData,
      memberDatabase: derived.memberDatabase,
    },

    // Helper functions
    helpers: {
      markUserTyping: helpers.markUserTyping,
      getCourtData: helpers.getCourtData,
      clearSuccessResetTimer: helpers.clearSuccessResetTimer,
      loadData: helpers.loadData,
      applyInactivityTimeoutExitSequence: helpers.applyInactivityTimeoutExitSequence,
      getCourtsOccupiedForClearing: helpers.getCourtsOccupiedForClearing,
      guardAddPlayerEarly: helpers.guardAddPlayerEarly,
      guardAgainstGroupDuplicate: helpers.guardAgainstGroupDuplicate,
    },

    // Services
    services: {
      backend,
      dataStore,
    },

    // From useAlertDisplay
    alert: {
      showAlert: domain.showAlert,
      alertMessage: domain.alertMessage,
      setShowAlert: domain.setShowAlert,
      setAlertMessage: domain.setAlertMessage,
      showAlertMessage: domain.showAlertMessage,
    },

    // From useMemberSearch
    search: {
      searchInput: domain.searchInput,
      setSearchInput: domain.setSearchInput,
      showSuggestions: domain.showSuggestions,
      setShowSuggestions: domain.setShowSuggestions,
      isSearching: domain.isSearching,
      effectiveSearchInput: domain.effectiveSearchInput,
      addPlayerSearch: domain.addPlayerSearch,
      setAddPlayerSearch: domain.setAddPlayerSearch,
      showAddPlayerSuggestions: domain.showAddPlayerSuggestions,
      setShowAddPlayerSuggestions: domain.setShowAddPlayerSuggestions,
      effectiveAddPlayerSearch: domain.effectiveAddPlayerSearch,
      setApiMembers: domain.setApiMembers,
      getAutocompleteSuggestions: domain.getAutocompleteSuggestions,
      handleGroupSearchChange: domain.handleGroupSearchChange,
      handleGroupSearchFocus: domain.handleGroupSearchFocus,
      handleAddPlayerSearchChange: domain.handleAddPlayerSearchChange,
      handleAddPlayerSearchFocus: domain.handleAddPlayerSearchFocus,
    },

    // From useMobileFlowController
    mobile: {
      mobileFlow: domain.mobileFlow,
      preselectedCourt: domain.preselectedCourt,
      mobileMode: domain.mobileMode,
      mobileCountdown: domain.mobileCountdown,
      checkingLocation: domain.checkingLocation,
      locationToken: domain.locationToken,
      showQRScanner: domain.showQRScanner,
      gpsFailedPrompt: domain.gpsFailedPrompt,
      setMobileFlow: domain.setMobileFlow,
      setPreselectedCourt: domain.setPreselectedCourt,
      setMobileMode: domain.setMobileMode,
      setCheckingLocation: domain.setCheckingLocation,
      setLocationToken: domain.setLocationToken,
      setShowQRScanner: domain.setShowQRScanner,
      setGpsFailedPrompt: domain.setGpsFailedPrompt,
      getMobileGeolocation: domain.getMobileGeolocation,
      requestMobileReset: domain.requestMobileReset,
      onQRScanToken: domain.onQRScanToken,
      onQRScannerClose: domain.onQRScannerClose,
      openQRScanner: domain.openQRScanner,
      dismissGpsPrompt: domain.dismissGpsPrompt,
    },

    // Session slice — shell-owned timeout + guestCounter only.
    // Workflow slices (players, court, streak) removed — now consumed
    // exclusively via WorkflowContext in routes/presenters/handlers.
    session: {
      timeout: {
        showTimeoutWarning: timeout.showTimeoutWarning,
      },
      guestCounterHook: {
        guestCounter: domain.guestCounter,
        incrementGuestCounter: domain.incrementGuestCounter,
      },
    } satisfies SessionSlice,

    // Grouped admin slice — backward-compatible alias.
    // Shares the same object references as the top-level keys above.
    admin: {
      adminPriceFeedback: {
        showPriceSuccess: domain.showPriceSuccess,
        priceError: domain.priceError,
        setPriceError: domain.setPriceError,
        setShowPriceSuccess: domain.setShowPriceSuccess,
        showPriceSuccessWithClear: domain.showPriceSuccessWithClear,
      },
      waitlistAdmin: {
        waitlistMoveFrom: domain.waitlistMoveFrom,
        setWaitlistMoveFrom: domain.setWaitlistMoveFrom,
        onReorderWaitlist: domain.onReorderWaitlist,
      },
      blockAdmin: {
        showBlockModal: domain.showBlockModal,
        setShowBlockModal: domain.setShowBlockModal,
        selectedCourtsToBlock: domain.selectedCourtsToBlock,
        setSelectedCourtsToBlock: domain.setSelectedCourtsToBlock,
        blockStartTime: domain.blockStartTime,
        setBlockStartTime: domain.setBlockStartTime,
        blockEndTime: domain.blockEndTime,
        setBlockEndTime: domain.setBlockEndTime,
        blockMessage: domain.blockMessage,
        setBlockMessage: domain.setBlockMessage,
        blockWarningMinutes: domain.blockWarningMinutes,
        setBlockWarningMinutes: domain.setBlockWarningMinutes,
        blockingInProgress: domain.blockingInProgress,
        setBlockingInProgress: domain.setBlockingInProgress,
        getCourtBlockStatus,
        onBlockCreate: domain.onBlockCreate,
        onCancelBlock: domain.onCancelBlock,
      },
    } satisfies AdminSlice,

    // Constants and config
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    TennisBusinessLogic,
    dbg,
    DEBUG,

    // Overtime eligibility helper
    computeRegistrationCourtSelection,

    // Orchestrators
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,

    // Validation
    validateGroupCompat,

    // Workflow reset — placeholder, overwritten by App.jsx with actual key bump function
    resetWorkflow: () => {
      throw new Error('resetWorkflow not wired — AppInner must set app.resetWorkflow');
    },
  };
}
