/**
 * buildRegistrationReturn
 * Extracted from useRegistrationAppState — WP5.9.6.6a
 * Refactored to accept grouped objects — WP5.9.6.6a2
 *
 * Assembles the return object for useRegistrationAppState.
 * Accepts grouped module objects instead of 150+ individual params.
 * Return shape is unchanged.
 *
 * @returns {import('../../../../types/appTypes').AppState}
 */
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
}) {
  return {
    // Core state
    state: {
      data: ui.data,
      currentScreen: ui.currentScreen,
      availableCourts: ui.availableCourts,
      waitlistPosition: ui.waitlistPosition,
      operatingHours: ui.operatingHours,
      showSuccess: ui.showSuccess,
      replacedGroup: ui.replacedGroup,
      displacement: ui.displacement,
      originalCourtData: ui.originalCourtData,
      canChangeCourt: ui.canChangeCourt,
      changeTimeRemaining: ui.changeTimeRemaining,
      isTimeLimited: ui.isTimeLimited,
      timeLimitReason: ui.timeLimitReason,
      showAddPlayer: ui.showAddPlayer,
      isChangingCourt: ui.isChangingCourt,
      currentTime: ui.currentTime,
      courtToMove: ui.courtToMove,
      hasWaitlistPriority: ui.hasWaitlistPriority,
      currentWaitlistEntryId: ui.currentWaitlistEntryId,
      isAssigning: ui.isAssigning,
      isJoiningWaitlist: ui.isJoiningWaitlist,
      ballPriceInput: ui.ballPriceInput,
      ballPriceCents: ui.ballPriceCents,
    },

    // Setters
    setters: {
      setData: ui.setData,
      setCurrentScreen: ui.setCurrentScreen,
      setAvailableCourts: ui.setAvailableCourts,
      setWaitlistPosition: ui.setWaitlistPosition,
      setOperatingHours: ui.setOperatingHours,
      setShowSuccess: ui.setShowSuccess,
      setReplacedGroup: ui.setReplacedGroup,
      setDisplacement: ui.setDisplacement,
      setOriginalCourtData: ui.setOriginalCourtData,
      setCanChangeCourt: ui.setCanChangeCourt,
      setChangeTimeRemaining: ui.setChangeTimeRemaining,
      setIsTimeLimited: ui.setIsTimeLimited,
      setTimeLimitReason: ui.setTimeLimitReason,
      setShowAddPlayer: ui.setShowAddPlayer,
      setIsChangingCourt: ui.setIsChangingCourt,
      setWasOvertimeCourt: ui.setWasOvertimeCourt,
      setLastActivity: ui.setLastActivity,
      setCurrentTime: ui.setCurrentTime,
      setCourtToMove: ui.setCourtToMove,
      setHasWaitlistPriority: ui.setHasWaitlistPriority,
      setCurrentWaitlistEntryId: ui.setCurrentWaitlistEntryId,
      setIsAssigning: ui.setIsAssigning,
      setIsJoiningWaitlist: ui.setIsJoiningWaitlist,
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
      memberDatabase: derived.memberDatabase,
    },

    // Helper functions
    helpers: {
      markUserTyping: helpers.markUserTyping,
      getCourtData: helpers.getCourtData,
      clearSuccessResetTimer: helpers.clearSuccessResetTimer,
      getDataService: helpers.getDataService,
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

    // From useAdminPriceFeedback
    adminPriceFeedback: {
      showPriceSuccess: domain.showPriceSuccess,
      priceError: domain.priceError,
      setPriceError: domain.setPriceError,
      setShowPriceSuccess: domain.setShowPriceSuccess,
      showPriceSuccessWithClear: domain.showPriceSuccessWithClear,
    },

    // From useGuestCounter
    guestCounterHook: {
      guestCounter: domain.guestCounter,
      incrementGuestCounter: domain.incrementGuestCounter,
    },

    // From useSessionTimeout
    timeout: {
      showTimeoutWarning: timeout.showTimeoutWarning,
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

    // From useCourtAssignmentResult
    courtAssignment: {
      justAssignedCourt: domain.justAssignedCourt,
      setJustAssignedCourt: domain.setJustAssignedCourt,
      assignedSessionId: domain.assignedSessionId,
      setAssignedSessionId: domain.setAssignedSessionId,
      assignedEndTime: domain.assignedEndTime,
      setAssignedEndTime: domain.setAssignedEndTime,
      hasAssignedCourt: domain.hasAssignedCourt,
      setHasAssignedCourt: domain.setHasAssignedCourt,
    },

    // From useClearCourtFlow
    clearCourtFlow: {
      selectedCourtToClear: domain.selectedCourtToClear,
      setSelectedCourtToClear: domain.setSelectedCourtToClear,
      clearCourtStep: domain.clearCourtStep,
      setClearCourtStep: domain.setClearCourtStep,
      decrementClearCourtStep: domain.decrementClearCourtStep,
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

    // From useBlockAdmin
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

    // From useWaitlistAdmin
    waitlistAdmin: {
      waitlistMoveFrom: domain.waitlistMoveFrom,
      setWaitlistMoveFrom: domain.setWaitlistMoveFrom,
      onReorderWaitlist: domain.onReorderWaitlist,
    },

    // From useGroupGuest
    groupGuest: {
      currentGroup: domain.currentGroup,
      setCurrentGroup: domain.setCurrentGroup,
      guestName: domain.guestName,
      setGuestName: domain.setGuestName,
      guestSponsor: domain.guestSponsor,
      setGuestSponsor: domain.setGuestSponsor,
      showGuestForm: domain.showGuestForm,
      setShowGuestForm: domain.setShowGuestForm,
      showGuestNameError: domain.showGuestNameError,
      setShowGuestNameError: domain.setShowGuestNameError,
      showSponsorError: domain.showSponsorError,
      setShowSponsorError: domain.setShowSponsorError,
      handleRemovePlayer: domain.handleRemovePlayer,
      handleSelectSponsor: domain.handleSelectSponsor,
      handleCancelGuest: domain.handleCancelGuest,
    },

    // From useStreak
    streak: {
      registrantStreak: domain.registrantStreak,
      setRegistrantStreak: domain.setRegistrantStreak,
      showStreakModal: domain.showStreakModal,
      setShowStreakModal: domain.setShowStreakModal,
      streakAcknowledged: domain.streakAcknowledged,
      setStreakAcknowledged: domain.setStreakAcknowledged,
    },

    // From useMemberIdentity
    memberIdentity: {
      memberNumber: domain.memberNumber,
      setMemberNumber: domain.setMemberNumber,
      currentMemberId: domain.currentMemberId,
      setCurrentMemberId: domain.setCurrentMemberId,
      frequentPartners: domain.frequentPartners,
      frequentPartnersLoading: domain.frequentPartnersLoading,
      fetchFrequentPartners: domain.fetchFrequentPartners,
      clearCache: domain.clearCache,
    },

    // Constants and config
    CONSTANTS,
    TENNIS_CONFIG,
    API_CONFIG,
    TennisBusinessLogic,
    dbg,
    DEBUG,

    // Overtime eligibility helper
    computeRegistrationCourtSelection,

    // Orchestrators (WP5.5)
    assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated,
    resetFormOrchestrated,

    // Validation
    validateGroupCompat,
  };
}
