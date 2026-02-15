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
import TournamentConfirmModal from './success/TournamentConfirmModal.jsx';
import BallPurchaseModal from './success/BallPurchaseModal.jsx';
import WaitlistSuccess from './success/WaitlistSuccess.jsx';
import CourtAssignmentSuccess from './success/CourtAssignmentSuccess.jsx';
import useBallPurchase from './success/useBallPurchase.js';
import SuccessCard from './success/SuccessCard.jsx';

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

  // Ball purchase state and handler
  const {
    showBallPurchaseModal,
    setShowBallPurchaseModal,
    ballPurchaseOption,
    setBallPurchaseOption,
    ballsPurchased,
    purchaseDetails,
    isProcessingPurchase,
    handleBallPurchase,
  } = useBallPurchase({
    ballPrice,
    splitPrice,
    currentGroup,
    justAssignedCourt,
    sessionIdProp,
    assignedCourt,
    onPurchaseBalls,
    onLookupMemberAccount,
    getLastFourDigits,
  });

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
    const { mainContent: courtMainContent, footerContent: courtFooterContent } =
      CourtAssignmentSuccess({
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
        onOpenBallPurchase: () => {
          setShowBallPurchaseModal(true);
          if (nonGuestPlayers === 1) {
            setBallPurchaseOption('charge');
          }
        },
        onOpenTournamentConfirm: () => setShowTournamentConfirm(true),
        // Utilities
        getCourtBlockStatus,
      });

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
  const waitlistMainContent = WaitlistSuccess({ position, estimatedWait });

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
