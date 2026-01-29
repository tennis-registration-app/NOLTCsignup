// Registration App - Vite-bundled React
// Converted from inline Babel to ES module JSX
// WP5.9.4.2: Streamlined to use useRegistrationAppState and useRegistrationHandlers
/* global Tennis */
import React from 'react';

// Import registration-specific services
import { GeolocationService } from './services';

// Registration router (WP5.9.1)
import { RegistrationRouter } from './router';

// Registration state and handlers hooks (WP5.9.3, WP5.9.4)
import { useRegistrationHandlers, useRegistrationAppState } from './appHandlers';

// Global service aliases for backward compatibility with other scripts
window.Tennis = window.Tennis || {};
window.GeolocationService = window.GeolocationService || GeolocationService;

// Main TennisRegistration Component
const TennisRegistration = ({ isMobileView = window.IS_MOBILE_VIEW }) => {
  // Get all state, effects, hooks, and derived values
  const app = useRegistrationAppState({ isMobileView });

  // Get all handlers, passing everything they need
  const handlers = useRegistrationHandlers({
    // Services
    backend: app.services.backend,
    dataStore: app.services.dataStore,

    // Orchestrators (from orchestration layer - accessed via app)
    assignCourtToGroupOrchestrated: app.assignCourtToGroupOrchestrated,
    sendGroupToWaitlistOrchestrated: app.sendGroupToWaitlistOrchestrated,
    handleSuggestionClickOrchestrated: app.handleSuggestionClickOrchestrated,
    handleAddPlayerSuggestionClickOrchestrated: app.handleAddPlayerSuggestionClickOrchestrated,
    changeCourtOrchestrated: app.changeCourtOrchestrated,
    resetFormOrchestrated: app.resetFormOrchestrated,

    // Alert
    showAlertMessage: app.alert.showAlertMessage,
    setShowAlert: app.alert.setShowAlert,
    setAlertMessage: app.alert.setAlertMessage,

    // Mobile
    getMobileGeolocation: app.mobile.getMobileGeolocation,
    setCheckingLocation: app.mobile.setCheckingLocation,
    setGpsFailedPrompt: app.mobile.setGpsFailedPrompt,
    mobileFlow: app.mobile.mobileFlow,
    preselectedCourt: app.mobile.preselectedCourt,
    requestMobileReset: app.mobile.requestMobileReset,

    // Navigation
    setCurrentScreen: app.setters.setCurrentScreen,
    currentScreen: app.state.currentScreen,

    // Data
    data: app.state.data,
    operatingHours: app.state.operatingHours,

    // Success/assignment state
    setShowSuccess: app.setters.setShowSuccess,
    justAssignedCourt: app.courtAssignment.justAssignedCourt,
    setJustAssignedCourt: app.courtAssignment.setJustAssignedCourt,
    setAssignedSessionId: app.courtAssignment.setAssignedSessionId,
    hasAssignedCourt: app.courtAssignment.hasAssignedCourt,
    setHasAssignedCourt: app.courtAssignment.setHasAssignedCourt,
    replacedGroup: app.state.replacedGroup,
    setReplacedGroup: app.setters.setReplacedGroup,
    setDisplacement: app.setters.setDisplacement,
    setOriginalCourtData: app.setters.setOriginalCourtData,
    canChangeCourt: app.state.canChangeCourt,
    setCanChangeCourt: app.setters.setCanChangeCourt,
    setChangeTimeRemaining: app.setters.setChangeTimeRemaining,
    setIsTimeLimited: app.setters.setIsTimeLimited,
    setTimeLimitReason: app.setters.setTimeLimitReason,
    isChangingCourt: app.state.isChangingCourt,
    setIsChangingCourt: app.setters.setIsChangingCourt,
    setWasOvertimeCourt: app.setters.setWasOvertimeCourt,

    // Group state
    currentGroup: app.groupGuest.currentGroup,
    setCurrentGroup: app.groupGuest.setCurrentGroup,
    currentMemberId: app.memberIdentity.currentMemberId,
    setCurrentMemberId: app.memberIdentity.setCurrentMemberId,
    memberNumber: app.memberIdentity.memberNumber,
    setMemberNumber: app.memberIdentity.setMemberNumber,

    // Search state
    setSearchInput: app.search.setSearchInput,
    setShowSuggestions: app.search.setShowSuggestions,
    setAddPlayerSearch: app.search.setAddPlayerSearch,
    setShowAddPlayerSuggestions: app.search.setShowAddPlayerSuggestions,

    // Guest state
    guestName: app.groupGuest.guestName,
    setGuestName: app.groupGuest.setGuestName,
    guestSponsor: app.groupGuest.guestSponsor,
    setGuestSponsor: app.groupGuest.setGuestSponsor,
    showGuestForm: app.groupGuest.showGuestForm,
    setShowGuestForm: app.groupGuest.setShowGuestForm,
    setShowGuestNameError: app.groupGuest.setShowGuestNameError,
    setShowSponsorError: app.groupGuest.setShowSponsorError,
    guestCounter: app.guestCounterHook.guestCounter,
    incrementGuestCounter: app.guestCounterHook.incrementGuestCounter,

    // Add player state
    showAddPlayer: app.state.showAddPlayer,
    setShowAddPlayer: app.setters.setShowAddPlayer,

    // Waitlist state
    setHasWaitlistPriority: app.setters.setHasWaitlistPriority,
    currentWaitlistEntryId: app.state.currentWaitlistEntryId,
    setCurrentWaitlistEntryId: app.setters.setCurrentWaitlistEntryId,
    setWaitlistPosition: app.setters.setWaitlistPosition,

    // Streak state
    registrantStreak: app.streak.registrantStreak,
    setRegistrantStreak: app.streak.setRegistrantStreak,
    setShowStreakModal: app.streak.setShowStreakModal,
    streakAcknowledged: app.streak.streakAcknowledged,
    setStreakAcknowledged: app.streak.setStreakAcknowledged,

    // Clear court state
    clearCourtStep: app.clearCourtFlow.clearCourtStep,
    setSelectedCourtToClear: app.clearCourtFlow.setSelectedCourtToClear,
    setClearCourtStep: app.clearCourtFlow.setClearCourtStep,
    decrementClearCourtStep: app.clearCourtFlow.decrementClearCourtStep,

    // Admin state
    isAssigning: app.state.isAssigning,
    setIsAssigning: app.setters.setIsAssigning,
    isJoiningWaitlist: app.state.isJoiningWaitlist,
    setIsJoiningWaitlist: app.setters.setIsJoiningWaitlist,
    ballPriceInput: app.state.ballPriceInput,
    setPriceError: app.adminPriceFeedback.setPriceError,
    setCourtToMove: app.setters.setCourtToMove,

    // Refs
    successResetTimerRef: app.refs.successResetTimerRef,
    typingTimeoutRef: app.refs.typingTimeoutRef,

    // Helpers from other hooks
    fetchFrequentPartners: app.memberIdentity.fetchFrequentPartners,
    clearCache: app.memberIdentity.clearCache,
    getCourtBlockStatus: app.blockAdmin.getCourtBlockStatus,

    // Constants
    CONSTANTS: app.CONSTANTS,
    TENNIS_CONFIG: app.TENNIS_CONFIG,
    API_CONFIG: app.API_CONFIG,

    // Utility functions
    memberDatabase: app.derived.memberDatabase,
    showPriceSuccessWithClear: app.adminPriceFeedback.showPriceSuccessWithClear,
    dbg: app.dbg,

    // Guard functions
    guardAddPlayerEarly: app.helpers.guardAddPlayerEarly,
    guardAgainstGroupDuplicate: app.helpers.guardAgainstGroupDuplicate,

    // Validation function
    validateGroupCompat: app.validateGroupCompat,

    // Functions defined in useRegistrationAppState
    markUserTyping: app.helpers.markUserTyping,
    getCourtData: app.helpers.getCourtData,
  });

  // Render the router with all props
  return (
    <RegistrationRouter
      // Grouped props for bridge mode (WP6.0.2a)
      app={app}
      handlers={handlers}
      // Core navigation
      currentScreen={app.state.currentScreen}
      setCurrentScreen={app.setters.setCurrentScreen}
      // Alert state
      showAlert={app.alert.showAlert}
      alertMessage={app.alert.alertMessage}
      showAlertMessage={app.alert.showAlertMessage}
      // Mobile state
      mobileFlow={app.mobile.mobileFlow}
      mobileMode={app.mobile.mobileMode}
      preselectedCourt={app.mobile.preselectedCourt}
      mobileCountdown={app.mobile.mobileCountdown}
      checkingLocation={app.mobile.checkingLocation}
      showQRScanner={app.mobile.showQRScanner}
      gpsFailedPrompt={app.mobile.gpsFailedPrompt}
      onQRScanToken={app.mobile.onQRScanToken}
      onQRScannerClose={app.mobile.onQRScannerClose}
      openQRScanner={app.mobile.openQRScanner}
      dismissGpsPrompt={app.mobile.dismissGpsPrompt}
      // Search state
      searchInput={app.search.searchInput}
      setSearchInput={app.search.setSearchInput}
      showSuggestions={app.search.showSuggestions}
      setShowSuggestions={app.search.setShowSuggestions}
      isSearching={app.search.isSearching}
      effectiveSearchInput={app.search.effectiveSearchInput}
      getAutocompleteSuggestions={app.search.getAutocompleteSuggestions}
      addPlayerSearch={app.search.addPlayerSearch}
      showAddPlayerSuggestions={app.search.showAddPlayerSuggestions}
      effectiveAddPlayerSearch={app.search.effectiveAddPlayerSearch}
      handleGroupSearchChange={app.search.handleGroupSearchChange}
      handleGroupSearchFocus={app.search.handleGroupSearchFocus}
      handleAddPlayerSearchChange={app.search.handleAddPlayerSearchChange}
      handleAddPlayerSearchFocus={app.search.handleAddPlayerSearchFocus}
      // Member identity
      memberNumber={app.memberIdentity.memberNumber}
      setMemberNumber={app.memberIdentity.setMemberNumber}
      currentMemberId={app.memberIdentity.currentMemberId}
      frequentPartners={app.memberIdentity.frequentPartners}
      frequentPartnersLoading={app.memberIdentity.frequentPartnersLoading}
      // Group/guest state
      currentGroup={app.groupGuest.currentGroup}
      setCurrentGroup={app.groupGuest.setCurrentGroup}
      guestName={app.groupGuest.guestName}
      guestSponsor={app.groupGuest.guestSponsor}
      showGuestForm={app.groupGuest.showGuestForm}
      showGuestNameError={app.groupGuest.showGuestNameError}
      showSponsorError={app.groupGuest.showSponsorError}
      handleRemovePlayer={app.groupGuest.handleRemovePlayer}
      handleSelectSponsor={app.groupGuest.handleSelectSponsor}
      handleCancelGuest={app.groupGuest.handleCancelGuest}
      // Streak state
      registrantStreak={app.streak.registrantStreak}
      showStreakModal={app.streak.showStreakModal}
      streakAcknowledged={app.streak.streakAcknowledged}
      setStreakAcknowledged={app.streak.setStreakAcknowledged}
      // Court assignment
      justAssignedCourt={app.courtAssignment.justAssignedCourt}
      assignedSessionId={app.courtAssignment.assignedSessionId}
      hasAssignedCourt={app.courtAssignment.hasAssignedCourt}
      // Clear court
      selectedCourtToClear={app.clearCourtFlow.selectedCourtToClear}
      setSelectedCourtToClear={app.clearCourtFlow.setSelectedCourtToClear}
      clearCourtStep={app.clearCourtFlow.clearCourtStep}
      setClearCourtStep={app.clearCourtFlow.setClearCourtStep}
      // Block admin
      showBlockModal={app.blockAdmin.showBlockModal}
      setShowBlockModal={app.blockAdmin.setShowBlockModal}
      selectedCourtsToBlock={app.blockAdmin.selectedCourtsToBlock}
      setSelectedCourtsToBlock={app.blockAdmin.setSelectedCourtsToBlock}
      blockStartTime={app.blockAdmin.blockStartTime}
      setBlockStartTime={app.blockAdmin.setBlockStartTime}
      blockEndTime={app.blockAdmin.blockEndTime}
      setBlockEndTime={app.blockAdmin.setBlockEndTime}
      blockMessage={app.blockAdmin.blockMessage}
      setBlockMessage={app.blockAdmin.setBlockMessage}
      blockWarningMinutes={app.blockAdmin.blockWarningMinutes}
      blockingInProgress={app.blockAdmin.blockingInProgress}
      setBlockingInProgress={app.blockAdmin.setBlockingInProgress}
      getCourtBlockStatus={app.blockAdmin.getCourtBlockStatus}
      onBlockCreate={app.blockAdmin.onBlockCreate}
      onCancelBlock={app.blockAdmin.onCancelBlock}
      // Waitlist admin
      waitlistMoveFrom={app.waitlistAdmin.waitlistMoveFrom}
      setWaitlistMoveFrom={app.waitlistAdmin.setWaitlistMoveFrom}
      onReorderWaitlist={app.waitlistAdmin.onReorderWaitlist}
      // Session timeout
      showTimeoutWarning={app.timeout.showTimeoutWarning}
      // Admin price feedback
      showPriceSuccess={app.adminPriceFeedback.showPriceSuccess}
      setShowPriceSuccess={app.adminPriceFeedback.setShowPriceSuccess}
      priceError={app.adminPriceFeedback.priceError}
      setPriceError={app.adminPriceFeedback.setPriceError}
      ballPriceInput={app.state.ballPriceInput}
      setBallPriceInput={app.setters.setBallPriceInput}
      // CTA state (computed values)
      canFirstGroupPlay={app.derived.canFirstGroupPlay}
      canSecondGroupPlay={app.derived.canSecondGroupPlay}
      firstWaitlistEntry={app.derived.firstWaitlistEntry}
      secondWaitlistEntry={app.derived.secondWaitlistEntry}
      firstWaitlistEntryData={app.derived.firstWaitlistEntryData}
      secondWaitlistEntryData={app.derived.secondWaitlistEntryData}
      // Remaining state
      data={app.state.data}
      availableCourts={app.state.availableCourts}
      waitlistPosition={app.state.waitlistPosition}
      showSuccess={app.state.showSuccess}
      setShowSuccess={app.setters.setShowSuccess}
      replacedGroup={app.state.replacedGroup}
      displacement={app.state.displacement}
      setDisplacement={app.setters.setDisplacement}
      originalCourtData={app.state.originalCourtData}
      setOriginalCourtData={app.setters.setOriginalCourtData}
      canChangeCourt={app.state.canChangeCourt}
      changeTimeRemaining={app.state.changeTimeRemaining}
      isTimeLimited={app.state.isTimeLimited}
      timeLimitReason={app.state.timeLimitReason}
      showAddPlayer={app.state.showAddPlayer}
      isChangingCourt={app.state.isChangingCourt}
      setIsChangingCourt={app.setters.setIsChangingCourt}
      setWasOvertimeCourt={app.setters.setWasOvertimeCourt}
      currentTime={app.state.currentTime}
      courtToMove={app.state.courtToMove}
      setCourtToMove={app.setters.setCourtToMove}
      hasWaitlistPriority={app.state.hasWaitlistPriority}
      setHasWaitlistPriority={app.setters.setHasWaitlistPriority}
      currentWaitlistEntryId={app.state.currentWaitlistEntryId}
      setCurrentWaitlistEntryId={app.setters.setCurrentWaitlistEntryId}
      isAssigning={app.state.isAssigning}
      isJoiningWaitlist={app.state.isJoiningWaitlist}
      ballPriceCents={app.state.ballPriceCents}
      successResetTimerRef={app.refs.successResetTimerRef}
      // Computed values
      isMobileView={app.derived.isMobileView}
      // Handlers (from useRegistrationHandlers - WP5.9.3)
      handleSuggestionClick={handlers.handleSuggestionClick}
      handleGroupSuggestionClick={handlers.handleGroupSuggestionClick}
      handleAddPlayerSuggestionClick={handlers.handleAddPlayerSuggestionClick}
      markUserTyping={handlers.markUserTyping}
      findMemberNumber={handlers.findMemberNumber}
      addFrequentPartner={handlers.addFrequentPartner}
      isPlayerAlreadyPlaying={handlers.isPlayerAlreadyPlaying}
      handleToggleAddPlayer={handlers.handleToggleAddPlayer}
      handleToggleGuestForm={handlers.handleToggleGuestForm}
      handleGuestNameChange={handlers.handleGuestNameChange}
      handleAddGuest={handlers.handleAddGuest}
      handleGroupSelectCourt={handlers.handleGroupSelectCourt}
      handleStreakAcknowledge={handlers.handleStreakAcknowledge}
      handleGroupJoinWaitlist={handlers.handleGroupJoinWaitlist}
      handleGroupGoBack={handlers.handleGroupGoBack}
      assignCourtToGroup={handlers.assignCourtToGroup}
      changeCourt={handlers.changeCourt}
      clearCourt={handlers.clearCourt}
      sendGroupToWaitlist={handlers.sendGroupToWaitlist}
      resetForm={handlers.resetForm}
      clearSuccessResetTimer={handlers.clearSuccessResetTimer}
      handleClearAllCourts={handlers.handleClearAllCourts}
      handleAdminClearCourt={handlers.handleAdminClearCourt}
      handleMoveCourt={handlers.handleMoveCourt}
      handleClearWaitlist={handlers.handleClearWaitlist}
      handleRemoveFromWaitlist={handlers.handleRemoveFromWaitlist}
      handlePriceUpdate={handlers.handlePriceUpdate}
      handleExitAdmin={handlers.handleExitAdmin}
      checkLocationAndProceed={handlers.checkLocationAndProceed}
      getCourtData={handlers.getCourtData}
      saveCourtData={handlers.saveCourtData}
      getCourtsOccupiedForClearing={app.helpers.getCourtsOccupiedForClearing}
      computeRegistrationCourtSelection={app.computeRegistrationCourtSelection}
      sameGroup={handlers.sameGroup}
      // External dependencies
      backend={app.services.backend}
      CONSTANTS={app.CONSTANTS}
      TENNIS_CONFIG={app.TENNIS_CONFIG}
    />
  );
};

export default TennisRegistration;
