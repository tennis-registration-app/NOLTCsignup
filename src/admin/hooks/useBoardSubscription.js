/**
 * @fileoverview React hook for board subscription management.
 * Thin wrapper around pure logic in boardSubscriptionLogic.js.
 *
 * This hook owns all board-related state:
 * - courts
 * - waitingGroups
 * - courtBlocks
 * - refreshTrigger
 *
 * Contains the subscription effect that listens for realtime board updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../lib/logger.js';
import { transformBoardUpdate } from './boardSubscriptionLogic.js';

/**
 * Hook for managing board subscription state and realtime updates.
 *
 * @param {Object} deps - External dependencies
 * @param {Object} deps.backend - Backend API client with queries.subscribeToBoardChanges
 * @returns {Object} Board state and operations
 */
export function useBoardSubscription(deps) {
  const { backend } = deps;

  // State owned by this hook
  const [courts, setCourts] = useState([]);
  const [waitingGroups, setWaitingGroups] = useState([]);
  const [courtBlocks, setCourtBlocks] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Ref to track blocks fingerprint for detecting actual changes
  const lastBlocksFingerprintRef = useRef('');

  // Named command for bumping refresh trigger (not raw setter)
  const bumpRefreshTrigger = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Subscribe to TennisBackend realtime updates for courts/waitlist
  // IMPORTANT: Dependency array is [] (mount only) - preserved from original
  useEffect(() => {
    logger.debug('AdminApp', 'Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges((board) => {
      logger.debug('AdminApp', 'Board update received', {
        serverNow: board?.serverNow,
        courts: board?.courts?.length,
      });

      if (board) {
        // Use pure transform function
        const result = transformBoardUpdate(board, lastBlocksFingerprintRef.current);

        // Update state
        setCourts(result.courts);
        setWaitingGroups(result.waitingGroups);
        setCourtBlocks(result.courtBlocks);

        // Update fingerprint ref and bump refresh trigger if blocks changed
        if (result.shouldBumpRefreshTrigger) {
          lastBlocksFingerprintRef.current = result.newFingerprint;
          setRefreshTrigger((prev) => prev + 1);
          logger.debug('AdminApp', 'Blocks changed, triggering calendar refresh');
        }
      }
    });

    return () => {
      logger.debug('AdminApp', 'Cleaning up TennisBackend subscription');
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Intentional: mount-only subscription, backend is stable singleton

  return {
    // State
    courts,
    waitingGroups,
    courtBlocks,
    refreshTrigger,
    // Commands (named, not raw setters)
    bumpRefreshTrigger,
  };
}

export default useBoardSubscription;
