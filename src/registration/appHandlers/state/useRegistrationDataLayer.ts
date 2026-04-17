import { useEffect, useCallback, useRef } from 'react';
import { logger } from '../../../lib/logger';
import type {
  TennisBackendShape,
  RegistrationUiState,
  DomainCourt,
  DomainBoard,
  UpcomingBlock,
  OperatingHoursEntry,
  ApiMember,
  CourtSelectionResult,
} from '../../../types/appTypes';

type Updater<T> = (value: T | ((prev: T) => T)) => void;

interface UseRegistrationDataLayerDeps {
  backend: TennisBackendShape;
  setData: Updater<RegistrationUiState['data']>;
  setAvailableCourts: (courts: number[]) => void;
  setOperatingHours: (hours: OperatingHoursEntry[] | null) => void;
  setApiMembers: (members: ApiMember[]) => void;
  /** Present in the deps interface for call-site stability; not read inside the hook. */
  data?: RegistrationUiState['data'];
  computeRegistrationCourtSelection: (
    courts: DomainCourt[],
    upcomingBlocks?: UpcomingBlock[]
  ) => CourtSelectionResult;
}

/**
 * useRegistrationDataLayer
 * Extracted from useRegistrationAppState
 *
 * Owns real-time subscription and initial data loading callbacks.
 * Backend is a module-level singleton in the app; it is passed in here.
 */
export function useRegistrationDataLayer({
  backend,
  setData,
  setAvailableCourts,
  setOperatingHours,
  setApiMembers,
  computeRegistrationCourtSelection,
}: UseRegistrationDataLayerDeps) {
  const loadData = useCallback(async () => {
    try {
      const [boardData, members] = await Promise.all([
        backend.queries.getBoard(),
        backend.directory.getAllMembers(),
      ]);
      const courts = (boardData.courts || []) as DomainCourt[];
      const waitlist = boardData.waitlist || [];
      const updatedData = {
        courts: courts,
        waitlist: waitlist,
      };
      setData((prev) => ({ ...prev, ...updatedData }));
      if (boardData.operatingHours) {
        setOperatingHours(boardData.operatingHours as OperatingHoursEntry[]);
      }
      if (members && Array.isArray(members)) {
        setApiMembers(members as ApiMember[]);
      }
      const selection = computeRegistrationCourtSelection(courts, []);
      const selectableNumbers = selection.selectableCourts.map((sc) => sc.number);
      setAvailableCourts(selectableNumbers);
      setData((prev) => ({ ...prev, courtSelection: selection }));
      logger.debug('DataLayer', 'Initial load complete', {
        courts: courts.length,
        waitlist: waitlist.length,
        members: (members as unknown[]).length,
      });
      return updatedData;
    } catch (error) {
      logger.error('DataLayer', 'Failed to load data', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: backend is stable singleton
  }, [backend]);

  // Hold latest setters / selection-computer in refs so the mount-only
  // subscription callback always sees the current closures, not the ones
  // captured on first render.
  const subscriptionDepsRef = useRef({
    setData,
    setOperatingHours,
    setAvailableCourts,
    computeRegistrationCourtSelection,
  });
  subscriptionDepsRef.current = {
    setData,
    setOperatingHours,
    setAvailableCourts,
    computeRegistrationCourtSelection,
  };

  useEffect(() => {
    logger.debug('DataLayer', '[TennisBackend] Setting up board subscription...');
    const unsubscribe = backend.queries.subscribeToBoardChanges(
      (domainBoard: DomainBoard) => {
        const {
          setData: currentSetData,
          setOperatingHours: currentSetOperatingHours,
          setAvailableCourts: currentSetAvailableCourts,
          computeRegistrationCourtSelection: currentCompute,
        } = subscriptionDepsRef.current;
        const board = domainBoard;
        logger.debug('DataLayer', '[TennisBackend] Board update received', {
          serverNow: board.serverNow,
          courts: (board.courts as unknown[] | undefined)?.length,
          waitlist: (board.waitlist as unknown[] | undefined)?.length,
        });
        currentSetData((prev) => ({
          ...prev,
          courts: board.courts || [],
          waitlist: board.waitlist || [],
          blocks: board.blocks || [],
          upcomingBlocks: board.upcomingBlocks || [],
        }));
        if (board.operatingHours) {
          currentSetOperatingHours(board.operatingHours as OperatingHoursEntry[]);
        }
        const selection = currentCompute(board.courts || [], board.upcomingBlocks || []);
        const selectable = selection.selectableCourts.map((sc) => sc.number);
        currentSetAvailableCourts(selectable);
        currentSetData((prev) => ({ ...prev, courtSelection: selection }));
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
  }, [backend]);

  return {
    loadData,
  };
}
