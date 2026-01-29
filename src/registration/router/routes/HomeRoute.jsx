import React from 'react';
import { HomeScreen } from '../../screens';

/**
 * HomeRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Verbatim JSX. No behavior change.
 */
export function HomeRoute(props) {
  const {
    // Search functionality
    searchInput,
    setSearchInput,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    effectiveSearchInput,
    getAutocompleteSuggestions,
    handleSuggestionClick,
    markUserTyping,
    // Navigation
    setCurrentScreen,
    setCurrentGroup,
    setMemberNumber,
    setHasWaitlistPriority,
    setCurrentWaitlistEntryId,
    findMemberNumber,
    // CTA state
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntry,
    secondWaitlistEntry,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    // UI state
    showAlert,
    alertMessage,
    isMobileView,
    CONSTANTS,
    // Mobile
    checkingLocation,
    checkLocationAndProceed,
    TENNIS_CONFIG,
  } = props;

  return (
    <>
      {checkingLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <p className="text-lg">{TENNIS_CONFIG.GEOLOCATION.CHECKING_MESSAGE}</p>
          </div>
        </div>
      )}
      <HomeScreen
        // Search functionality
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        isSearching={isSearching}
        effectiveSearchInput={effectiveSearchInput}
        getAutocompleteSuggestions={getAutocompleteSuggestions}
        handleSuggestionClick={handleSuggestionClick}
        markUserTyping={markUserTyping}
        // Navigation
        setCurrentScreen={setCurrentScreen}
        setCurrentGroup={setCurrentGroup}
        setMemberNumber={setMemberNumber}
        setHasWaitlistPriority={setHasWaitlistPriority}
        setCurrentWaitlistEntryId={setCurrentWaitlistEntryId}
        findMemberNumber={findMemberNumber}
        // CTA state
        canFirstGroupPlay={canFirstGroupPlay}
        canSecondGroupPlay={canSecondGroupPlay}
        firstWaitlistEntry={firstWaitlistEntry}
        secondWaitlistEntry={secondWaitlistEntry}
        firstWaitlistEntryData={firstWaitlistEntryData}
        secondWaitlistEntryData={secondWaitlistEntryData}
        // UI state
        showAlert={showAlert}
        alertMessage={alertMessage}
        isMobileView={isMobileView}
        CONSTANTS={CONSTANTS}
        // Clear court
        onClearCourtClick={() => {
          checkLocationAndProceed(() => setCurrentScreen('clearCourt', 'homeClearCourtClick'));
        }}
      />
    </>
  );
}
