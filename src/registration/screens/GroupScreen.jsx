// @ts-check
import React, { useRef, useEffect } from 'react';
import { ToastHost, AlertDisplay } from '../components';
import MobileGroupSearchModal from './group/MobileGroupSearchModal.jsx';
import SearchSuggestions from './group/SearchSuggestions.jsx';
import FrequentPartnersList from './group/FrequentPartnersList.jsx';
import GuestFormInline from './group/GuestFormInline.jsx';
import GroupScreenActions from './group/GroupScreenActions.jsx';

/**
 * GroupScreen - Player group builder screen
 * @param {Object} props - All props are passed through; see destructuring below
 */
const GroupScreen = (
  /** @type {any} */ {
    // Data
    data,
    currentGroup,
    memberNumber,
    availableCourts,
    courtSelection,
    frequentPartners,
    frequentPartnersLoading,

    // UI state
    showAlert,
    alertMessage,
    showTimeoutWarning,
    isMobileView,

    // Mobile flow
    mobileFlow = false,
    preselectedCourt = null,

    // Search state
    searchInput,
    showSuggestions,
    effectiveSearchInput,

    // Add player state
    _showAddPlayer,
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
    _onToggleAddPlayer,
    onToggleGuestForm,
    onRemovePlayer,
    onSelectSponsor,
    onGuestNameChange,
    onAddGuest,
    onCancelGuest,
    onAddFrequentPartner,
    onSelectCourt,
    isAssigning = false,
    onJoinWaitlist,
    joiningWaitlist = false,
    onGoBack,
    onStartOver,

    // Utilities
    getAutocompleteSuggestions,
    isPlayerAlreadyPlaying,
    sameGroup,
    CONSTANTS,
  }
) => {
  const addPlayerInputRef = useRef(null);
  const guestInputRef = useRef(null);

  // Focus on mount and after player count changes (player added)
  useEffect(() => {
    if (!showGuestForm) {
      addPlayerInputRef.current?.focus();
    }
  }, [currentGroup.length, showGuestForm]);

  // Focus guest input when guest mode activates
  useEffect(() => {
    if (showGuestForm) {
      guestInputRef.current?.focus();
    }
  }, [showGuestForm]);

  // Compact modal for mobile flow with no players yet
  if (mobileFlow && currentGroup.length === 0) {
    return (
      <MobileGroupSearchModal
        showAlert={showAlert}
        alertMessage={alertMessage}
        preselectedCourt={preselectedCourt}
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        onSearchFocus={onSearchFocus}
        showSuggestions={showSuggestions}
        effectiveSearchInput={effectiveSearchInput}
        getAutocompleteSuggestions={getAutocompleteSuggestions}
        onSuggestionClick={onSuggestionClick}
      />
    );
  }

  // Full GroupScreen UI (desktop or mobile with players)
  return (
    <div
      className={`w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex ${mobileFlow ? 'items-start pt-[15vh]' : 'items-center justify-center'}`}
    >
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      {showTimeoutWarning && (
        <div className="fixed top-4 sm:top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white p-3 sm:p-4 rounded-xl shadow-lg z-50 text-base sm:text-lg animate-pulse">
          Session will expire in 30 seconds due to inactivity
        </div>
      )}
      <div
        className={`bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-5xl h-full ${mobileFlow ? 'max-h-[70vh]' : 'max-h-[95vh]'} flex flex-col relative overflow-hidden`}
      >
        {/* Mobile flow header when player exists */}
        {mobileFlow ? (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 rounded-xl text-center">
            <p className="text-lg sm:text-2xl text-green-800 font-semibold">
              Court {preselectedCourt} Selected
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
          {(currentGroup.length > 0 || !mobileFlow) && (
            <>
              {!mobileFlow && (
                <h3 className="text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Current Group</h3>
              )}
              <div className={`grid grid-cols-2 gap-2 ${!mobileFlow ? 'mb-3 sm:mb-4' : ''}`}>
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
                    {idx > 0 && (
                      <button
                        onClick={() => onRemovePlayer(idx)}
                        className="text-red-500 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg font-bold flex-shrink-0"
                        aria-label={`Remove ${player.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add Another Player section */}
          {currentGroup.length < CONSTANTS.MAX_PLAYERS && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-4 relative">
              <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-3">
                {showGuestForm ? (
                  <>
                    <div className="flex-1 min-w-0"></div>
                    <h4 className="flex-[4] font-medium text-sm sm:text-base text-center">
                      Add Guest Player
                    </h4>
                  </>
                ) : (
                  <h4 className="font-medium text-sm sm:text-base">Add Another Player</h4>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3 overflow-hidden">
                <input
                  ref={addPlayerInputRef}
                  type="text"
                  placeholder={showGuestForm ? 'Add Member' : 'Enter name or member number'}
                  value={showGuestForm ? '' : addPlayerSearch}
                  onChange={onAddPlayerSearchChange}
                  onFocus={onAddPlayerSearchFocus}
                  onClick={() => {
                    if (showGuestForm) {
                      onCancelGuest();
                      // Focus with setTimeout to allow React to update readOnly state first
                      // This keeps focus within the user gesture context for iOS Safari
                      setTimeout(() => {
                        addPlayerInputRef.current?.focus();
                      }, 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showGuestForm) {
                      const suggestions = getAutocompleteSuggestions(addPlayerSearch);
                      // Only auto-select if there's exactly one member suggestion
                      if (suggestions.length === 1) {
                        e.preventDefault();
                        onAddPlayerSuggestionClick(suggestions[0]);
                      }
                      // If no matches, do nothing - user must explicitly click "Add as guest" option
                    }
                  }}
                  readOnly={showGuestForm}
                  className={`${showGuestForm ? 'flex-1 bg-gray-100 cursor-pointer placeholder-green-600' : 'flex-[4] bg-white placeholder-gray-400'}
                      min-w-0 text-green-800 border-2 border-green-500
                      py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl
                      focus:outline-none focus:ring-2 focus:ring-green-500
                      transition-all duration-[1400ms] ease-in-out`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck="false"
                />
                {showGuestForm ? (
                  <input
                    ref={guestInputRef}
                    type="text"
                    placeholder="Enter first and last name"
                    value={guestName}
                    onChange={onGuestNameChange}
                    className="flex-[4] bg-white text-blue-800 placeholder-gray-400 border border-blue-300
                        py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-all duration-[1400ms] ease-in-out"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck="false"
                  />
                ) : (
                  <button
                    onClick={onToggleGuestForm}
                    className="flex-1 bg-blue-50 text-blue-600 border border-blue-600
                        py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-base sm:text-xl
                        hover:bg-blue-100 transition-all duration-[1400ms] ease-in-out whitespace-nowrap"
                  >
                    + Guest
                  </button>
                )}
              </div>

              {/* Autocomplete suggestions dropdown - only when not in guest mode */}
              {!showGuestForm && showAddPlayerSuggestions && (
                <SearchSuggestions
                  suggestions={getAutocompleteSuggestions(effectiveAddPlayerSearch)}
                  onSelect={onAddPlayerSuggestionClick}
                  searchInput={addPlayerSearch}
                  hoverColor="hover:bg-green-50"
                  containerClass="absolute z-10 left-4 right-4 mt-2"
                  style={{ maxHeight: '200px' }}
                  showMemberId={false}
                  onAddAsGuest={onToggleGuestForm}
                  addAsGuestName={addPlayerSearch}
                />
              )}

              {/* Guest Form - grid animated */}
              <GuestFormInline
                show={showGuestForm}
                currentGroup={currentGroup}
                memberNumber={memberNumber}
                guestSponsor={guestSponsor}
                showSponsorError={showSponsorError}
                showGuestNameError={showGuestNameError}
                onSelectSponsor={onSelectSponsor}
                onAddGuest={onAddGuest}
                onCancelGuest={onCancelGuest}
              />

              {/* Frequent partners section - inline within Add Another Player card */}
              {memberNumber && (
                <FrequentPartnersList
                  partners={(frequentPartners || []).filter(
                    (partner) =>
                      !isPlayerAlreadyPlaying(partner.player?.id || partner.player?.memberId)
                        .isPlaying
                  )}
                  loading={frequentPartnersLoading}
                  maxPartners={CONSTANTS.MAX_FREQUENT_PARTNERS}
                  onSelect={onAddFrequentPartner}
                />
              )}
            </div>
          )}
        </div>
        <GroupScreenActions
          data={data}
          currentGroup={currentGroup}
          availableCourts={availableCourts}
          courtSelection={courtSelection}
          isMobileView={isMobileView}
          mobileFlow={mobileFlow}
          preselectedCourt={preselectedCourt}
          showGuestForm={showGuestForm}
          isAssigning={isAssigning}
          joiningWaitlist={joiningWaitlist}
          onGoBack={onGoBack}
          onSelectCourt={onSelectCourt}
          onJoinWaitlist={onJoinWaitlist}
          onStartOver={onStartOver}
          sameGroup={sameGroup}
        />

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
