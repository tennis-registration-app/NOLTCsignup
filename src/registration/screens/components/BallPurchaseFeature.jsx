import React, { useState, useCallback } from 'react';
import { Check } from '../../components';

// Direct ESM import for DataStore
import { getDataStore } from '../../../lib/TennisCourtDataStore.js';
import { getCache, setCache } from '../../../platform/prefsStorage.js';
import { logger } from '../../../lib/logger.js';

/**
 * BallPurchaseFeature
 *
 * Extracted from SuccessScreen.jsx
 * Complete ball purchase feature including state, handler, and modal UI.
 *
 * @param {Object} props
 * @param {Object} props.data - Data needed for ball purchase
 * @param {Object} props.handlers - Callbacks to parent
 */
function BallPurchaseFeature({ data, handlers }) {
  // Destructure data
  const {
    ballPrice,
    splitPrice,
    currentGroup,
    justAssignedCourt,
    assignedCourt,
    sessionIdProp,
    nonGuestPlayers,
  } = data;

  // Destructure handlers
  const { onPurchaseBalls, onLookupMemberAccount } = handlers;

  // ============================================
  // STATE - PASTE ALL 5 useState VERBATIM
  // ============================================
  const [showBallPurchaseModal, setShowBallPurchaseModal] = useState(false);
  const [ballPurchaseOption, setBallPurchaseOption] = useState('');
  const [ballsPurchased, setBallsPurchased] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

  // Get member's last 4 digits
  const getLastFourDigits = useCallback((memberNumber) => {
    if (!memberNumber) return '****';
    const str = String(memberNumber);
    return str.length >= 4 ? str.slice(-4) : str.padStart(4, '0');
  }, []);

  // ============================================
  // HANDLER - PASTE handleBallPurchase VERBATIM
  // Including the EXACT dependency array
  // ============================================
  const handleBallPurchase = useCallback(async () => {
    if (isProcessingPurchase) {
      logger.warn('Ball Purchase', 'Purchase already in progress, ignoring duplicate request');
      return;
    }
    setIsProcessingPurchase(true);
    try {
      // Debug: Log all session ID sources at start
      logger.debug('Ball Purchase', 'Handler called', {
        sessionIdProp,
        assignedCourtSessionId: assignedCourt?.session?.id,
        primaryAccountId: currentGroup[0]?.accountId,
      });
      logger.debug('Ball Purchase', 'Starting purchase process:', {
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
            logger.debug('Ball Purchase', 'Found accountId by member lookup:', primaryAccountId);
          }
        } catch (e) {
          console.warn('[handleBallPurchase] Member lookup failed:', e);
        }
      }

      if (onPurchaseBalls && sessionId && primaryAccountId) {
        logger.debug('Ball Purchase', 'Using TennisBackend for purchase', {
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

        logger.debug('Ball Purchase', 'Calling onPurchaseBalls', {
          sessionId,
          primaryAccountId,
          options: { splitBalls: isSplit, splitAccountIds },
        });
        const result = await onPurchaseBalls(sessionId, primaryAccountId, {
          splitBalls: isSplit,
          splitAccountIds: splitAccountIds,
        });
        logger.debug('Ball Purchase', 'API result', result);

        if (result.ok) {
          logger.info('Ball Purchase', 'Ball purchase successful:', result);
          setBallsPurchased(true);
          setShowBallPurchaseModal(false);
          return;
        } else {
          console.error('[handleBallPurchase] Ball purchase failed:', result.message);
        }
      } else {
        logger.warn('Ball Purchase', 'Cannot purchase balls - missing data:', {
          hasOnPurchaseBalls: !!onPurchaseBalls,
          sessionId,
          primaryAccountId,
        });
      }

      // Fallback to localStorage if API not available or failed
      logger.warn('Ball Purchase', 'FALLBACK to localStorage - API not available');

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

      logger.debug('Ball Purchase', 'Purchase object:', purchase);

      // Get existing purchases and save
      let existingPurchases = [];
      const DataStore = getDataStore();
      if (DataStore) {
        existingPurchases = (await DataStore.get('tennisBallPurchases')) || [];
        existingPurchases.push(purchase);
        await DataStore.set('tennisBallPurchases', existingPurchases, {
          immediate: true,
        });
      } else {
        try {
          existingPurchases = getCache('ballPurchases') || [];
          existingPurchases.push(purchase);
          setCache('ballPurchases', existingPurchases);
        } catch (error) {
          console.error('[handleBallPurchase] Error saving to cache:', error);
        }
      }

      logger.info('Ball Purchase', 'Purchase saved successfully');

      setBallsPurchased(true);
      setShowBallPurchaseModal(false);
    } catch (error) {
      console.error('[handleBallPurchase] Error processing purchase:', error);
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

  // ============================================
  // JSX - Ball purchase trigger button, confirmation, and modal
  // ============================================
  return (
    <>
      {/* Ball Purchase Trigger/Confirmation in Footer */}
      {!ballsPurchased ? (
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
      ) : (
        <div className="flex-1 bg-green-50 rounded-2xl p-3 sm:p-4 flex items-center justify-center">
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
      )}

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
                disabled={!ballPurchaseOption || isProcessingPurchase}
                className={`relative overflow-visible flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-medium transition-colors text-sm sm:text-base ${
                  !ballPurchaseOption || isProcessingPurchase
                    ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isProcessingPurchase ? 'Processing...' : 'Confirm Purchase'}
                {isProcessingPurchase && (
                  <svg
                    className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <style>
                      {`
                        @keyframes dash-move-purchase {
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
                      rx="50"
                      ry="50"
                      fill="none"
                      stroke="white"
                      strokeOpacity="0.6"
                      strokeWidth="2"
                      strokeDasharray="60 80"
                      style={{ animation: 'dash-move-purchase 1s linear infinite' }}
                    />
                  </svg>
                )}
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
    </>
  );
}

export default BallPurchaseFeature;
