import React from 'react';
import { GroupScreen } from '../../screens';

/**
 * GroupRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Verbatim JSX. No behavior change.
 */
export function GroupRoute(props) {
  const {
    // Data
    data,
    currentGroup,
    memberNumber,
    availableCourts,
    frequentPartners,
    frequentPartnersLoading,
    // UI state
    showAlert,
    alertMessage,
    showTimeoutWarning,
    isMobileView,
    // Mobile flow
    mobileFlow,
    preselectedCourt,
    // Search state
    searchInput,
    showSuggestions,
    effectiveSearchInput,
    // Add player state
    showAddPlayer,
    addPlayerSearch,
    showAddPlayerSuggestions,
    effectiveAddPlayerSearch,
    // Guest form state
    showGuestForm,
    guestName,
    guestSponsor,
    showGuestNameError,
    showSponsorError,
    // Callbacks
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleGroupSuggestionClick,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
    handleAddPlayerSuggestionClick,
    handleToggleAddPlayer,
    handleToggleGuestForm,
    handleRemovePlayer,
    handleSelectSponsor,
    handleGuestNameChange,
    handleAddGuest,
    handleCancelGuest,
    addFrequentPartner,
    handleGroupSelectCourt,
    isAssigning,
    handleGroupJoinWaitlist,
    isJoiningWaitlist,
    handleGroupGoBack,
    resetForm,
    // Utilities
    getAutocompleteSuggestions,
    isPlayerAlreadyPlaying,
    sameGroup,
    CONSTANTS,
    // Streak modal
    showStreakModal,
    registrantStreak,
    streakAcknowledged,
    setStreakAcknowledged,
    handleStreakAcknowledge,
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
