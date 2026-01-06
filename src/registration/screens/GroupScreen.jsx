import React from 'react';
import { ToastHost, AlertDisplay } from '../components';

const GroupScreen = ({
  // Data
  data,
  currentGroup,
  memberNumber,
  availableCourts,
  frequentPartners,

  // UI state
  showAlert,
  alertMessage,
  showTimeoutWarning,
  isMobileView,

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
  onSearchChange,
  onSearchFocus,
  onSuggestionClick,
  onAddPlayerSearchChange,
  onAddPlayerSearchFocus,
  onAddPlayerSuggestionClick,
  onToggleAddPlayer,
  onToggleGuestForm,
  onRemovePlayer,
  onSelectSponsor,
  onGuestNameChange,
  onAddGuest,
  onCancelGuest,
  onAddFrequentPartner,
  onSelectCourt,
  onJoinWaitlist,
  onGoBack,
  onStartOver,

  // Utilities
  getAutocompleteSuggestions,
  isPlayerAlreadyPlaying,
  sameGroup,
  CONSTANTS,
}) => {
  return (
    <div
      className={`w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex ${window.__mobileFlow ? 'items-start pt-[15vh]' : 'items-center justify-center'}`}
    >
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      {showTimeoutWarning && (
        <div className="fixed top-4 sm:top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white p-3 sm:p-4 rounded-xl shadow-lg z-50 text-base sm:text-lg animate-pulse">
          Session will expire in 30 seconds due to inactivity
        </div>
      )}
      <div
        className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-5xl h-full ${window.__mobileFlow ? 'max-h-[70vh]' : 'max-h-[95vh]'} flex flex-col relative overflow-hidden`}
      >
        {/* Mobile-specific UI when no player added yet */}
        {window.__mobileFlow && currentGroup.length === 0 ? (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 rounded-xl text-center">
            <p className="text-lg sm:text-2xl text-green-800 font-semibold">
              Court {window.__preselectedCourt} Selected
            </p>
          </div>
        ) : (
          /* Normal UI for desktop or when player exists */
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 rounded-xl text-center">
            <p className="text-lg sm:text-2xl text-blue-800">
              Welcome
              {currentGroup[0]?.name ? (
                <>
                  , <strong>{currentGroup[0]?.name}</strong>
                </>
              ) : (
                ''
              )}
              !
            </p>
            <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">
              {currentGroup.length === 0
                ? 'Search for players to add to your group'
                : currentGroup.length === 1
                  ? isMobileView
                    ? ''
                    : 'Add more players to your group or select a court'
                  : `${currentGroup.length} players in your group`}
            </p>
          </div>
        )}
        <div
          className="flex-1 overflow-y-auto pb-24 sm:pb-32"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {/* Only show Current Group section if there are players or not in mobile flow */}
          {(currentGroup.length > 0 || !window.__mobileFlow) && (
            <>
              {!window.__mobileFlow && (
                <h3 className="text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Current Group</h3>
              )}
              <div className={`space-y-2 ${!window.__mobileFlow ? 'mb-3 sm:mb-4' : ''}`}>
                {currentGroup.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 p-2.5 sm:p-3 rounded-xl"
                  >
                    <div>
                      <span className="font-medium text-base sm:text-lg">{player.name}</span>
                      {player.isGuest && (
                        <span className="text-xs sm:text-sm text-blue-600 ml-2 sm:ml-3 font-medium">
                          (Guest{player.sponsor ? ` of ${player.sponsor}` : ''})
                        </span>
                      )}
                      {!player.isGuest && player.ranking && (
                        <span className="text-xs sm:text-sm text-blue-600 ml-2 sm:ml-3">
                          Rank #{player.ranking}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRemovePlayer(idx)}
                      className="text-red-500 hover:bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Mobile flow: Show search input when no players, otherwise show Add Another Player button */}
          {window.__mobileFlow && currentGroup.length === 0 ? (
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={onSearchChange}
                  onFocus={onSearchFocus}
                  placeholder={
                    isMobileView ? 'Enter Name or Number' : 'Enter your name or Member #'
                  }
                  className={`w-full ${isMobileView ? 'p-3 text-base input--compact' : 'p-4 sm:p-5 text-xl sm:text-2xl'} border-2 rounded-xl focus:border-green-500 focus:outline-none`}
                  id="mobile-group-search-input"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck="false"
                />
              </div>

              {/* Search suggestions dropdown */}
              {showSuggestions && (
                <div
                  className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden"
                  style={{ maxHeight: '400px', overflowY: 'auto' }}
                >
                  {getAutocompleteSuggestions(effectiveSearchInput).length > 0 ? (
                    getAutocompleteSuggestions(effectiveSearchInput).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="w-full p-4 text-left hover:bg-blue-50 flex items-center border-b border-gray-100"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-lg">
                            {suggestion.member.name}
                            {suggestion.member.isGuest && (
                              <span className="text-sm text-blue-600 ml-2">(Guest)</span>
                            )}
                          </div>
                          {suggestion.type === 'member' && (
                            <div className="text-sm text-gray-600">
                              Member #{suggestion.member.id}
                            </div>
                          )}
                        </div>
                        {suggestion.type === 'member' && suggestion.member.ranking && (
                          <div className="text-sm text-blue-600 font-medium">
                            Rank #{suggestion.member.ranking}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {searchInput.length < 2 ? 'Keep typing...' : 'No members found'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            currentGroup.length < CONSTANTS.MAX_PLAYERS && (
              <div className="flex gap-2 sm:gap-3 mb-3">
                <button
                  onClick={onToggleAddPlayer}
                  className="flex-1 bg-green-500 text-white py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl hover:bg-green-600 transition-colors"
                >
                  Add Another Player
                </button>
                <button
                  onClick={onToggleGuestForm}
                  className="bg-blue-50 text-blue-600 border border-blue-600 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl hover:bg-blue-100 transition-colors"
                >
                  + Guest
                </button>
              </div>
            )
          )}

          {showAddPlayer && !showGuestForm && (
            <div className="mb-4 relative">
              <div className="relative">
                <input
                  type="text"
                  value={addPlayerSearch}
                  onChange={onAddPlayerSearchChange}
                  onFocus={onAddPlayerSearchFocus}
                  placeholder="Enter name or member number..."
                  className="w-full p-2.5 sm:p-3 text-lg sm:text-xl border-2 rounded-xl focus:border-green-500 focus:outline-none"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck="false"
                />
              </div>

              {showAddPlayerSuggestions && (
                <div
                  className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg"
                  style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                  {getAutocompleteSuggestions(effectiveAddPlayerSearch).length > 0 ? (
                    getAutocompleteSuggestions(effectiveAddPlayerSearch).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => onAddPlayerSuggestionClick(suggestion)}
                        className="w-full p-2.5 sm:p-3 text-left hover:bg-green-50 border-b last:border-b-0 transition-colors block"
                      >
                        <div className="font-medium text-base sm:text-lg">
                          {suggestion.member.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Member #{suggestion.memberNumber}
                        </div>
                      </button>
                    ))
                  ) : addPlayerSearch.length >= 2 ? (
                    <button
                      onClick={() => onToggleGuestForm(addPlayerSearch)}
                      className="w-full p-2.5 sm:p-3 text-left hover:bg-blue-50 transition-colors block"
                    >
                      <div className="font-medium text-base sm:text-lg text-blue-600">
                        Add &quot;{addPlayerSearch}&quot; as guest?
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        No member found with this name
                      </div>
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Guest Form */}
          {showAddPlayer && showGuestForm && (
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Add Guest Player</h4>

              <div className="mb-2 sm:mb-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={onGuestNameChange}
                  placeholder="Enter first and last name"
                  className="w-full p-2 text-base sm:text-lg border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                {showGuestNameError && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">
                    Please enter your guest&apos;s full name
                  </p>
                )}
              </div>

              {/* Only show sponsor selection if there are multiple members */}
              {currentGroup.filter((p) => !p.isGuest).length > 1 && (
                <div className="mb-2 sm:mb-3">
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-1 ${
                      showSponsorError ? 'text-red-500' : 'text-gray-700'
                    }`}
                  >
                    {showSponsorError
                      ? "Please choose your guest's sponsoring member"
                      : 'Sponsoring Member'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentGroup
                      .filter((p) => !p.isGuest)
                      .map((member) => (
                        <button
                          key={member.id}
                          onClick={() => onSelectSponsor(member.memberNumber)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-colors text-xs sm:text-sm ${
                            guestSponsor === member.memberNumber
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {member.memberNumber === memberNumber ? 'My Guest' : member.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onAddGuest}
                  className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                >
                  Add Guest
                </button>
                <button
                  onClick={onCancelGuest}
                  className="bg-gray-300 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Frequent partners */}
          {memberNumber &&
            frequentPartners &&
            frequentPartners.length > 0 &&
            currentGroup.length < CONSTANTS.MAX_PLAYERS && (
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {frequentPartners
                    .slice(0, CONSTANTS.MAX_FREQUENT_PARTNERS)
                    .map((partner, idx) => {
                      const names = partner.player.name.split(' ');
                      const displayName =
                        names.join(' ').length > 15
                          ? `${names[0].charAt(0)}. ${names[1] || names[0]}`
                          : partner.player.name;

                      return (
                        <button
                          key={idx}
                          onClick={() => onAddFrequentPartner(partner.player)}
                          disabled={isPlayerAlreadyPlaying(partner.player.id).isPlaying}
                          className="bg-white p-2 sm:p-3 rounded-lg hover:bg-yellow-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="font-medium text-xs sm:text-sm">{displayName}</div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
        </div>
        <div
          className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex ${isMobileView ? 'justify-between' : 'justify-between gap-2'} items-end bottom-nav-buttons`}
        >
          <button
            onClick={onGoBack}
            className="bg-gray-300 text-gray-700 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-gray-400 transition-colors relative z-10"
          >
            {isMobileView ? 'Back' : 'Go Back'}
          </button>

          {currentGroup.length >= 1 && (
            <div className={isMobileView ? 'flex-1 flex justify-center' : ''}>
              {(() => {
                // Check if there's a waitlist and if this group is not the first waiting group
                const waitlistEntries = data?.waitlist || [];
                const hasWaitlist = waitlistEntries.length > 0;

                // Check if current group is in the allowed positions (1st or 2nd when 2+ courts)
                let groupWaitlistPosition = 0;
                for (let i = 0; i < waitlistEntries.length; i++) {
                  if (sameGroup(waitlistEntries[i]?.players || [], currentGroup)) {
                    groupWaitlistPosition = i + 1; // 1-based position
                    break;
                  }
                }

                // Use availableCourts state (already set from API data)
                const courtsToCheck = availableCourts;

                // Check if there are actually any courts available to select
                const hasAvailableCourts = courtsToCheck && courtsToCheck.length > 0;
                const availableCourtCount = courtsToCheck?.length || 0;

                // Show "Select a Court" if:
                // 1. No waitlist and courts available OR
                // 2. Group is position 1 and courts available OR
                // 3. Group is position 2 and 2+ courts available
                const showSelectCourt =
                  hasAvailableCourts &&
                  (!hasWaitlist ||
                    groupWaitlistPosition === 1 ||
                    (groupWaitlistPosition === 2 && availableCourtCount >= 2));

                return showSelectCourt;
              })() ? (
                <button
                  onClick={onSelectCourt}
                  className={`${isMobileView ? 'px-6' : ''} bg-blue-500 text-white py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl hover:bg-blue-600 transition-colors`}
                >
                  {isMobileView
                    ? window.__mobileFlow && window.__preselectedCourt
                      ? `Take Court ${window.__preselectedCourt}`
                      : 'Continue'
                    : window.__mobileFlow && window.__preselectedCourt
                      ? `Register for Court ${window.__preselectedCourt}`
                      : 'Select a Court'}
                </button>
              ) : (
                <button
                  onClick={onJoinWaitlist}
                  className={`${isMobileView ? 'px-6' : ''} bg-orange-500 text-white py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl hover:bg-orange-600 transition-colors`}
                >
                  Join Waitlist
                </button>
              )}
            </div>
          )}

          {!isMobileView && (
            <button
              onClick={onStartOver}
              className="bg-red-500 text-white py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-red-600 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>

        <div
          id="etaPreview"
          aria-live="polite"
          style={{ marginTop: '8px', fontSize: '0.95rem', opacity: '0.9' }}
        ></div>
      </div>
    </div>
  );
};

export default GroupScreen;
