/**
 * CourtSelectionScreen Component
 *
 * Court picker grid showing available courts.
 * Handles block warnings for courts with upcoming reservations.
 *
 * Props:
 * - availableCourts: number[] - Array of available court numbers
 * - showingOvertimeCourts: boolean - Whether showing overtime courts
 * - hasWaitingGroups: boolean - Whether there are groups waiting
 * - waitingGroupsCount: number - Number of groups waiting
 * - onCourtSelect: (courtNumber: number) => void - Court selection handler
 * - onJoinWaitlist: () => void - Join waitlist handler
 * - onAssignNext: () => void - Assign next handler
 * - onGoBack: () => void - Go back handler
 * - onStartOver: () => void - Start over handler
 * - currentGroup: Player[] - Current group to determine session duration
 * - isMobileView: boolean - Whether in mobile view
 * - getUpcomingBlockWarning: (courtNumber, duration) => Warning | null - Block warning checker
 */
import React, { useState } from 'react';
import BlockWarningModal from '../modals/BlockWarningModal.jsx';

const CourtSelectionScreen = ({
  availableCourts,
  showingOvertimeCourts,
  hasWaitingGroups,
  waitingGroupsCount,
  onCourtSelect,
  onJoinWaitlist,
  onAssignNext,
  onGoBack,
  onStartOver,
  currentGroup = [],
  isMobileView = false,
  getUpcomingBlockWarning
}) => {
  const [blockWarning, setBlockWarning] = useState(null);
  const [pendingCourtNumber, setPendingCourtNumber] = useState(null);

  // Determine session duration based on group size
  const getSessionDuration = (group) => {
    const playerCount = group?.length || 0;
    return playerCount >= 4 ? 90 : 60; // 90 minutes for doubles (4+ players), 60 for singles
  };

  // Handle court selection with block checking
  const handleCourtClick = (courtNumber) => {
    const duration = getSessionDuration(currentGroup);
    const warning = getUpcomingBlockWarning(courtNumber, duration);

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
      // No block issues - proceed normally
      onCourtSelect(courtNumber);
    }
  };

  // Confirm selection despite limited time
  const handleConfirmSelection = () => {
    if (pendingCourtNumber) {
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
    return getUpcomingBlockWarning(courtNumber, duration);
  };

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl relative">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Select Your Court
        </h2>

        {showingOvertimeCourts && (
          <p className="text-center text-gray-600 mb-4 text-sm sm:text-base">
            All courts are occupied. You may claim an overtime court.
          </p>
        )}


        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-16 sm:mb-20">
          {availableCourts.map(courtNum => {
            const warningInfo = getCourtWarningInfo(courtNum);
            const hasUpcomingBlock = warningInfo && warningInfo.minutesUntilBlock < 60;

            return (
              <button
                key={courtNum}
                onClick={() => handleCourtClick(courtNum)}
                className={`relative p-6 sm:p-8 rounded-xl text-xl sm:text-2xl font-bold text-white transition-all transform shadow-lg ${
                  showingOvertimeCourts
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    : "bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600"
                } hover:scale-105`}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>Court {courtNum}</span>

                  {/* Show upcoming block warning as simple yellow text when within 60 minutes */}
                  {hasUpcomingBlock && (
                    <div className="absolute bottom-2 left-2 right-2 text-yellow-300 text-xs text-center font-normal">
                      {warningInfo.reason} starting in {warningInfo.minutesUntilBlock}m
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>



        <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex justify-between">
          <button
            onClick={onGoBack}
            className="bg-gray-300 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-gray-400 transition-colors"
          >
            {isMobileView ? 'Back' : 'Go Back'}
          </button>

          <button
            onClick={onStartOver}
            className="bg-red-500 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-base sm:text-lg hover:bg-red-600 transition-colors"
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
