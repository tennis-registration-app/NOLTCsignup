import React from 'react';
import { HomeScreen } from '../../screens';

/**
 * HomeRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Verbatim JSX. No behavior change.
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function HomeRoute({ app, handlers }) {
  // Destructure from app
  const {
    search,
    setters,
    memberIdentity,
    derived,
    alert,
    mobile,
    groupGuest,
    CONSTANTS,
    TENNIS_CONFIG,
  } = app;
  const {
    searchInput,
    setSearchInput,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    effectiveSearchInput,
    getAutocompleteSuggestions,
  } = search;
  const { setCurrentScreen, setHasWaitlistPriority, setCurrentWaitlistEntryId } = setters;
  const { setMemberNumber } = memberIdentity;
  const {
    canFirstGroupPlay,
    canSecondGroupPlay,
    firstWaitlistEntry,
    secondWaitlistEntry,
    firstWaitlistEntryData,
    secondWaitlistEntryData,
    isMobileView,
  } = derived;
  const { showAlert, alertMessage } = alert;
  const { checkingLocation } = mobile;
  const { setCurrentGroup } = groupGuest;

  // Destructure from handlers
  const { handleSuggestionClick, markUserTyping, findMemberNumber, checkLocationAndProceed } =
    handlers;

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
