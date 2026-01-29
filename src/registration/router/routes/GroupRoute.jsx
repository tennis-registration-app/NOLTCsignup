import React from 'react';
import { GroupScreen } from '../../screens';

/**
 * GroupRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Added app/handlers grouping — WP6.0.2a
 * Verbatim JSX. No behavior change.
 */
export function GroupRoute(props) {
  // Bridge mode: prefer app/handlers, fallback to props for compatibility
  const app = props.app ?? props;
  const handlers = props.handlers ?? props;

  // Destructure from app (state/config)
  const {
    // Data
    data = app.state?.data,
    currentGroup = app.groupGuest?.currentGroup,
    memberNumber = app.memberIdentity?.memberNumber,
    availableCourts = app.derived?.availableCourts,
    frequentPartners = app.state?.frequentPartners,
    frequentPartnersLoading = app.state?.frequentPartnersLoading,
    // UI state
    showAlert = app.alert?.showAlert,
    alertMessage = app.alert?.alertMessage,
    showTimeoutWarning = app.sessionTimeout?.showTimeoutWarning,
    isMobileView = app.derived?.isMobileView,
    // Mobile flow
    mobileFlow = app.mobile?.mobileFlow,
    preselectedCourt = app.mobile?.preselectedCourt,
    // Search state
    searchInput = app.groupSearch?.searchInput,
    showSuggestions = app.groupSearch?.showSuggestions,
    effectiveSearchInput = app.groupSearch?.effectiveSearchInput,
    // Add player state
    showAddPlayer = app.addPlayer?.showAddPlayer,
    addPlayerSearch = app.addPlayer?.addPlayerSearch,
    showAddPlayerSuggestions = app.addPlayer?.showAddPlayerSuggestions,
    effectiveAddPlayerSearch = app.addPlayer?.effectiveAddPlayerSearch,
    // Guest form state
    showGuestForm = app.groupGuest?.showGuestForm,
    guestName = app.groupGuest?.guestName,
    guestSponsor = app.groupGuest?.guestSponsor,
    showGuestNameError = app.groupGuest?.showGuestNameError,
    showSponsorError = app.groupGuest?.showSponsorError,
    // Streak modal
    showStreakModal = app.streakModal?.showStreakModal,
    registrantStreak = app.state?.registrantStreak,
    streakAcknowledged = app.streakModal?.streakAcknowledged,
    setStreakAcknowledged = app.streakModal?.setStreakAcknowledged,
    // Utilities
    CONSTANTS = app.CONSTANTS,
  } = props;

  // Destructure from handlers
  const {
    // Callbacks
    handleGroupSearchChange = handlers.handleGroupSearchChange,
    handleGroupSearchFocus = handlers.handleGroupSearchFocus,
    handleGroupSuggestionClick = handlers.handleGroupSuggestionClick,
    handleAddPlayerSearchChange = handlers.handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus = handlers.handleAddPlayerSearchFocus,
    handleAddPlayerSuggestionClick = handlers.handleAddPlayerSuggestionClick,
    handleToggleAddPlayer = handlers.handleToggleAddPlayer,
    handleToggleGuestForm = handlers.handleToggleGuestForm,
    handleRemovePlayer = handlers.handleRemovePlayer,
    handleSelectSponsor = handlers.handleSelectSponsor,
    handleGuestNameChange = handlers.handleGuestNameChange,
    handleAddGuest = handlers.handleAddGuest,
    handleCancelGuest = handlers.handleCancelGuest,
    addFrequentPartner = handlers.addFrequentPartner,
    handleGroupSelectCourt = handlers.handleGroupSelectCourt,
    isAssigning = handlers.isAssigning,
    handleGroupJoinWaitlist = handlers.handleGroupJoinWaitlist,
    isJoiningWaitlist = handlers.isJoiningWaitlist,
    handleGroupGoBack = handlers.handleGroupGoBack,
    resetForm = handlers.resetForm,
    // Utilities
    getAutocompleteSuggestions = app.search?.getAutocompleteSuggestions,
    isPlayerAlreadyPlaying = handlers.isPlayerAlreadyPlaying,
    sameGroup = handlers.sameGroup,
    handleStreakAcknowledge = handlers.handleStreakAcknowledge,
  } = props;

  return (
    <>
      <GroupScreen
        // Data
        data={data}
        currentGroup={currentGroup}
        memberNumber={memberNumber}
        availableCourts={availableCourts}
        frequentPartners={frequentPartners}
        frequentPartnersLoading={frequentPartnersLoading}
        // UI state
        showAlert={showAlert}
        alertMessage={alertMessage}
        showTimeoutWarning={showTimeoutWarning}
        isMobileView={isMobileView}
        // Mobile flow
        mobileFlow={mobileFlow}
        preselectedCourt={preselectedCourt}
        // Search state
        searchInput={searchInput}
        showSuggestions={showSuggestions}
        effectiveSearchInput={effectiveSearchInput}
        // Add player state
        showAddPlayer={showAddPlayer}
        addPlayerSearch={addPlayerSearch}
        showAddPlayerSuggestions={showAddPlayerSuggestions}
        effectiveAddPlayerSearch={effectiveAddPlayerSearch}
        // Guest form state
        showGuestForm={showGuestForm}
        guestName={guestName}
        guestSponsor={guestSponsor}
        showGuestNameError={showGuestNameError}
        showSponsorError={showSponsorError}
        // Callbacks
        onSearchChange={handleGroupSearchChange}
        onSearchFocus={handleGroupSearchFocus}
        onSuggestionClick={handleGroupSuggestionClick}
        onAddPlayerSearchChange={handleAddPlayerSearchChange}
        onAddPlayerSearchFocus={handleAddPlayerSearchFocus}
        onAddPlayerSuggestionClick={handleAddPlayerSuggestionClick}
        onToggleAddPlayer={handleToggleAddPlayer}
        onToggleGuestForm={handleToggleGuestForm}
        onRemovePlayer={handleRemovePlayer}
        onSelectSponsor={handleSelectSponsor}
        onGuestNameChange={handleGuestNameChange}
        onAddGuest={handleAddGuest}
        onCancelGuest={handleCancelGuest}
        onAddFrequentPartner={addFrequentPartner}
        onSelectCourt={handleGroupSelectCourt}
        isAssigning={isAssigning}
        onJoinWaitlist={handleGroupJoinWaitlist}
        joiningWaitlist={isJoiningWaitlist}
        onGoBack={handleGroupGoBack}
        onStartOver={resetForm}
        // Utilities
        getAutocompleteSuggestions={getAutocompleteSuggestions}
        isPlayerAlreadyPlaying={isPlayerAlreadyPlaying}
        sameGroup={sameGroup}
        CONSTANTS={CONSTANTS}
      />

      {/* Uncleared Session Streak Modal (streak >= 3) */}
      {showStreakModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Clear Court Reminder</h3>
              <p className="text-gray-600">
                Your last {registrantStreak} sessions were ended without using &apos;Clear
                Court&apos;. Please tap Clear Court when you finish so others can get on faster.
              </p>
            </div>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={streakAcknowledged}
                onChange={(e) => setStreakAcknowledged(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-gray-700 font-medium">Got it</span>
            </label>

            <button
              onClick={handleStreakAcknowledge}
              disabled={!streakAcknowledged}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
                streakAcknowledged
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Return to Select Your Court
            </button>
          </div>
        </div>
      )}
    </>
  );
}
