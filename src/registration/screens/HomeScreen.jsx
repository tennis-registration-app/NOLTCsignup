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
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex flex-col items-center">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />

      {/* Header */}
      <p className="text-lg sm:text-xl text-gray-600 mt-8 sm:mt-12 mb-6 sm:mb-8">
        Tennis Court Registration
      </p>

      {/* Main card - positioned with top margin for ~1/3 from top feel */}
      <div
        className={`bg-white rounded-2xl shadow-2xl ${isMobileView ? 'p-4' : 'p-6 sm:p-12'} w-full max-w-2xl ${isMobileView ? 'reg-modal--mobile' : ''}`}
      >
        {/* Search input section */}
        <div className={`${isMobileView ? 'mb-4' : 'mb-6 sm:mb-8'} relative`}>
          <label
            className={`block ${isMobileView ? 'text-base' : 'text-xl sm:text-2xl'} font-medium ${isMobileView ? 'mb-2' : 'mb-3 sm:mb-4'}`}
          >
            {isMobileView ? 'Register Group' : 'Enter your name or member number'}
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
              placeholder="Start typing..."
              className="w-full p-4 sm:p-5 text-xl sm:text-2xl border-2 rounded-xl focus:border-green-500 focus:outline-none"
              id="main-search-input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck="false"
            />

            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-green-500 rounded-full"></div>
              </div>
            )}
          </div>

          {/* Autocomplete dropdown */}
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

        {/* CTA area with min-height for 2 CTAs (each ~80px with padding) */}
        <div className="min-h-[200px]">
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
                const firstPlayerMemberNum = findMemberNumber(
                  firstWaitlistEntry.players[0].memberId
                );
                setMemberNumber(firstPlayerMemberNum);

                // Set waitlist priority flag and store entry ID for assignFromWaitlist
                setHasWaitlistPriority(true);
                if (setCurrentWaitlistEntryId && firstWaitlistEntry?.id) {
                  setCurrentWaitlistEntryId(firstWaitlistEntry.id);
                }

                // Navigate to court selection
                setCurrentScreen('court');
              }}
              className="pulse-cta cta-primary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-4 animate-pulse"
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
              className="pulse-cta cta-secondary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-4 animate-pulse"
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
      </div>

      {/* Clear court button - outside card, scaled down 20% */}
      <button
        onClick={onClearCourtClick}
        className="mt-8 sm:mt-12 bg-gradient-to-r from-blue-300 to-blue-400 text-white text-lg sm:text-xl font-bold py-3 sm:py-5 px-6 sm:px-10 rounded-xl shadow-lg hover:from-blue-400 hover:to-blue-500 button-transition transform hover:scale-105"
      >
        Clear a court
      </button>
    </div>
  );
};

export default HomeScreen;
