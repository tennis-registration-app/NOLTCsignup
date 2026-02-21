// @ts-check
import { useState, useCallback } from 'react';
import { getDataStore } from '../../../lib/TennisCourtDataStore.js';
import { logger } from '../../../lib/logger.js';
import { getCache, setCache } from '../../../platform/prefsStorage.js';

/**
 * useBallPurchase - Hook for managing ball purchase state and logic
 * @param {Object} params
 * @param {number} params.ballPrice - Ball price in dollars
 * @param {number} params.splitPrice - Split price per player
 * @param {Array} params.currentGroup - Current group of players
 * @param {number} params.justAssignedCourt - Court number assigned
 * @param {string} params.sessionIdProp - Direct session ID from assignment
 * @param {Object} params.assignedCourt - Assigned court object
 * @param {function} params.onPurchaseBalls - Ball purchase handler
 * @param {function} params.onLookupMemberAccount - Member lookup handler
 * @param {function} params.getLastFourDigits - Helper to get last 4 digits of member number
 */
const useBallPurchase = ({
  ballPrice,
  splitPrice,
  currentGroup,
  justAssignedCourt,
  sessionIdProp,
  assignedCourt,
  onPurchaseBalls,
  onLookupMemberAccount,
  getLastFourDigits,
}) => {
  const [showBallPurchaseModal, setShowBallPurchaseModal] = useState(false);
  const [ballPurchaseOption, setBallPurchaseOption] = useState('');
  const [ballsPurchased, setBallsPurchased] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

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
      const dataStore = getDataStore();
      const dataStoreResult = await dataStore?.get?.('tennisBallPurchases');
      if (dataStoreResult !== undefined) {
        existingPurchases = dataStoreResult || [];
        existingPurchases.push(purchase);
        await dataStore?.set?.('tennisBallPurchases', existingPurchases, {
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

  return {
    showBallPurchaseModal,
    setShowBallPurchaseModal,
    ballPurchaseOption,
    setBallPurchaseOption,
    ballsPurchased,
    purchaseDetails,
    isProcessingPurchase,
    handleBallPurchase,
  };
};

export default useBallPurchase;
