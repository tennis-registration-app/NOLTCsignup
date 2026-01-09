/**
 * HomeScreen Component
 *
 * Combined landing + search screen for tennis court registration.
 * Merges WelcomeScreen and SearchScreen into a single unified view.
 *
 * Features:
 * - Member search with autocomplete
 * - Waitlist CTA buttons when courts are available
 * - Clear court button
 *
 * Props: See SearchScreen for search-related props
 * Additional: onClearCourtClick for Clear button
 */
import React from 'react';
import { ToastHost, AlertDisplay } from '../components';

const HomeScreen = ({
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
  // Clear court
  onClearCourtClick,
}) => {
  return (
    <div
      className="w-full h-full min-h-screen bg-cover bg-center bg-no-repeat p-4 sm:p-8 flex flex-col items-center"
      style={{ backgroundImage: 'url(/NOLTCsignup/background.png)' }}
    >
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />

      {/* Header */}
      <p className="text-lg sm:text-xl text-gray-600 mt-4 sm:mt-6 mb-6 sm:mb-8">
        Tennis Court Registration
      </p>

      {/* Search card - compact, search only */}
      <div
        className={`bg-white rounded-2xl shadow-2xl ${isMobileView ? 'p-4' : 'py-4 px-0 sm:py-5 sm:px-0'} w-full max-w-lg ${isMobileView ? 'reg-modal--mobile' : ''} relative`}
        style={{ marginTop: isMobileView ? '0' : '12vh' }}
      >
        {/* Search input section */}
        <div className="relative w-[90%] mx-auto">
          <label
            className={`block text-center ${isMobileView ? 'text-base' : 'text-lg sm:text-xl'} font-medium ${isMobileView ? 'mb-2' : 'mb-2 sm:mb-3'}`}
          >
            {isMobileView ? 'Register Group' : 'Please register when all players are ready'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                markUserTyping();
                const value = e.target.value || '';
                setSearchInput(value);

                // Check for admin code (immediate, no debounce)
                if (value === CONSTANTS.ADMIN_CODE) {
                  setCurrentScreen('admin');
                  setSearchInput('');
                  return;
                }

                setShowSuggestions(value.length > 0);
              }}
              onFocus={() => {
                markUserTyping();
                setShowSuggestions(searchInput.length > 0);
              }}
              placeholder="Enter your member number or name"
              className="w-full p-3 sm:p-4 text-lg sm:text-xl border-2 rounded-xl focus:border-green-500 focus:outline-none"
              id="main-search-input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck="false"
            />

            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-green-500 rounded-full"></div>
              </div>
            )}
          </div>

          {/* Autocomplete dropdown - positioned relative to card */}
          {showSuggestions && getAutocompleteSuggestions(effectiveSearchInput).length > 0 && (
            <div
              className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-y-auto"
              style={{ maxHeight: '400px' }}
            >
              {getAutocompleteSuggestions(effectiveSearchInput).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full p-3 sm:p-4 text-left hover:bg-green-50 border-b last:border-b-0 transition-colors block"
                >
                  <div className="font-medium text-lg sm:text-xl">{suggestion.member.name}</div>
                  <div className="text-sm sm:text-base text-gray-600">
                    Member #{suggestion.memberNumber}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA area - outside card */}
      <div className="w-full max-w-2xl mt-4 sm:mt-6 min-h-[140px]">
        {/* CTA #1 — first group */}
        {canFirstGroupPlay && (
          <button
            onClick={() => {
              // Guard: ensure waitlist entry has players
              if (!firstWaitlistEntry?.players?.length) {
                console.warn('[CTA] No waitlist entry or players available');
                return;
              }

              // Load the waiting group (use memberId, not id)
              const mappedPlayers = firstWaitlistEntry.players.map((player) => ({
                ...player,
                memberNumber: findMemberNumber(player.memberId),
              }));
              setCurrentGroup(mappedPlayers);

              // Set member number to first player
              const firstPlayerMemberNum = findMemberNumber(firstWaitlistEntry.players[0].memberId);
              setMemberNumber(firstPlayerMemberNum);

              // Set waitlist priority flag and store entry ID for assignFromWaitlist
              setHasWaitlistPriority(true);
              if (setCurrentWaitlistEntryId && firstWaitlistEntry?.id) {
                setCurrentWaitlistEntryId(firstWaitlistEntry.id);
              }

              // Navigate to court selection
              setCurrentScreen('court');
            }}
            className="pulse-cta cta-primary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-3 animate-pulse"
            aria-live="polite"
          >
            {(() => {
              const g = firstWaitlistEntryData;
              const names = Array.isArray(g?.players)
                ? g.players.map((p) => p?.displayName || p?.name).filter(Boolean)
                : [];
              return names.length ? `Court Available: ${names.join(', ')}` : 'Court Available';
            })()}
          </button>
        )}

        {/* CTA #2 — second group (only when >=2 free courts AND a second group exists) */}
        {canSecondGroupPlay && (
          <button
            onClick={() => {
              // Guard: ensure waitlist entry has players
              if (!secondWaitlistEntry?.players?.length) {
                console.warn('[CTA] No second waitlist entry or players available');
                return;
              }

              // Load the second waiting group (use memberId, not id)
              setCurrentGroup(
                secondWaitlistEntry.players.map((player) => ({
                  ...player,
                  memberNumber: findMemberNumber(player.memberId),
                }))
              );

              // Set member number to first player in second group
              const firstPlayerMemberNum = findMemberNumber(
                secondWaitlistEntry.players[0].memberId
              );
              setMemberNumber(firstPlayerMemberNum);

              // Set waitlist priority flag and store entry ID for assignFromWaitlist
              setHasWaitlistPriority(true);
              if (setCurrentWaitlistEntryId && secondWaitlistEntry?.id) {
                setCurrentWaitlistEntryId(secondWaitlistEntry.id);
              }

              // Navigate to court selection
              setCurrentScreen('court');
            }}
            className="pulse-cta cta-secondary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-3 animate-pulse"
            aria-live="polite"
          >
            {(() => {
              const g = secondWaitlistEntryData;
              const names = Array.isArray(g?.players)
                ? g.players.map((p) => p?.displayName || p?.name).filter(Boolean)
                : [];
              return names.length ? `Court Available: ${names.join(', ')}` : 'Court Available';
            })()}
          </button>
        )}
      </div>

      {/* Clear court button - outside card */}
      <button
        onClick={onClearCourtClick}
        className="mt-20 sm:mt-24 mb-8 sm:mb-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xl sm:text-2xl font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 button-transition transform hover:scale-105"
      >
        Clear a court
      </button>
    </div>
  );
};

export default HomeScreen;
