// @ts-check
/**
 * CourtSelectionScreen Component
 *
 * Court picker grid showing available courts.
 * Handles block warnings for courts with upcoming reservations.
 *
 * @param {Object} props
 * @param {any[]} props.availableCourts - Array of available court numbers
 * @param {any} props.showingOvertimeCourts - Whether showing overtime courts
 * @param {Function} props.onCourtSelect - Court selection handler
 * @param {Function} props.onGoBack - Go back handler
 * @param {Function} props.onStartOver - Start over handler
 * @param {any[]} [props.currentGroup] - Current group to determine session duration
 * @param {boolean} [props.isMobileView] - Whether in mobile view
 * @param {any[]} [props.upcomingBlocks] - Upcoming block data for warning checks
 * @param {boolean} [props.hasWaitingGroups] - Whether there are groups waiting
 * @param {number} [props.waitingGroupsCount] - Number of groups waiting
 * @param {Function} [props.onJoinWaitlist] - Join waitlist handler
 * @param {Function} [props.onAssignNext] - Assign next handler
 * @param {boolean} [props.hasWaitlistPriority] - Whether user came from waitlist
 * @param {string|null} [props.currentWaitlistEntryId] - Waitlist entry UUID if from waitlist
 * @param {Function} [props.onDeferWaitlist] - Handler to defer and stay on waitlist
 */
import React, { useState } from 'react';
import { getUpcomingBlockWarningFromBlocks } from '@lib';
import BlockWarningModal from '../modals/BlockWarningModal.jsx';

const CourtSelectionScreen = ({
  availableCourts,
  showingOvertimeCourts,
  onCourtSelect,
  onGoBack,
  onStartOver,
  currentGroup = [],
  isMobileView = false,
  upcomingBlocks = [],
  // These props are passed but not used in component - accept them to avoid caller type errors
  hasWaitingGroups: _hasWaitingGroups,
  waitingGroupsCount: _waitingGroupsCount,
  onJoinWaitlist: _onJoinWaitlist,
  onAssignNext: _onAssignNext,
  hasWaitlistPriority = false,
  currentWaitlistEntryId = null,
  onDeferWaitlist,
}) => {
  const [blockWarning, setBlockWarning] = useState(null);
  const [pendingCourtNumber, setPendingCourtNumber] = useState(null);
  const [loadingCourt, setLoadingCourt] = useState(null);

  // Determine session duration based on group size
  const getSessionDuration = (group) => {
    const playerCount = group?.length || 0;
    return playerCount >= 4 ? 90 : 60; // 90 minutes for doubles (4+ players), 60 for singles
  };

  // Handle court selection with block checking
  const handleCourtClick = (courtNumber) => {
    // Ignore clicks if already loading
    if (loadingCourt) return;

    const duration = getSessionDuration(currentGroup);
    const warning = getUpcomingBlockWarningFromBlocks(courtNumber, duration, upcomingBlocks);

    if (warning) {
      if (warning.type === 'blocked') {
        // Court is blocked - show warning but don't allow proceed
        setBlockWarning(warning);
        setPendingCourtNumber(null);
      } else {
        // Court has limited time - show confirmation
        setBlockWarning(warning);
        setPendingCourtNumber(courtNumber);
      }
    } else {
      // No block issues - proceed with loading state
      setLoadingCourt(courtNumber);
      onCourtSelect(courtNumber);
    }
  };

  // Confirm selection despite limited time
  const handleConfirmSelection = () => {
    if (pendingCourtNumber) {
      setLoadingCourt(pendingCourtNumber);
      onCourtSelect(pendingCourtNumber);
    }
    setBlockWarning(null);
    setPendingCourtNumber(null);
  };

  // Cancel selection
  const handleCancelSelection = () => {
    setBlockWarning(null);
    setPendingCourtNumber(null);
  };

  // Get warning info for a court to show visual indicators
  const getCourtWarningInfo = (courtNumber) => {
    const duration = getSessionDuration(currentGroup);
    return getUpcomingBlockWarningFromBlocks(courtNumber, duration, upcomingBlocks);
  };

  // Determine if ALL available courts are time-restricted for this group
  const allCourtsRestricted =
    hasWaitlistPriority &&
    currentWaitlistEntryId &&
    availableCourts.length > 0 &&
    availableCourts.every((courtNum) => {
      const duration = getSessionDuration(currentGroup);
      const warning = getUpcomingBlockWarningFromBlocks(courtNum, duration + 5, upcomingBlocks);
      return warning != null;
    });

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl relative">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Select Your Court
        </h2>

        {showingOvertimeCourts && (
          <p
            className="text-center text-gray-600 mb-4 text-sm sm:text-base"
            data-testid="overtime-warning"
          >
            All courts are occupied. You may claim an overtime court.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-16 sm:mb-20">
          {availableCourts.map((courtNum) => {
            const warningInfo = getCourtWarningInfo(courtNum);
            const hasUpcomingBlock = warningInfo && warningInfo.minutesUntilBlock < 60;

            const isLoading = loadingCourt === courtNum;
            const isDisabled = loadingCourt && loadingCourt !== courtNum;

            return (
              <button
                key={courtNum}
                onClick={() => handleCourtClick(courtNum)}
                disabled={isDisabled}
                className={`relative overflow-visible p-6 sm:p-8 rounded-xl text-xl sm:text-2xl font-bold text-white transition-all transform shadow-lg ${
                  isLoading
                    ? 'bg-gradient-to-r from-green-500 to-green-600 scale-105'
                    : isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gradient-to-r from-green-400 to-green-500'
                      : showingOvertimeCourts
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105'
                        : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 hover:scale-105'
                }`}
              >
                {/* Rotating progress ring - only on selected tile */}
                {isLoading && (
                  <svg
                    className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <style>
                      {`
                        @keyframes dash-move {
                          0% { stroke-dashoffset: 0; }
                          100% { stroke-dashoffset: -140; }
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
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="2"
                      strokeDasharray="60 80"
                      style={{
                        animation: 'dash-move 1s linear infinite',
                      }}
                    />
                  </svg>
                )}

                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <span>Court {courtNum}</span>

                  {/* Show upcoming block warning as simple yellow text when within 60 minutes */}
                  {hasUpcomingBlock && (
                    <div className="mt-1 text-yellow-300 text-sm text-center font-normal">
                      {warningInfo.reason} in {warningInfo.minutesUntilBlock}m
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Stay on Waitlist option when all courts are time-restricted */}
        {allCourtsRestricted && onDeferWaitlist && (
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm mb-2">
              All available courts have upcoming reservations that limit your play time.
            </p>
            <button
              onClick={() => onDeferWaitlist(currentWaitlistEntryId)}
              className="bg-blue-500 text-white py-3 px-8 rounded-xl text-lg font-semibold hover:bg-blue-600 transition-colors shadow-md"
            >
              Stay on Waitlist
            </button>
          </div>
        )}

        <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex justify-between">
          <button
            onClick={onGoBack}
            className="bg-gray-100 text-gray-700 border border-gray-300 py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-gray-200 transition-colors"
          >
            {isMobileView ? 'Back' : 'Go Back'}
          </button>

          <button
            onClick={onStartOver}
            className="bg-white text-red-500 border-2 border-red-400 py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-red-50 hover:border-red-500 transition-colors"
          >
            Start Over
          </button>
        </div>

        {/* Block Warning Modal */}
        <BlockWarningModal
          warning={blockWarning}
          onConfirm={handleConfirmSelection}
          onCancel={handleCancelSelection}
        />
      </div>
    </div>
  );
};

export default CourtSelectionScreen;
