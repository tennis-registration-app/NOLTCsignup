// @ts-check
import React from 'react';
import { isCourtEligibleForGroup } from '../../../lib/types/domain.js';
import LoadingBorderSpinner from './LoadingBorderSpinner.jsx';

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

export default GroupScreenActions;
