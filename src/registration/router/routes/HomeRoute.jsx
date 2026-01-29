import React from 'react';
import { HomeScreen } from '../../screens';

/**
 * HomeRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Added app/handlers grouping — WP6.0.2a
 * Verbatim JSX. No behavior change.
 */
export function HomeRoute(props) {
  // Bridge mode: prefer app/handlers, fallback to props for compatibility
  const app = props.app ?? props;
  const handlers = props.handlers ?? props;

  // Destructure from app (state/config)
  const {
    // Search functionality (from app.search or props)
    searchInput = app.search?.searchInput,
    setSearchInput = app.search?.setSearchInput,
    showSuggestions = app.search?.showSuggestions,
    setShowSuggestions = app.search?.setShowSuggestions,
    isSearching = app.search?.isSearching,
    effectiveSearchInput = app.search?.effectiveSearchInput,
    getAutocompleteSuggestions = app.search?.getAutocompleteSuggestions,
    // Navigation (from app.setters or props)
    setCurrentScreen = app.setters?.setCurrentScreen,
    setMemberNumber = app.memberIdentity?.setMemberNumber,
    setHasWaitlistPriority = app.setters?.setHasWaitlistPriority,
    setCurrentWaitlistEntryId = app.setters?.setCurrentWaitlistEntryId,
    // CTA state (from app.derived or props)
    canFirstGroupPlay = app.derived?.canFirstGroupPlay,
    canSecondGroupPlay = app.derived?.canSecondGroupPlay,
    firstWaitlistEntry = app.derived?.firstWaitlistEntry,
    secondWaitlistEntry = app.derived?.secondWaitlistEntry,
    firstWaitlistEntryData = app.derived?.firstWaitlistEntryData,
    secondWaitlistEntryData = app.derived?.secondWaitlistEntryData,
    // UI state (from app or props)
    showAlert = app.alert?.showAlert,
    alertMessage = app.alert?.alertMessage,
    isMobileView = app.derived?.isMobileView,
    CONSTANTS = app.CONSTANTS,
    // Mobile (from app.mobile or props)
    checkingLocation = app.mobile?.checkingLocation,
    TENNIS_CONFIG = app.TENNIS_CONFIG,
  } = props;

  // Destructure from handlers
  const {
    handleSuggestionClick = handlers.handleSuggestionClick,
    markUserTyping = handlers.markUserTyping,
    setCurrentGroup = handlers.setCurrentGroup ?? app.groupGuest?.setCurrentGroup,
    findMemberNumber = handlers.findMemberNumber,
    checkLocationAndProceed = handlers.checkLocationAndProceed,
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
