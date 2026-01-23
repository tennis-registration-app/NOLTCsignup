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
 * - onNewRegistration: () => void - New registration handler
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
 */
import React, { useState, useCallback } from 'react';
import { getUpcomingBlockWarningFromBlocks } from '@lib';
import { Check } from '../components';

// Fixed layout card component (internal)
const SuccessCard = ({ headerContent, mainContent, footerContent }) => (
  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[80vh] overflow-y-auto h-auto md:h-[550px]">
    {/* Fixed header area - only render if headerContent exists */}
    {headerContent && (
      <div className="h-auto md:h-20 bg-gray-200 rounded-t-3xl p-4">{headerContent}</div>
    )}

    {/* Fixed main content area - auto height on mobile, 310px on desktop */}
    <div className="h-auto md:h-[310px] p-6 sm:p-8 flex flex-col justify-center">{mainContent}</div>

    {/* Fixed footer area - auto height on mobile, 160px on desktop */}
    <div className="h-auto md:h-[160px] px-6 sm:px-8 pb-6 sm:pb-8">
      {footerContent || <div className="h-full" />}
    </div>
  </div>
);

const SuccessScreen = ({
  isCourtAssignment,
  justAssignedCourt,
  assignedCourt,
  sessionId: sessionIdProp, // Direct session ID from assignment (preferred)
  replacedGroup,
  canChangeCourt,
  changeTimeRemaining,
  position,
  estimatedWait,
  onChangeCourt,
  onNewRegistration,
  onHome,
  currentGroup,
  mobileCountdown,
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
}) => {
  const [showBallPurchaseModal, setShowBallPurchaseModal] = useState(false);
  const [ballPurchaseOption, setBallPurchaseOption] = useState('');
  const [ballsPurchased, setBallsPurchased] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);

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
    try {
      // Debug: Log all session ID sources at start
      console.log('[Ball Purchase] Handler called', {
        sessionIdProp,
        assignedCourtSessionId: assignedCourt?.session?.id,
        primaryAccountId: currentGroup[0]?.accountId,
      });
      console.log('[handleBallPurchase] Starting purchase process:', {
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
      let primaryAccountId = currentGroup[0]?.accountId || currentGroup[0]?.account_id;

      // If no accountId in currentGroup, try to look it up by member number
      if (!primaryAccountId && onLookupMemberAccount && currentGroup[0]?.memberNumber) {
        try {
          const memberNumber = currentGroup[0].memberNumber;
          const members = (await onLookupMemberAccount(memberNumber)) || [];
          if (members.length > 0) {
            const member = members.find((m) => m.is_primary || m.isPrimary) || members[0];
            primaryAccountId = member.account_id || member.accountId;
            console.log('[handleBallPurchase] Found accountId by member lookup:', primaryAccountId);
          }
        } catch (e) {
          console.warn('[handleBallPurchase] Member lookup failed:', e);
        }
      }

      if (onPurchaseBalls && sessionId && primaryAccountId) {
        console.log('[handleBallPurchase] Using TennisBackend for purchase', {
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
            let accountId = player.accountId || player.account_id;

            // If not, look it up
            if (!accountId && onLookupMemberAccount && player.memberNumber) {
              try {
                const members = await onLookupMemberAccount(player.memberNumber);
                if (members.length > 0) {
                  const member = members.find((m) => m.is_primary || m.isPrimary) || members[0];
                  accountId = member.account_id || member.accountId;
                }
              } catch (err) {
                console.error('Failed to lookup account for split:', player.memberNumber, err);
              }
            }

            if (accountId) {
              splitAccountIds.push(accountId);
            }
          }

          // If we couldn't get all account IDs, fall back to non-split
          if (splitAccountIds.length < 2) {
            console.warn(
              'Could not get enough account IDs for split, falling back to single charge'
            );
            splitAccountIds = null;
          }
        }

        console.log('[Ball Purchase] Calling onPurchaseBalls', {
          sessionId,
          primaryAccountId,
          options: { splitBalls: isSplit, splitAccountIds },
        });
        const result = await onPurchaseBalls(sessionId, primaryAccountId, {
          splitBalls: isSplit,
          splitAccountIds: splitAccountIds,
        });
        console.log('[Ball Purchase] API result', result);

        if (result.ok) {
          console.log('[handleBallPurchase] Ball purchase successful:', result);
          setBallsPurchased(true);
          setShowBallPurchaseModal(false);
          return;
        } else {
          console.error('[handleBallPurchase] Ball purchase failed:', result.message);
        }
      } else {
        console.log('[handleBallPurchase] Cannot purchase balls - missing data:', {
          hasOnPurchaseBalls: !!onPurchaseBalls,
          sessionId,
          primaryAccountId,
        });
      }

      // Fallback to localStorage if API not available or failed
      console.log('[Ball Purchase] FALLBACK to localStorage - API not available');
      console.log('[handleBallPurchase] Using localStorage fallback');

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

      console.log('[handleBallPurchase] Purchase object:', purchase);

      // Get existing purchases and save
      let existingPurchases = [];
      if (window.Tennis?.DataStore) {
        existingPurchases = (await window.Tennis.DataStore.get('tennisBallPurchases')) || [];
        existingPurchases.push(purchase);
        await window.Tennis.DataStore.set('tennisBallPurchases', existingPurchases, {
          immediate: true,
        });
      } else {
        try {
          const stored = localStorage.getItem('tennisBallPurchases');
          existingPurchases = stored ? JSON.parse(stored) : [];
          existingPurchases.push(purchase);
          localStorage.setItem('tennisBallPurchases', JSON.stringify(existingPurchases));
        } catch (error) {
          console.error('[handleBallPurchase] Error saving to localStorage:', error);
        }
      }

      console.log('[handleBallPurchase] Purchase saved successfully');

      setBallsPurchased(true);
      setShowBallPurchaseModal(false);
    } catch (error) {
      console.error('[handleBallPurchase] Error processing purchase:', error);
    }
  }, [
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
  const isMobileFlow = window.__mobileFlow || window.__wasMobileFlow || window.top !== window.self;
  console.log(
    'SUCCESS SCREEN DEBUG - Mobile Flow:',
    window.__mobileFlow,
    'Was Mobile:',
    window.__wasMobileFlow,
    'Is Embedded:',
    window.top !== window.self,
    'Final:',
    isMobileFlow
  );

  const headerContent = isMobileFlow ? null : (
    <div className="flex justify-between items-center h-full">
      <button
        onClick={onHome}
        className="bg-gray-400 text-white px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-medium hover:bg-gray-500 transition-colors duration-150"
      >
        Home
      </button>
      <button
        onClick={onNewRegistration}
        className="bg-green-500 text-white px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-medium hover:bg-green-600 transition-colors duration-150"
      >
        New Registration
      </button>
    </div>
  );

  if (isCourtAssignment) {
    // Court assignment main content
    const courtMainContent = (
      <>
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 sm:mb-3">
            <Check size={32} className="text-white sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Confirmed!
          </h1>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 sm:p-6 text-center">
          <p className="text-lg sm:text-xl text-gray-700 mb-2">You're all set on</p>
          <p
            className="text-2xl sm:text-3xl font-bold text-green-600"
            data-testid="reg-assigned-court"
          >
            Court {justAssignedCourt}
          </p>
          {assignedCourt && (
            <>
              <p className="text-base sm:text-lg text-gray-600 mt-3">
                Priority until{' '}
                <strong>
                  {new Date(
                    assignedCourt.session?.scheduledEndAt || assignedCourt.endTime
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </p>
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
                  assignedCourt.session?.scheduledEndAt || assignedCourt.endTime
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
      <div className="bg-yellow-50 rounded-2xl p-3 sm:p-4 h-full flex items-center">
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
      </div>
    ) : (
      <div className="bg-green-50 rounded-2xl p-3 sm:p-4 h-full flex items-center justify-center">
        <div>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1">
            <Check size={16} className="text-green-600 sm:w-5 sm:h-5" />
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

        {/* Ball Purchase Modal */}
        {showBallPurchaseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[420px] mx-4">
              <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">
                Purchase Tennis Balls
              </h3>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <label
                  className={`block p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    ballPurchaseOption === 'charge'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="ballOption"
                    value="charge"
                    checked={ballPurchaseOption === 'charge'}
                    onChange={(e) => setBallPurchaseOption(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm sm:text-base">Charge to account</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Account ending in {getLastFourDigits(currentGroup[0]?.memberNumber)}
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl font-bold">${ballPrice.toFixed(2)}</p>
                  </div>
                </label>

                {currentGroup.filter((p) => !p.isGuest).length > 1 && (
                  <label
                    className={`block p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      ballPurchaseOption === 'split'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ballOption"
                      value="split"
                      checked={ballPurchaseOption === 'split'}
                      onChange={(e) => setBallPurchaseOption(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm sm:text-base">Split the balls</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          ${splitPrice.toFixed(2)} per player (
                          {currentGroup.filter((p) => !p.isGuest).length} players)
                        </p>
                      </div>
                      <p className="text-lg sm:text-xl font-bold">${splitPrice.toFixed(2)} each</p>
                    </div>
                  </label>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleBallPurchase}
                  disabled={!ballPurchaseOption}
                  className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium transition-colors text-sm sm:text-base ${
                    ballPurchaseOption
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-blue-200 text-blue-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Purchase
                </button>
                <button
                  onClick={() => {
                    setShowBallPurchaseModal(false);
                    setBallPurchaseOption('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium hover:bg-gray-300 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Waitlist success screen
  const waitlistMainContent = (
    <>
      <div className="flex flex-col items-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 sm:mb-3">
          <Check size={32} className="text-white sm:w-10 sm:h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent text-center">
          You're on the list!
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
