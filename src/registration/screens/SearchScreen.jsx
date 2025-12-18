/**
 * SearchScreen Component
 *
 * Member search screen with autocomplete.
 * Displays "Court Available" CTAs when waitlist groups can play.
 *
 * Props:
 * - searchInput: string - Current search input
 * - setSearchInput: (value: string) => void - Search input setter
 * - showSuggestions: boolean - Whether to show suggestions dropdown
 * - setShowSuggestions: (show: boolean) => void - Suggestions visibility setter
 * - isSearching: boolean - Whether search is in progress
 * - effectiveSearchInput: string - Debounced search input
 * - getAutocompleteSuggestions: (input: string) => Suggestion[] - Get suggestions
 * - handleSuggestionClick: (suggestion: Suggestion) => void - Handle suggestion click
 * - markUserTyping: () => void - Mark user as typing
 * - setCurrentScreen: (screen: string) => void - Screen navigation
 * - setCurrentGroup: (group: Player[]) => void - Set current group
 * - setMemberNumber: (num: string) => void - Set member number
 * - setHasWaitlistPriority: (has: boolean) => void - Set waitlist priority
 * - findMemberNumber: (id: number) => string - Find member number by ID
 * - canFirstGroupPlay: boolean - Whether first waitlist group can play
 * - canSecondGroupPlay: boolean - Whether second waitlist group can play
 * - firstWaitingGroup: object - First waiting group
 * - secondWaitingGroup: object - Second waiting group
 * - firstWaitingGroupData: object - First waiting group data
 * - secondWaitingGroupData: object - Second waiting group data
 * - data: object - Court data
 * - showAlert: boolean - Whether to show alert
 * - alertMessage: string - Alert message
 * - isMobileView: boolean - Whether in mobile view
 * - CONSTANTS: object - App constants
 */
import React from 'react';
import { ToastHost, AlertDisplay } from '../components';

const SearchScreen = ({
  searchInput,
  setSearchInput,
  showSuggestions,
  setShowSuggestions,
  isSearching,
  effectiveSearchInput,
  getAutocompleteSuggestions,
  handleSuggestionClick,
  markUserTyping,
  setCurrentScreen,
  setCurrentGroup,
  setMemberNumber,
  setHasWaitlistPriority,
  findMemberNumber,
  canFirstGroupPlay,
  canSecondGroupPlay,
  firstWaitingGroup,
  secondWaitingGroup,
  firstWaitingGroupData,
  secondWaitingGroupData,
  data,
  showAlert,
  alertMessage,
  isMobileView,
  CONSTANTS
}) => {
  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex items-center justify-center">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <div className={`bg-white rounded-2xl shadow-2xl ${isMobileView ? 'p-4' : 'p-6 sm:p-12'} w-full max-w-2xl ${isMobileView ? 'reg-modal--mobile' : ''}`}>
        <div className={`${isMobileView ? 'mb-4' : 'mb-6 sm:mb-8'} relative`}>
          <label className={`block ${isMobileView ? 'text-base' : 'text-xl sm:text-2xl'} font-medium ${isMobileView ? 'mb-2' : 'mb-3 sm:mb-4'}`}>
            {isMobileView ? 'Register Group' : 'Enter your name or member number'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                markUserTyping();
                const value = e.target.value || "";
                setSearchInput(value);

                // Check for admin code (immediate, no debounce)
                if (value === CONSTANTS.ADMIN_CODE) {
                  setCurrentScreen("admin");
                  setSearchInput("");
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

          {showSuggestions && getAutocompleteSuggestions(effectiveSearchInput).length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-y-auto" style={{ maxHeight: '400px' }}>
              {getAutocompleteSuggestions(effectiveSearchInput).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full p-3 sm:p-4 text-left hover:bg-green-50 border-b last:border-b-0 transition-colors block"
                >
                  <div className="font-medium text-lg sm:text-xl">{suggestion.member.name}</div>
                  <div className="text-sm sm:text-base text-gray-600">Member #{suggestion.memberNumber}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA #1 — first group */}
        {canFirstGroupPlay && (
          <button
            onClick={() => {
              // Load the waiting group
              setCurrentGroup(firstWaitingGroup.players.map(player => ({
                ...player,
                memberNumber: findMemberNumber(player.id)
              })));

              // Set member number to first player
              const firstPlayerMemberNum = findMemberNumber(firstWaitingGroup.players[0].id);
              setMemberNumber(firstPlayerMemberNum);

              // Set waitlist priority flag
              console.log('[COURT AVAILABLE BUTTON] Setting waitlist priority');
              setHasWaitlistPriority(true);

              // Navigate to court selection
              setCurrentScreen("court");
            }}
            className="pulse-cta cta-primary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-4 animate-pulse"
            aria-live="polite"
          >
            {(() => {
              const g = firstWaitingGroupData;
              const names = Array.isArray(g?.players) ? g.players.map(p => p?.name).filter(Boolean) : [];
              return names.length ? `Court Available: ${names.join(', ')}` : 'Court Available';
            })()}
          </button>
        )}

        {/* CTA #2 — second group (only when >=2 free courts AND a second group exists) */}
        {canSecondGroupPlay && (
          <button
            onClick={() => {
              // Load the second waiting group
              setCurrentGroup(secondWaitingGroup.players.map(player => ({
                ...player,
                memberNumber: findMemberNumber(player.id)
              })));

              // Set member number to first player in second group
              const firstPlayerMemberNum = findMemberNumber(secondWaitingGroup.players[0].id);
              setMemberNumber(firstPlayerMemberNum);

              // Set waitlist priority flag
              console.log('[SECOND GROUP COURT AVAILABLE BUTTON] Setting waitlist priority');
              setHasWaitlistPriority(true);

              // Navigate to court selection
              setCurrentScreen("court");
            }}
            className="pulse-cta cta-secondary w-full bg-green-500 text-white py-4 sm:py-5 px-6 rounded-xl text-xl sm:text-2xl font-semibold hover:bg-green-600 transition-colors mb-4 animate-pulse"
            aria-live="polite"
          >
            {(() => {
              const g = secondWaitingGroupData;
              const names = Array.isArray(g?.players) ? g.players.map(p => p?.name).filter(Boolean) : [];
              return names.length ? `Court Available: ${names.join(', ')}` : 'Court Available';
            })()}
          </button>
        )}

        <button
          onClick={() => setCurrentScreen("welcome")}
          className="w-full bg-gray-200 text-gray-700 py-3 sm:py-4 px-6 rounded-xl text-lg sm:text-xl hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default SearchScreen;
