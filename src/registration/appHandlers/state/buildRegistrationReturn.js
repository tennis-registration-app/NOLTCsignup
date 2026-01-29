/**
 * buildRegistrationReturn
 * Extracted from useRegistrationAppState — WP5.9.6.6a
 *
 * Assembles the return object for useRegistrationAppState.
 * Verbatim extraction — same shape, no renames.
 */
export function buildRegistrationReturn({
  // UI State values
  data,
  currentScreen,
  availableCourts,
  waitlistPosition,
  operatingHours,
  showSuccess,
  replacedGroup,
  displacement,
  originalCourtData,
  canChangeCourt,
  changeTimeRemaining,
  isTimeLimited,
  timeLimitReason,
  showAddPlayer,
  isChangingCourt,
  currentTime,
  courtToMove,
  hasWaitlistPriority,
  currentWaitlistEntryId,
  isAssigning,
  isJoiningWaitlist,
  ballPriceInput,
  ballPriceCents,

  // UI State setters
  setData,
  setCurrentScreen,
  setAvailableCourts,
  setWaitlistPosition,
  setOperatingHours,
  setShowSuccess,
  setReplacedGroup,
  setDisplacement,
  setOriginalCourtData,
  setCanChangeCourt,
  setChangeTimeRemaining,
  setIsTimeLimited,
  setTimeLimitReason,
  setShowAddPlayer,
  setIsChangingCourt,
  setWasOvertimeCourt,
  setLastActivity,
  setCurrentTime,
  setCourtToMove,
  setHasWaitlistPriority,
  setCurrentWaitlistEntryId,
  setIsAssigning,
  setIsJoiningWaitlist,
  setBallPriceInput,
  setBallPriceCents,
  setIsUserTyping,

  // Runtime refs
  successResetTimerRef,
  typingTimeoutRef,

  // Derived values
  isMobileView,
  canFirstGroupPlay,
  canSecondGroupPlay,
  firstWaitlistEntry,
  secondWaitlistEntry,
  firstWaitlistEntryData,
  secondWaitlistEntryData,
  memberDatabase,

  // Helper functions
  markUserTyping,
  getCourtData,
  clearSuccessResetTimer,
  getDataService,
  loadData,
  applyInactivityTimeoutExitSequence,
  getCourtsOccupiedForClearing,
  guardAddPlayerEarly,
  guardAgainstGroupDuplicate,

  // Services
  backend,
  dataStore,

  // Alert display
  showAlert,
  alertMessage,
  setShowAlert,
  setAlertMessage,
  showAlertMessage,

  // Admin price feedback
  showPriceSuccess,
  priceError,
  setPriceError,
  setShowPriceSuccess,
  showPriceSuccessWithClear,

  // Guest counter
  guestCounter,
  incrementGuestCounter,

  // Session timeout
  showTimeoutWarning,

  // Member search
  searchInput,
  setSearchInput,
  showSuggestions,
  setShowSuggestions,
  isSearching,
  effectiveSearchInput,
  addPlayerSearch,
  setAddPlayerSearch,
  showAddPlayerSuggestions,
  setShowAddPlayerSuggestions,
  effectiveAddPlayerSearch,
  setApiMembers,
  getAutocompleteSuggestions,
  handleGroupSearchChange,
  handleGroupSearchFocus,
  handleAddPlayerSearchChange,
  handleAddPlayerSearchFocus,

  // Court assignment result
  justAssignedCourt,
  setJustAssignedCourt,
  assignedSessionId,
  setAssignedSessionId,
  hasAssignedCourt,
  setHasAssignedCourt,

  // Clear court flow
  selectedCourtToClear,
  setSelectedCourtToClear,
  clearCourtStep,
  setClearCourtStep,
  decrementClearCourtStep,

  // Mobile flow controller
  mobileFlow,
  preselectedCourt,
  mobileMode,
  mobileCountdown,
  checkingLocation,
  locationToken,
  showQRScanner,
  gpsFailedPrompt,
  setMobileFlow,
  setPreselectedCourt,
  setMobileMode,
  setCheckingLocation,
  setLocationToken,
  setShowQRScanner,
  setGpsFailedPrompt,
  getMobileGeolocation,
  requestMobileReset,
  onQRScanToken,
  onQRScannerClose,
  openQRScanner,
  dismissGpsPrompt,

  // Block admin
  showBlockModal,
  setShowBlockModal,
  selectedCourtsToBlock,
  setSelectedCourtsToBlock,
  blockStartTime,
  setBlockStartTime,
  blockEndTime,
  setBlockEndTime,
  blockMessage,
  setBlockMessage,
  blockWarningMinutes,
  setBlockWarningMinutes,
  blockingInProgress,
  setBlockingInProgress,
  getCourtBlockStatus,
  onBlockCreate,
  onCancelBlock,

  // Waitlist admin
  waitlistMoveFrom,
  setWaitlistMoveFrom,
  onReorderWaitlist,

  // Group/Guest
  currentGroup,
  setCurrentGroup,
  guestName,
  setGuestName,
  guestSponsor,
  setGuestSponsor,
  showGuestForm,
  setShowGuestForm,
  showGuestNameError,
  setShowGuestNameError,
  showSponsorError,
  setShowSponsorError,
  handleRemovePlayer,
  handleSelectSponsor,
  handleCancelGuest,

  // Streak
  registrantStreak,
  setRegistrantStreak,
  showStreakModal,
  setShowStreakModal,
  streakAcknowledged,
  setStreakAcknowledged,

  // Member identity
  memberNumber,
  setMemberNumber,
  currentMemberId,
  setCurrentMemberId,
  frequentPartners,
  frequentPartnersLoading,
  fetchFrequentPartners,
  clearCache,

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
}) {
  return {
    // Core state
    state: {
      data,
      currentScreen,
      availableCourts,
      waitlistPosition,
      operatingHours,
      showSuccess,
      replacedGroup,
      displacement,
      originalCourtData,
      canChangeCourt,
      changeTimeRemaining,
      isTimeLimited,
      timeLimitReason,
      showAddPlayer,
      isChangingCourt,
      currentTime,
      courtToMove,
      hasWaitlistPriority,
      currentWaitlistEntryId,
      isAssigning,
      isJoiningWaitlist,
      ballPriceInput,
      ballPriceCents,
    },

    // Setters
    setters: {
      setData,
      setCurrentScreen,
      setAvailableCourts,
      setWaitlistPosition,
      setOperatingHours,
      setShowSuccess,
      setReplacedGroup,
      setDisplacement,
      setOriginalCourtData,
      setCanChangeCourt,
      setChangeTimeRemaining,
      setIsTimeLimited,
      setTimeLimitReason,
      setShowAddPlayer,
      setIsChangingCourt,
      setWasOvertimeCourt,
      setLastActivity,
      setCurrentTime,
      setCourtToMove,
      setHasWaitlistPriority,
      setCurrentWaitlistEntryId,
      setIsAssigning,
      setIsJoiningWaitlist,
      setBallPriceInput,
      setBallPriceCents,
      setIsUserTyping,
    },

    // Refs
    refs: {
      successResetTimerRef,
      typingTimeoutRef,
    },

    // Derived/computed values
    derived: {
      isMobileView,
      canFirstGroupPlay,
      canSecondGroupPlay,
      firstWaitlistEntry,
      secondWaitlistEntry,
      firstWaitlistEntryData,
      secondWaitlistEntryData,
      memberDatabase,
    },

    // Helper functions
    helpers: {
      markUserTyping,
      getCourtData,
      clearSuccessResetTimer,
      getDataService,
      loadData,
      applyInactivityTimeoutExitSequence,
      getCourtsOccupiedForClearing,
      guardAddPlayerEarly,
      guardAgainstGroupDuplicate,
    },

    // Services
    services: {
      backend,
      dataStore,
    },

    // From useAlertDisplay
    alert: {
      showAlert,
      alertMessage,
      setShowAlert,
      setAlertMessage,
      showAlertMessage,
    },

    // From useAdminPriceFeedback
    adminPriceFeedback: {
      showPriceSuccess,
      priceError,
      setPriceError,
      setShowPriceSuccess,
      showPriceSuccessWithClear,
    },

    // From useGuestCounter
    guestCounterHook: {
      guestCounter,
      incrementGuestCounter,
    },

    // From useSessionTimeout
    timeout: {
      showTimeoutWarning,
    },

    // From useMemberSearch
    search: {
      searchInput,
      setSearchInput,
      showSuggestions,
      setShowSuggestions,
      isSearching,
      effectiveSearchInput,
      addPlayerSearch,
      setAddPlayerSearch,
      showAddPlayerSuggestions,
      setShowAddPlayerSuggestions,
      effectiveAddPlayerSearch,
      setApiMembers,
      getAutocompleteSuggestions,
      handleGroupSearchChange,
      handleGroupSearchFocus,
      handleAddPlayerSearchChange,
      handleAddPlayerSearchFocus,
    },

    // From useCourtAssignmentResult
    courtAssignment: {
      justAssignedCourt,
      setJustAssignedCourt,
      assignedSessionId,
      setAssignedSessionId,
      hasAssignedCourt,
      setHasAssignedCourt,
    },

    // From useClearCourtFlow
    clearCourtFlow: {
      selectedCourtToClear,
      setSelectedCourtToClear,
      clearCourtStep,
      setClearCourtStep,
      decrementClearCourtStep,
    },

    // From useMobileFlowController
    mobile: {
      mobileFlow,
      preselectedCourt,
      mobileMode,
      mobileCountdown,
      checkingLocation,
      locationToken,
      showQRScanner,
      gpsFailedPrompt,
      setMobileFlow,
      setPreselectedCourt,
      setMobileMode,
      setCheckingLocation,
      setLocationToken,
      setShowQRScanner,
      setGpsFailedPrompt,
      getMobileGeolocation,
      requestMobileReset,
      onQRScanToken,
      onQRScannerClose,
      openQRScanner,
      dismissGpsPrompt,
    },

    // From useBlockAdmin
    blockAdmin: {
      showBlockModal,
      setShowBlockModal,
      selectedCourtsToBlock,
      setSelectedCourtsToBlock,
      blockStartTime,
      setBlockStartTime,
      blockEndTime,
      setBlockEndTime,
      blockMessage,
      setBlockMessage,
      blockWarningMinutes,
      setBlockWarningMinutes,
      blockingInProgress,
      setBlockingInProgress,
      getCourtBlockStatus,
      onBlockCreate,
      onCancelBlock,
    },

    // From useWaitlistAdmin
    waitlistAdmin: {
      waitlistMoveFrom,
      setWaitlistMoveFrom,
      onReorderWaitlist,
    },

    // From useGroupGuest
    groupGuest: {
      currentGroup,
      setCurrentGroup,
      guestName,
      setGuestName,
      guestSponsor,
      setGuestSponsor,
      showGuestForm,
      setShowGuestForm,
      showGuestNameError,
      setShowGuestNameError,
      showSponsorError,
      setShowSponsorError,
      handleRemovePlayer,
      handleSelectSponsor,
      handleCancelGuest,
    },

    // From useStreak
    streak: {
      registrantStreak,
      setRegistrantStreak,
      showStreakModal,
      setShowStreakModal,
      streakAcknowledged,
      setStreakAcknowledged,
    },

    // From useMemberIdentity
    memberIdentity: {
      memberNumber,
      setMemberNumber,
      currentMemberId,
      setCurrentMemberId,
      frequentPartners,
      frequentPartnersLoading,
      fetchFrequentPartners,
      clearCache,
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
