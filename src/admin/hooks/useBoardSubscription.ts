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
import { logger } from '../../lib/logger';
import { transformBoardUpdate } from './boardSubscriptionLogic';
import type { RawBoard } from './boardSubscriptionLogic';
import type { TennisBackendShape } from '../../types/appTypes';

/**
 * Hook for managing board subscription state and realtime updates.
 *
 * @param {Object} deps - External dependencies
 * @param {Object} deps.backend - Backend API client with queries.subscribeToBoardChanges
 * @returns {Object} Board state and operations
 */
interface WaitlistEntry { id?: unknown; position?: unknown; groupType?: unknown; joinedAt?: unknown; minutesWaiting?: unknown; names?: unknown[]; players?: unknown[]; raw?: unknown; }
interface CourtBlock { id?: string; courtId?: string; courtNumber?: number; reason?: string; blockType?: string; startTime?: string; endTime?: string; }

interface UseBoardSubscriptionDeps {
  backend: TennisBackendShape;
}

export function useBoardSubscription(deps: UseBoardSubscriptionDeps) {
  const { backend } = deps;

  // State owned by this hook
  const [courts, setCourts] = useState<unknown[]>([]);
  const [waitingGroups, setWaitingGroups] = useState<WaitlistEntry[]>([]);
  const [courtBlocks, setCourtBlocks] = useState<CourtBlock[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Ref to track blocks fingerprint for detecting actual changes
  const lastBlocksFingerprintRef = useRef('');

  // Named command for bumping refresh trigger (not raw setter)
  const bumpRefreshTrigger = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Shared board update handler — used by both subscription and manual refresh
  const applyBoardUpdate = useCallback((board: unknown) => {
    const result = transformBoardUpdate(board as RawBoard | null | undefined, lastBlocksFingerprintRef.current);

    setCourts(result.courts);
    setWaitingGroups(result.waitingGroups);
    setCourtBlocks(result.courtBlocks);

    if (result.shouldBumpRefreshTrigger) {
      lastBlocksFingerprintRef.current = result.newFingerprint;
      setRefreshTrigger((prev) => prev + 1);
      logger.debug('AdminApp', 'Blocks changed, triggering calendar refresh');
    }
  }, []);

  // On-demand board refresh — call after admin mutations for instant UI update
  const refreshBoard = useCallback(async () => {
    try {
      const board = await backend.queries.getBoard();
      if (board) applyBoardUpdate(board);
    } catch (error) {
      logger.error('AdminApp', 'Manual board refresh failed', error);
    }
  }, [backend, applyBoardUpdate]);

  // Subscribe to TennisBackend realtime updates for courts/waitlist
  // IMPORTANT: Dependency array is [] (mount only) - preserved from original
  useEffect(() => {
    logger.debug('AdminApp', 'Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges(
      (board) => {
        logger.debug('AdminApp', 'Board update received', {
          serverNow: board?.serverNow,
          courts: board?.courts?.length,
        });

        if (board) {
          applyBoardUpdate(board);
        }
      },
      { pollIntervalMs: 3000 }
    );

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
    refreshBoard,
    applyBoardUpdate,
  };
}

export default useBoardSubscription;
