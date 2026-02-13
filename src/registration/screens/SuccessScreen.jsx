// @ts-check
/**
 * SuccessScreen Component
 *
 * Success view displayed after registration.
 * Shows court assignment confirmation or waitlist position.
 * Includes ball purchase functionality.
 *
 * Props:
 * - isCourtAssignment: boolean - Whether this is a court assignment (vs waitlist)
 * - justAssignedCourt: number - Court number just assigned
 * - assignedCourt: object - Court assignment details (from state, may not have session.id immediately)
 * - sessionId: string - Session ID from assignment result (preferred for ball purchases)
 * - replacedGroup: object - Previous group that was replaced (if any)
 * - canChangeCourt: boolean - Whether court can be changed
 * - changeTimeRemaining: number - Seconds remaining to change court
 * - position: number - Waitlist position
 * - estimatedWait: number - Estimated wait time in minutes
 * - onChangeCourt: () => void - Change court handler
 * - onHome: () => void - Home handler
 * - currentGroup: Player[] - Current group for ball purchase
 * - mobileCountdown: number | null - Mobile auto-close countdown
 * - isMobile: boolean - Whether in mobile mode
 * - isTimeLimited: boolean - Whether time was limited due to block
 * - ballPriceCents: number - Ball price in cents from API
 * - onPurchaseBalls: (sessionId, accountId, options) => Promise - Ball purchase handler
 * - onLookupMemberAccount: (memberNumber) => Promise<Member[]> - Member lookup handler
 * - TENNIS_CONFIG: object - Tennis configuration constants
 * - getCourtBlockStatus: (courtNumber) => BlockStatus - Court block status checker
 * - upcomingBlocks: array - Upcoming block data for warning checks
 * - blockWarningMinutes: number - Minutes threshold for showing block warnings (default: 60)
 * - onUpdateSessionTournament: (sessionId, isTournament) => Promise - Tournament flag update handler
 */
import React, { useState, useCallback, useEffect } from 'react';
import { getUpcomingBlockWarningFromBlocks } from '@lib';
import { Check } from '../components';
import { TypedIcon } from '../../components/icons/TypedIcon';
import { getDataStoreValue, setDataStoreValue } from '../../platform/windowBridge';
import { logger } from '../../lib/logger.js';
import { getCache, setCache } from '../../platform/prefsStorage.js';
import TournamentConfirmModal from './success/TournamentConfirmModal.jsx';
import BallPurchaseModal from './success/BallPurchaseModal.jsx';

// Fixed layout card component (internal)
// Header is outside scroll container to avoid compositor hit-test bugs
const SuccessCard = ({ headerContent, mainContent, footerContent }) => (
  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col h-auto md:h-auto">
    {/* Fixed header area - outside scroll container, won't shrink */}
    {headerContent && (
      <div
        data-testid="success-header"
        className="flex-shrink-0 h-auto md:h-20 bg-gray-200 rounded-t-3xl p-4"
      >
        {headerContent}
      </div>
    )}

    {/* Scrollable content area */}
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Main content area */}
      <div data-testid="success-main" className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
        {mainContent}
      </div>

      {/* Footer area */}
      <div className="flex-shrink-0 h-auto md:h-[160px] px-6 sm:px-8 pb-6 sm:pb-8">
        {footerContent || <div className="h-full" />}
      </div>
    </div>
  </div>
);

const SuccessScreen = (
  /** @type {any} */ {
    isCourtAssignment,
    justAssignedCourt,
    assignedCourt,
    sessionId: sessionIdProp, // Direct session ID from assignment (preferred)
    assignedEndTime, // Direct end time from assignment (avoids Invalid Date flash)
    replacedGroup,
    canChangeCourt,
    changeTimeRemaining,
    position,
    estimatedWait,
    onChangeCourt,
    onHome,
    currentGroup,
    _mobileCountdown,
    isMobile = false,
    isTimeLimited = false,
    timeLimitReason = null,
    registrantStreak = 0,
    ballPriceCents,
    onPurchaseBalls,
    onLookupMemberAccount,
    TENNIS_CONFIG,
    getCourtBlockStatus,
    upcomingBlocks = [],
    blockWarningMinutes = 60,
    onUpdateSessionTournament,
  }
) => {
  const [showBallPurchaseModal, setShowBallPurchaseModal] = useState(false);
  const [ballPurchaseOption, setBallPurchaseOption] = useState('');
  const [ballsPurchased, setBallsPurchased] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [isTournament, setIsTournament] = useState(false);
  const [showTournamentConfirm, setShowTournamentConfirm] = useState(false);

  // Reset tournament state when session changes (e.g., after Change Court round trip)
  useEffect(() => {
    setIsTournament(false);
  }, [sessionIdProp]);

  // Ball price from API (passed as prop in cents, converted to dollars)
  const ballPrice = ballPriceCents ? ballPriceCents / 100 : TENNIS_CONFIG.PRICING.TENNIS_BALLS;

  const nonGuestPlayers = currentGroup.filter((p) => !p.isGuest).length;
  const splitPrice = nonGuestPlayers > 0 ? ballPrice / nonGuestPlayers : ballPrice;

  // Get member's last 4 digits
  const getLastFourDigits = useCallback((memberNumber) => {
    if (!memberNumber) return '****';
    const str = String(memberNumber);
    return str.length >= 4 ? str.slice(-4) : str.padStart(4, '0');
  }, []);

  const handleBallPurchase = useCallback(async () => {
    if (isProcessingPurchase) {
      logger.debug('SuccessScreen', 'Purchase already in progress, ignoring duplicate request');
      return;
    }
    setIsProcessingPurchase(true);
    try {
      // Debug: Log all session ID sources at start
      logger.debug('SuccessScreen', 'Ball Purchase handler called', {
        sessionIdProp,
        assignedCourtSessionId: assignedCourt?.session?.id,
        primaryAccountId: currentGroup[0]?.accountId,
      });
      logger.debug('SuccessScreen', 'Starting purchase process', {
        ballPurchaseOption,
        ballPrice,
        currentGroup,
      });

      // Calculate nonGuestPlayers fresh in the callback
      const currentNonGuestPlayers = currentGroup.filter((p) => !p.isGuest).length;
      const isSplit = ballPurchaseOption === 'split';

      // Set purchase details for UI
      if (ballPurchaseOption === 'charge') {
        setPurchaseDetails({
          type: 'single',
          amount: ballPrice,
          accounts: [getLastFourDigits(currentGroup[0]?.memberNumber)],
        });
      } else {
        setPurchaseDetails({
          type: 'split',
          amount: splitPrice,
          accounts: currentGroup
            .filter((p) => !p.isGuest)
            .map((p) => getLastFourDigits(p.memberNumber)),
        });
      }

      // Use TennisBackend for ball purchase
      // Prefer direct sessionId prop (from assignment result), fallback to assignedCourt.session.id (from state)
      const sessionId = sessionIdProp || assignedCourt?.session?.id;

      // Get account ID from multiple sources:
      // 1. currentGroup player's accountId (if enriched)
      // 2. Look up by member number using onLookupMemberAccount
      let primaryAccountId = currentGroup[0]?.accountId;

      // If no accountId in currentGroup, try to look it up by member number
      if (!primaryAccountId && onLookupMemberAccount && currentGroup[0]?.memberNumber) {
        try {
          const memberNumber = currentGroup[0].memberNumber;
          const members = (await onLookupMemberAccount(memberNumber)) || [];
          if (members.length > 0) {
            const member = members.find((m) => m.isPrimary) || members[0];
            primaryAccountId = member.accountId;
            logger.debug('SuccessScreen', 'Found accountId by member lookup', primaryAccountId);
          }
        } catch (e) {
          logger.warn('SuccessScreen', 'Member lookup failed', e);
        }
      }

      if (onPurchaseBalls && sessionId && primaryAccountId) {
        logger.debug('SuccessScreen', 'Using TennisBackend for purchase', {
          sessionId,
          primaryAccountId,
        });

        // Get account IDs for split purchase
        let splitAccountIds = null;
        if (isSplit && currentNonGuestPlayers > 1) {
          const nonGuestPlayers = currentGroup.filter((p) => !p.isGuest);
          splitAccountIds = [];

          for (const player of nonGuestPlayers) {
            // Check if player already has accountId
            let accountId = player.accountId;

            // If not, look it up
            if (!accountId && onLookupMemberAccount && player.memberNumber) {
              try {
                const members = await onLookupMemberAccount(player.memberNumber);
                if (members.length > 0) {
                  const member = members.find((m) => m.isPrimary) || members[0];
                  accountId = member.accountId;
                }
              } catch (err) {
                logger.error(
                  'SuccessScreen',
                  `Failed to lookup account for split: ${player.memberNumber}`,
                  err
                );
              }
            }

            if (accountId) {
              splitAccountIds.push(accountId);
            }
          }

          // If we couldn't get all account IDs, fall back to non-split
          if (splitAccountIds.length < 2) {
            logger.warn(
              'SuccessScreen',
              'Could not get enough account IDs for split, falling back to single charge'
            );
            splitAccountIds = null;
          }
        }

        logger.debug('SuccessScreen', 'Calling onPurchaseBalls', {
          sessionId,
          primaryAccountId,
          options: { splitBalls: isSplit, splitAccountIds },
        });
        const result = await onPurchaseBalls(sessionId, primaryAccountId, {
          splitBalls: isSplit,
          splitAccountIds: splitAccountIds,
        });
        logger.debug('SuccessScreen', 'API result', result);

        if (result.ok) {
          logger.debug('SuccessScreen', 'Ball purchase successful', result);
          setBallsPurchased(true);
          setShowBallPurchaseModal(false);
          return;
        } else {
          logger.error('SuccessScreen', 'Ball purchase failed', result.message);
        }
      } else {
        logger.debug('SuccessScreen', 'Cannot purchase balls - missing data', {
          hasOnPurchaseBalls: !!onPurchaseBalls,
          sessionId,
          primaryAccountId,
        });
      }

      // Fallback to localStorage if API not available or failed
      logger.debug('SuccessScreen', 'FALLBACK to localStorage - API not available');
      logger.debug('SuccessScreen', 'Using localStorage fallback');

      /** Return the raw member number for a player (never masked). */
      function getRawMemberNumber(p) {
        const n = p?.memberNumber ?? p?.memberNo ?? p?.member ?? p?.id ?? '';
        if (!n) return '';
        const s = String(n);
        if (/^\*+/.test(s)) {
          if (p.memberNumberRaw && !/^\*+/.test(String(p.memberNumberRaw)))
            return String(p.memberNumberRaw);
          if (p.originalMemberNumber && !/^\*+/.test(String(p.originalMemberNumber)))
            return String(p.originalMemberNumber);
          return '';
        }
        return s;
      }

      // Save purchase to localStorage
      const purchase = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: ballPurchaseOption,
        amount: ballPurchaseOption === 'charge' ? ballPrice : splitPrice,
        totalAmount:
          ballPurchaseOption === 'charge' ? ballPrice : splitPrice * currentNonGuestPlayers,
        players: (ballPurchaseOption === 'charge'
          ? [currentGroup[0]]
          : currentGroup.filter((p) => !p.isGuest)
        ).map((p) => ({
          name: p?.name ?? '',
          memberId: p?.memberId ?? p?.id ?? null,
          memberNumber: getRawMemberNumber(p),
          amount: ballPurchaseOption === 'charge' ? ballPrice : splitPrice,
        })),
        courtNumber: justAssignedCourt,
      };

      logger.debug('SuccessScreen', 'Purchase object', purchase);

      // Get existing purchases and save
      let existingPurchases = [];
      const dataStoreResult = await getDataStoreValue('tennisBallPurchases');
      if (dataStoreResult !== undefined) {
        existingPurchases = dataStoreResult || [];
        existingPurchases.push(purchase);
        await setDataStoreValue('tennisBallPurchases', existingPurchases, {
          immediate: true,
        });
      } else {
        try {
          existingPurchases = getCache('ballPurchases') || [];
          existingPurchases.push(purchase);
          setCache('ballPurchases', existingPurchases);
        } catch (error) {
          logger.error('SuccessScreen', 'Error saving to cache', error);
        }
      }

      logger.debug('SuccessScreen', 'Purchase saved successfully');

      setBallsPurchased(true);
      setShowBallPurchaseModal(false);
    } catch (error) {
      logger.error('SuccessScreen', 'Error processing purchase', error);
    } finally {
      setIsProcessingPurchase(false);
    }
  }, [
    isProcessingPurchase,
    ballPurchaseOption,
    ballPrice,
    currentGroup,
    justAssignedCourt,
    splitPrice,
    getLastFourDigits,
    assignedCourt,
    sessionIdProp,
    onPurchaseBalls,
    onLookupMemberAccount,
  ]);

  // Header content for both success types - hide for mobile flow
  // Use isMobile prop (React state) or fallback to iframe detection
  const isMobileFlow = isMobile || window.top !== window.self;

  const headerContent = isMobileFlow ? null : (
    <div className="flex justify-start items-center h-full">
      <button
        data-testid="success-home-btn"
        onClick={() => onHome()}
        className="bg-gray-400 text-white px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-medium hover:bg-gray-500 transition-colors duration-150"
      >
        Home
      </button>
    </div>
  );

  if (isCourtAssignment) {
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
                  <p
                    data-testid="priority-until"
                    className="text-base sm:text-lg text-gray-600 mt-3"
                  >
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
                    assignedEndTime ||
                      assignedCourt.session?.scheduledEndAt ||
                      assignedCourt.endTime
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
                      Please tap Clear Court when you finish this session so others can get on
                      faster.
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
            onClick={() => {
              setShowBallPurchaseModal(true);
              // Auto-select 'charge' if only one non-guest player
              if (nonGuestPlayers === 1) {
                setBallPurchaseOption('charge');
              }
            }}
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
              onClick={() => setShowTournamentConfirm(true)}
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

    return (
      <div
        className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center relative overflow-hidden p-4"
        data-testid="reg-success-screen"
      >
        <SuccessCard
          headerContent={headerContent}
          mainContent={courtMainContent}
          footerContent={courtFooterContent}
        />

        {/* Tournament Confirmation Modal */}
        {showTournamentConfirm && (
          <TournamentConfirmModal
            sessionId={sessionIdProp || assignedCourt?.session?.id}
            onUpdateSessionTournament={onUpdateSessionTournament}
            onConfirm={() => {
              setIsTournament(true);
              setShowTournamentConfirm(false);
            }}
            onClose={() => setShowTournamentConfirm(false)}
          />
        )}

        {/* Ball Purchase Modal */}
        {showBallPurchaseModal && (
          <BallPurchaseModal
            ballPrice={ballPrice}
            splitPrice={splitPrice}
            currentGroup={currentGroup}
            ballPurchaseOption={ballPurchaseOption}
            setBallPurchaseOption={setBallPurchaseOption}
            isProcessingPurchase={isProcessingPurchase}
            onConfirm={handleBallPurchase}
            onClose={() => {
              setShowBallPurchaseModal(false);
              setBallPurchaseOption('');
            }}
            getLastFourDigits={getLastFourDigits}
          />
        )}
      </div>
    );
  }

  // Waitlist success screen
  const waitlistMainContent = (
    <>
      <div className="flex flex-col items-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 sm:mb-3">
          <TypedIcon icon={Check} size={32} className="text-white sm:w-10 sm:h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent text-center">
          You&apos;re on the list!
        </h1>
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 text-center mb-4 sm:mb-6">
        <p className="text-base sm:text-lg text-gray-600 mb-2 sm:mb-3">
          Your group has been registered
        </p>
        {position > 2 ? (
          <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            There are <span className="text-blue-600">{position - 1} groups</span> ahead of you
          </p>
        ) : position === 2 ? (
          <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            There is <span className="text-blue-600">1 group</span> ahead of you
          </p>
        ) : (
          <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            You are <span className="text-green-600">next</span> in line!
          </p>
        )}

        {estimatedWait > 0 && (
          <p className="text-base sm:text-lg text-gray-600">
            Estimated wait: <span className="text-orange-600 font-bold">{estimatedWait} min</span>
          </p>
        )}
      </div>

      <p className="text-sm sm:text-base text-gray-500 text-center">
        Check the monitor for court updates
      </p>
    </>
  );

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <SuccessCard
        headerContent={headerContent}
        mainContent={waitlistMainContent}
        footerContent={null}
      />
    </div>
  );
};

export default SuccessScreen;
