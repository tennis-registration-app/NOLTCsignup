// @ts-check
import React, { useRef, useEffect } from 'react';
import { ToastHost, AlertDisplay } from '../components';
import { isCourtEligibleForGroup } from '../../lib/types/domain.js';

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

/**
 * GroupScreenActions - Bottom navigation buttons with court/waitlist logic
 * @param {Object} props
 */
const GroupScreenActions = ({
  // Data
  data,
  currentGroup,
  availableCourts,
  courtSelection,
  // UI state
  isMobileView,
  mobileFlow,
  preselectedCourt,
  showGuestForm,
  isAssigning,
  joiningWaitlist,
  // Callbacks
  onGoBack,
  onSelectCourt,
  onJoinWaitlist,
  onStartOver,
  // Utilities
  sameGroup,
}) => {
  // Compute whether to show Select Court or Join Waitlist
  const computeShowSelectCourt = () => {
    // Check if there's a waitlist and if this group is not the first waiting group
    // Filter out deferred entries - they're transparent to queue logic
    const waitlistEntries = data?.waitlist || [];
    const activeWaitlistEntries = waitlistEntries.filter((e) => !e.deferred);
    const hasWaitlist = activeWaitlistEntries.length > 0;

    // Check if current group is in the allowed positions (1st or 2nd when 2+ courts)
    let groupWaitlistPosition = 0;
    for (let i = 0; i < activeWaitlistEntries.length; i++) {
      if (sameGroup(activeWaitlistEntries[i]?.players || [], currentGroup)) {
        groupWaitlistPosition = i + 1; // 1-based position
        break;
      }
    }

    // Use courtSelection for doubles eligibility (handles Court 8 + overtime fallback)
    const groupSize = currentGroup?.length || 0;
    const courtsToCheck = courtSelection
      ? courtSelection.getSelectableForGroup(groupSize).map((sc) => sc.number)
      : availableCourts?.filter((courtNum) => isCourtEligibleForGroup(courtNum, groupSize));

    // Check if there are actually any courts available to select
    const hasAvailableCourts = courtsToCheck && courtsToCheck.length > 0;
    const availableCourtCount = courtsToCheck?.length || 0;

    // Show "Select a Court" if:
    // 1. No waitlist and courts available OR
    // 2. Group is position 1 and courts available OR
    // 3. Group is position 2 and 2+ courts available
    return (
      hasAvailableCourts &&
      (!hasWaitlist ||
        groupWaitlistPosition === 1 ||
        (groupWaitlistPosition === 2 && availableCourtCount >= 2))
    );
  };

  const showSelectCourt = computeShowSelectCourt();

  // Button text logic
  const getSelectCourtText = () => {
    if (isAssigning) return 'Assigning Court...';
    if (isMobileView) {
      return mobileFlow && preselectedCourt ? `Take Court ${preselectedCourt}` : 'Continue';
    }
    return mobileFlow && preselectedCourt
      ? `Register for Court ${preselectedCourt}`
      : 'Select a Court';
  };

  return (
    <div
      className={`absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex ${isMobileView ? 'justify-between' : 'justify-between gap-2'} items-end bottom-nav-buttons`}
    >
      <button
        onClick={onGoBack}
        className="bg-gray-100 text-gray-700 border border-gray-300 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-gray-200 transition-colors relative z-10"
      >
        {isMobileView ? 'Back' : 'Go Back'}
      </button>

      {currentGroup.length >= 1 && (
        <div className={isMobileView ? 'flex-1 flex justify-center' : ''}>
          {showSelectCourt ? (
            <button
              onClick={onSelectCourt}
              disabled={isAssigning || showGuestForm}
              data-testid="reg-submit-btn"
              className={`relative overflow-visible ${isMobileView ? 'px-6' : ''} py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl transition-colors text-white ${
                showGuestForm
                  ? 'bg-blue-300 cursor-not-allowed opacity-60'
                  : isAssigning
                    ? 'bg-blue-600'
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {getSelectCourtText()}
              {isAssigning && <LoadingBorderSpinner animationId="select" />}
            </button>
          ) : (
            <button
              onClick={onJoinWaitlist}
              disabled={joiningWaitlist || showGuestForm}
              className={`relative overflow-visible z-10 min-h-[48px] ${isMobileView ? 'px-6' : ''} py-2 sm:py-4 px-4 sm:px-8 rounded-xl text-base sm:text-xl transition-colors text-white ${
                showGuestForm
                  ? 'bg-blue-300 cursor-not-allowed opacity-60'
                  : joiningWaitlist
                    ? 'bg-blue-600'
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {joiningWaitlist ? 'Joining Waitlist...' : 'Join Waitlist'}
              {joiningWaitlist && <LoadingBorderSpinner animationId="waitlist" />}
            </button>
          )}
        </div>
      )}

      {!isMobileView && (
        <button
          onClick={onStartOver}
          className="bg-white text-red-500 border-2 border-red-400 py-2 sm:py-3 px-3 sm:px-6 rounded-xl text-sm sm:text-lg hover:bg-red-50 hover:border-red-500 transition-colors"
        >
          Start Over
        </button>
      )}
    </div>
  );
};

/**
 * GuestFormInline - Animated guest form with sponsor selection
 * @param {Object} props
 * @param {boolean} props.show - Whether the form is visible
 * @param {Array} props.currentGroup - Current group of players
 * @param {string} props.memberNumber - Current user's member number
 * @param {string} props.guestSponsor - Currently selected sponsor member number
 * @param {boolean} props.showSponsorError - Whether to show sponsor error
 * @param {boolean} props.showGuestNameError - Whether to show guest name error
 * @param {function} props.onSelectSponsor - Callback when sponsor is selected
 * @param {function} props.onAddGuest - Callback when Add Guest is clicked
 * @param {function} props.onCancelGuest - Callback when Cancel is clicked
 */
const GuestFormInline = ({
  show,
  currentGroup,
  memberNumber,
  guestSponsor,
  showSponsorError,
  showGuestNameError,
  onSelectSponsor,
  onAddGuest,
  onCancelGuest,
}) => {
  const nonGuestMembers = currentGroup.filter((p) => !p.isGuest);

  return (
    <div
      className={`grid transition-all duration-1000 delay-300 ease-in-out ${
        show ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left side - Sponsoring Member (only if multiple non-guest members) */}
          {nonGuestMembers.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${showSponsorError ? 'text-red-500' : 'text-gray-600'}`}>
                Sponsor:
              </span>
              {nonGuestMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onSelectSponsor(member.memberNumber)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    guestSponsor === member.memberNumber
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {member.memberNumber === memberNumber ? 'My Guest' : member.name}
                </button>
              ))}
            </div>
          )}

          {/* Right side - Add Guest / Cancel */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onAddGuest}
              className="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Add Guest
            </button>
            <button
              onClick={onCancelGuest}
              className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Error message below */}
        {showGuestNameError && (
          <p className="text-red-500 text-sm mt-2">Please enter your guest&apos;s full name</p>
        )}
      </div>
    </div>
  );
};

/**
 * LoadingBorderSpinner - Animated dashed border spinner for loading states
 * @param {Object} props
 * @param {string} props.animationId - Unique ID for the keyframe animation (e.g., 'select', 'waitlist')
 */
const LoadingBorderSpinner = ({ animationId }) => (
  <svg
    className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <style>
      {`
        @keyframes dash-move-${animationId} {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 140; }
        }
      `}
    </style>
    <rect
      x="1"
      y="1"
      width="98"
      height="98"
      rx="12"
      ry="12"
      fill="none"
      stroke="white"
      strokeOpacity="0.8"
      strokeWidth="2"
      strokeDasharray="60 80"
      style={{ animation: `dash-move-${animationId} 1s linear infinite` }}
    />
  </svg>
);

/**
 * FrequentPartnersList - Shows frequent partners for quick selection
 * @param {Object} props
 * @param {Array} props.partners - Available partners to display
 * @param {boolean} props.loading - Whether partners are loading
 * @param {number} props.maxPartners - Maximum number of partners to show
 * @param {function} props.onSelect - Callback when a partner is clicked
 */
const FrequentPartnersList = ({ partners, loading, maxPartners, onSelect }) => {
  if (!loading && partners.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-green-200 mt-4 pt-4">
      <h4 className="font-medium text-sm sm:text-base mb-2 sm:mb-3">Frequent Partners</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 sm:h-12 bg-green-200/60 rounded-lg animate-pulse" />
            ))}
          </>
        ) : (
          partners.slice(0, maxPartners).map((partner, idx) => {
            const names = partner.player.name.split(' ');
            const displayName =
              names.join(' ').length > 20
                ? `${names[0].charAt(0)}. ${names[1] || names[0]}`
                : partner.player.name;

            return (
              <button
                key={idx}
                onClick={() => onSelect(partner.player)}
                className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200 hover:bg-green-100 transition-colors text-left"
              >
                <div className="font-medium text-xs sm:text-sm">{displayName}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * SearchSuggestions - Reusable autocomplete dropdown for member search
 * @param {Object} props
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {function} props.onSelect - Callback when a suggestion is clicked
 * @param {string} [props.searchInput] - Current search input (for empty state message)
 * @param {string} [props.hoverColor] - Hover background color class (default: 'hover:bg-blue-50')
 * @param {string} [props.containerClass] - Additional container classes
 * @param {Object} [props.style] - Additional inline styles
 * @param {boolean} [props.showMemberId] - Show member.id (true) or memberNumber (false)
 * @param {function} [props.onAddAsGuest] - If provided, shows "Add as guest" option when no matches
 * @param {string} [props.addAsGuestName] - Name to show in "Add as guest" option
 */
const SearchSuggestions = ({
  suggestions,
  onSelect,
  searchInput = '',
  hoverColor = 'hover:bg-blue-50',
  containerClass = '',
  style = {},
  showMemberId = true,
  onAddAsGuest = null,
  addAsGuestName = '',
}) => {
  if (suggestions.length > 0) {
    return (
      <div
        className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg ${containerClass}`}
        style={{ maxHeight: '300px', overflowY: 'auto', ...style }}
      >
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className={`w-full p-2.5 sm:p-3 text-left ${hoverColor} border-b border-gray-100 last:border-b-0 transition-colors block`}
          >
            <div className="flex-1">
              <div className="font-medium text-base sm:text-lg">
                {suggestion.member.name}
                {suggestion.member.isGuest && (
                  <span className="text-sm text-blue-600 ml-2">(Guest)</span>
                )}
              </div>
              {suggestion.type === 'member' && (
                <div className="text-xs sm:text-sm text-gray-600">
                  Member #{showMemberId ? suggestion.member.id : suggestion.memberNumber}
                </div>
              )}
            </div>
            {suggestion.type === 'member' && suggestion.member.ranking && (
              <div className="text-sm text-blue-600 font-medium">
                Rank #{suggestion.member.ranking}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // No matches - show "Add as guest" or empty state
  if (onAddAsGuest && searchInput.length >= 2) {
    return (
      <div
        className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg ${containerClass}`}
        style={{ maxHeight: '200px', overflowY: 'auto', ...style }}
      >
        <button
          onClick={() => onAddAsGuest(addAsGuestName)}
          className={`w-full p-2.5 sm:p-3 text-left ${hoverColor} transition-colors block`}
        >
          <div className="font-medium text-base sm:text-lg text-blue-600">
            Add &quot;{addAsGuestName}&quot; as guest?
          </div>
          <div className="text-xs sm:text-sm text-gray-600">No member found with this name</div>
        </button>
      </div>
    );
  }

  // Empty state
  return (
    <div
      className={`bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden ${containerClass}`}
      style={{ maxHeight: '300px', overflowY: 'auto', ...style }}
    >
      <div className="p-3 text-center text-gray-500 text-sm">
        {searchInput.length < 2 ? 'Keep typing...' : 'No members found'}
      </div>
    </div>
  );
};

/**
 * MobileGroupSearchModal - Compact modal for mobile flow with no players yet
 */
const MobileGroupSearchModal = ({
  showAlert,
  alertMessage,
  preselectedCourt,
  searchInput,
  onSearchChange,
  onSearchFocus,
  showSuggestions,
  effectiveSearchInput,
  getAutocompleteSuggestions,
  onSuggestionClick,
}) => {
  return (
    <div className="w-full h-full min-h-screen flex items-start justify-center pt-[12vh] p-4">
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
        {/* X Close button */}
        <button
          onClick={() => {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'register:closed' }, '*');
            }
          }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Court indicator */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-lg text-green-800 font-semibold">Court {preselectedCourt} Selected</p>
        </div>

        {/* Title */}
        <p className="text-gray-600 text-center mb-4 text-sm">
          Please register when all players are ready
        </p>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Enter Name or Member #"
            className="w-full p-3 text-base border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
            id="mobile-group-search-input"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
          />

          {/* Search suggestions dropdown */}
          {showSuggestions && (
            <SearchSuggestions
              suggestions={getAutocompleteSuggestions(effectiveSearchInput)}
              onSelect={onSuggestionClick}
              searchInput={searchInput}
              hoverColor="hover:bg-blue-50"
              containerClass="absolute z-10 w-full mt-2"
              showMemberId={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupScreen;
