// @ts-check
import React from 'react';
import { getUpcomingBlockWarningFromBlocks } from '@lib';
import { Check } from '../../components';
import { TypedIcon } from '../../../components/icons/TypedIcon';

/**
 * CourtAssignmentSuccess - Court assignment success content
 * @param {Object} props
 */
const CourtAssignmentSuccess = ({
  // Data
  justAssignedCourt,
  assignedCourt,
  assignedEndTime,
  replacedGroup,
  upcomingBlocks,
  blockWarningMinutes,
  registrantStreak,
  // State
  isTournament,
  isTimeLimited,
  timeLimitReason,
  // Ball purchase
  ballsPurchased,
  purchaseDetails,
  ballPrice,
  splitPrice,
  // Handlers
  canChangeCourt,
  changeTimeRemaining,
  isMobile,
  onChangeCourt,
  onOpenBallPurchase,
  onOpenTournamentConfirm,
  // Utilities
  getCourtBlockStatus,
}) => {
  // Court assignment main content
  const courtMainContent = (
    <>
      <div className="flex flex-col items-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 sm:mb-3">
          <TypedIcon icon={Check} size={32} className="text-white sm:w-10 sm:h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
          Confirmed!
        </h1>
      </div>
      <div className="bg-green-50 rounded-2xl p-4 sm:p-6 text-center">
        <p className="text-lg sm:text-xl text-gray-700 mb-2">You&apos;re all set on</p>
        <p
          className="text-2xl sm:text-3xl font-bold text-green-600"
          data-testid="reg-assigned-court"
        >
          Court {justAssignedCourt}
        </p>
        {assignedCourt &&
          (assignedEndTime || assignedCourt.session?.scheduledEndAt || assignedCourt.endTime) && (
            <>
              {isTournament ? (
                <div
                  data-testid="tournament-badge"
                  className="mt-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center"
                >
                  <span className="text-sm font-semibold text-blue-700">
                    ✓ Tournament Match — plays until completion
                  </span>
                </div>
              ) : (
                <p data-testid="priority-until" className="text-base sm:text-lg text-gray-600 mt-3">
                  Priority until{' '}
                  <strong>
                    {new Date(
                      assignedEndTime ||
                        assignedCourt.session?.scheduledEndAt ||
                        assignedCourt.endTime
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </p>
              )}
              {isTimeLimited && (
                <p className="text-sm text-gray-500 mt-1">
                  {timeLimitReason === 'rereg'
                    ? '(Remaining time from previous session)'
                    : '(Time limited due to upcoming court reservation)'}
                </p>
              )}

              {/* Upcoming block warning */}
              {(() => {
                const upcomingWarning = getUpcomingBlockWarningFromBlocks(
                  justAssignedCourt,
                  0,
                  upcomingBlocks
                );
                if (!upcomingWarning || upcomingWarning.minutesUntilBlock >= blockWarningMinutes)
                  return null;
                return (
                  <p className="text-sm text-orange-500 mt-2">
                    Note: Court reserved for {upcomingWarning.reason} at{' '}
                    {new Date(upcomingWarning.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                );
              })()}

              {(() => {
                const courtBlockStatus = getCourtBlockStatus(justAssignedCourt);
                const sessionEndTime = new Date(
                  assignedEndTime || assignedCourt.session?.scheduledEndAt || assignedCourt.endTime
                );

                return courtBlockStatus &&
                  courtBlockStatus.isBlocked &&
                  new Date(courtBlockStatus.startTime) <= sessionEndTime ? (
                  <span className="text-orange-600 ml-2 block sm:inline">
                    (Limited due to {courtBlockStatus.reason})
                  </span>
                ) : null;
              })()}
              {replacedGroup && replacedGroup.players && replacedGroup.players.length > 0 && (
                <p className="text-xs sm:text-sm text-orange-600 font-medium mt-2">
                  Please courteously request {replacedGroup.players[0].name} and partners conclude
                  their play
                </p>
              )}
              {/* Uncleared session warning for streak 1-2 */}
              {registrantStreak >= 1 && registrantStreak <= 2 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 mx-4">
                  <p className="text-amber-800 text-base">
                    ⚠️{' '}
                    {registrantStreak === 1
                      ? "Your last session was ended without using 'Clear Court'."
                      : `Your last ${registrantStreak} sessions were ended without using 'Clear Court'.`}{' '}
                    Please tap Clear Court when you finish this session so others can get on faster.
                  </p>
                </div>
              )}
            </>
          )}
      </div>
    </>
  );

  // Court assignment footer content
  const courtFooterContent = !ballsPurchased ? (
    <div className="bg-yellow-50 rounded-2xl p-3 sm:p-4 h-full flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
        {canChangeCourt && changeTimeRemaining > 0 && !isMobile && window.top === window.self && (
          <button
            onClick={onChangeCourt}
            className="flex-1 bg-blue-100 text-blue-700 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium hover:bg-blue-200 transition-colors duration-150"
          >
            Change Court <span className="text-black">{changeTimeRemaining}</span>
          </button>
        )}
        <button
          onClick={onOpenBallPurchase}
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium hover:from-amber-600 hover:to-amber-500 transition-colors duration-150 flex items-center justify-center gap-2 shadow-md"
        >
          <span className="text-lg sm:text-xl">🎾</span>
          <span>Add Balls</span>
        </button>
      </div>
      {!isTournament && (
        <div className="mt-3 text-left">
          <button
            data-testid="tournament-match-link"
            onClick={onOpenTournamentConfirm}
            className="text-lg font-medium underline decoration-1 underline-offset-2"
            style={{
              color: '#7a9aba',
              textDecorationColor: 'rgba(122,154,186,0.4)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Tournament match?
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="bg-green-50 rounded-2xl p-3 sm:p-4 h-full flex items-center justify-center">
      <div>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
          <TypedIcon icon={Check} size={16} className="text-green-600 sm:w-5 sm:h-5" />
          <p className="text-sm sm:text-base font-medium text-green-800">
            Balls Added: $
            {purchaseDetails.type === 'single'
              ? ballPrice.toFixed(2)
              : `${splitPrice.toFixed(2)} each`}
          </p>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 text-center">
          Charged to account{purchaseDetails.accounts.length > 1 ? 's' : ''}:{' '}
          {purchaseDetails.accounts.join(', ')}
        </p>
      </div>
    </div>
  );

  return { mainContent: courtMainContent, footerContent: courtFooterContent };
};

export default CourtAssignmentSuccess;
