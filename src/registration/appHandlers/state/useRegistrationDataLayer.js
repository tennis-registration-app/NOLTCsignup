import { useEffect, useCallback } from 'react';
import { getTennisService } from '../../services/index.js';
import { logger } from '../../../lib/logger.js';

/**
 * useRegistrationDataLayer
 * Extracted from useRegistrationAppState — WP5.9.6.3
 *
 * Owns real-time subscription and initial data loading callbacks.
 * Backend is a module-level singleton in the app; it is passed in here.
 * Verbatim extraction — no logic changes.
 */
export function useRegistrationDataLayer({
  backend,
  setData,
  setAvailableCourts,
  setOperatingHours,
  setApiMembers,
  data,
  computeRegistrationCourtSelection,
}) {
  // VERBATIM COPY: getDataService (lines 209-214)
  const getDataService = useCallback(() => {
    return getTennisService({
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      deviceType: 'kiosk',
    });
  }, []);

  // VERBATIM COPY: loadData (lines 217-257) INCLUDING eslint-disable + deps array
  const loadData = useCallback(async () => {
    try {
      const service = getDataService();
      const initialData = await service.loadInitialData();
      const courts = initialData.courts || [];
      const waitlist = initialData.waitlist || [];
      const updatedData = {
        courts: courts,
        waitlist: waitlist,
        recentlyCleared: data.recentlyCleared || [],
      };
      setData((prev) => ({ ...prev, ...updatedData }));
      if (initialData.operatingHours) {
        setOperatingHours(initialData.operatingHours);
      }
      if (initialData.members && Array.isArray(initialData.members)) {
        setApiMembers(initialData.members);
      }
      // Initial load doesn't have upcomingBlocks, pass empty array
      const selection = computeRegistrationCourtSelection(courts, []);
      const selectableNumbers = selection.selectableCourts.map((sc) => sc.number);
      setAvailableCourts(selectableNumbers);
      setData((prev) => ({ ...prev, courtSelection: selection }));
      logger.debug('DataLayer', 'Initial load complete', {
        waitlistLength: initialData.waitlist?.length,
      });
      return updatedData;
    } catch (error) {
      logger.error('DataLayer', 'Failed to load data', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-run when service ref changes, not on state updates
  }, [getDataService]);

  // VERBATIM COPY: subscription effect (lines 700-747) — KEEP [] DEPS EXACTLY
  useEffect(() => {
    logger.debug('DataLayer', '[TennisBackend] Setting up board subscription...');
    const unsubscribe = backend.queries.subscribeToBoardChanges(
      (domainBoard) => {
        const board = domainBoard;
        logger.debug('DataLayer', '[TennisBackend] Board update received', {
          serverNow: board.serverNow,
          courts: board.courts?.length,
          waitlist: board.waitlist?.length,
        });
        setData((prev) => ({
          ...prev,
          courts: board.courts || [],
          waitlist: board.waitlist || [],
          blocks: board.blocks || [],
          upcomingBlocks: board.upcomingBlocks || [],
        }));
        if (board.operatingHours) {
          setOperatingHours(board.operatingHours);
        }
        // Use centralized court selection with upcomingBlocks for 20-min threshold
        const selection = computeRegistrationCourtSelection(
          board.courts || [],
          board.upcomingBlocks || []
        );
        const selectable = selection.selectableCourts.map((sc) => sc.number);
        setAvailableCourts(selectable);
        setData((prev) => ({ ...prev, courtSelection: selection }));
        logger.debug(
          'DataLayer',
          '[Registration CTA Debug] Courts from API',
          board.courts?.map((c) => ({
            num: c.number,
            isBlocked: c.isBlocked,
            isAvailable: c.isAvailable,
            isOvertime: c.isOvertime,
            block: c.block ? { id: c.block.id, reason: c.block.reason } : null,
          }))
        );
      },
      { pollIntervalMs: 5000 }
    );
    logger.debug('DataLayer', '[TennisBackend] Board subscription active');
    return () => {
      logger.debug('DataLayer', '[TennisBackend] Unsubscribing from board updates');
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: board subscription setup, backend is stable singleton
  }, []);

  return {
    getDataService,
    loadData,
  };
}
