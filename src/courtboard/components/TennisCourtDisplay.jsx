import React, { useState, useEffect, useCallback } from 'react';
import { CourtCard } from './CourtCard';
import { WaitingList } from './WaitingList';
import { NextAvailablePanel } from './NextAvailablePanel';
import { logger } from '../../lib/logger.js';
import { getMobileModal, getRefreshBoard, getTennisDomain } from '../../platform/windowBridge.js';
import { setRefreshBoardGlobal } from '../../platform/registerGlobals.js';
import { normalizeSettings } from '../../lib/normalize/normalizeAdminSettings.js';

// TennisBackend for real-time board subscription
import { createBackend } from '../../registration/backend/index.js';
const backend = createBackend();

// Court availability helper - single source of truth for free/playable courts
import { countPlayableCourts, listPlayableCourts } from '../../shared/courts/courtAvailability.js';
import { isCourtEligibleForGroup } from '../../lib/types/domain.js';
import { computeRegistrationCourtSelection } from '../../shared/courts/overtimeEligibility.js';

// Window bridge - single writer for window.CourtboardState
import { writeCourtboardState } from '../bridge/window-bridge';

// Import shared utilities from @lib
import { TENNIS_CONFIG as _sharedTennisConfig, getUpcomingBlockWarningFromBlocks } from '@lib';

// ---- Debounce helper (no UI change) ----
const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

const TENNIS_CONFIG = _sharedTennisConfig;

/**
 * TennisCourtDisplay - Main court display component
 * Shows all 12 courts, waitlist, and availability panels
 */
export function TennisCourtDisplay() {
  const isMobileView = window.IS_MOBILE_VIEW || false;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [courts, setCourts] = useState(Array(12).fill(null));
  const [waitlist, setWaitlist] = useState([]);
  const [courtBlocks, setCourtBlocks] = useState([]); // Active blocks only (for availability)
  const [upcomingBlocks, setUpcomingBlocks] = useState([]); // Future blocks today (for display)
  const [courtSelection, setCourtSelection] = useState(null); // Computed court selection from canonical API
  const [operatingHours, setOperatingHours] = useState([]); // Admin-configured operating hours
  const [checkStatusMinutes, setCheckStatusMinutes] = useState(150); // Default 150, loaded from settings
  const [blockWarningMinutes, setBlockWarningMinutes] = useState(60); // Default 60, loaded from settings

  // Mobile state - initialize from sessionStorage, updated via message from Mobile.html
  const [mobileState, setMobileState] = useState(() => ({
    registeredCourt: sessionStorage.getItem('mobile-registered-court'),
    waitlistEntryId: sessionStorage.getItem('mobile-waitlist-entry-id'),
  }));

  // Listen for state updates from Mobile.html (MobileBridge broadcasts)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'mobile:state-updated') {
        logger.debug('CourtDisplay', 'Mobile state updated', event.data.payload);
        setMobileState(event.data.payload);
      } else if (event.data?.type === 'refresh-board') {
        // Triggered after waitlist:joined to check for waitlist-available notice
        logger.debug('CourtDisplay', 'Refresh board requested');
        // The mobileState update from MobileBridge.broadcastState() will trigger
        // the waitlist-available useEffect, but we can also manually trigger loadData
        const refreshBoard = getRefreshBoard();
        if (refreshBoard) {
          refreshBoard();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data loading - no longer reads from localStorage
  // All state now comes from API via TennisBackend subscription
  const loadData = useCallback(async () => {
    // No-op: courts, waitlist, and courtBlocks now populate from API only
    // Initial state is empty arrays, TennisBackend subscription fills them
  }, []);

  // DOM event listeners for cross-component updates
  useEffect(() => {
    // Legacy loadData call (now no-op, API subscription handles state)
    loadData();

    const handleUpdate = debounce(() => loadData(), 150);

    window.addEventListener('tennisDataUpdate', handleUpdate, { passive: true });
    window.addEventListener('DATA_UPDATED', handleUpdate, { passive: true });

    // No polling - TennisBackend subscription provides real-time updates

    return () => {
      window.removeEventListener('tennisDataUpdate', handleUpdate);
      window.removeEventListener('DATA_UPDATED', handleUpdate);
    };
  }, [loadData]);

  // TennisBackend real-time subscription (primary data source)
  useEffect(() => {
    logger.debug('CourtDisplay', 'Setting up TennisBackend subscription...');

    const unsubscribe = backend.queries.subscribeToBoardChanges(
      (domainBoard) => {
        // Use pure Domain Board directly (legacy adapter removed)
        const board = domainBoard;

        logger.debug('CourtDisplay', 'Board update received', {
          serverNow: board.serverNow,
          courts: board.courts?.length,
          waitlist: board.waitlist?.length,
          upcomingBlocks: board.upcomingBlocks?.length,
        });
        logger.debug('CourtDisplay', 'Raw upcomingBlocks', board.upcomingBlocks);

        // Debug: log first 2 courts to see raw data
        logger.debug('CourtDisplay', 'Raw board courts (first 2)', board.courts?.slice(0, 2));

        // Update courts state
        if (board.courts) {
          // Transform API courts to Domain format for Courtboard rendering
          // Domain format: court.session = { group: { players }, scheduledEndAt, startedAt }
          const transformedCourts = Array(12)
            .fill(null)
            .map((_, idx) => {
              const courtNumber = idx + 1;
              const apiCourt = board.courts.find((c) => c && c.number === courtNumber);
              if (!apiCourt) {
                return null; // Empty court
              }
              if (!apiCourt.session && !apiCourt.block) {
                return null; // No session or block
              }

              const players = (
                apiCourt.session?.participants ||
                apiCourt.session?.group?.players ||
                []
              ).map((p) => ({
                name: p.displayName || p.name || 'Unknown',
              }));

              return {
                session: apiCourt.session
                  ? {
                      group: { players },
                      scheduledEndAt: apiCourt.session.scheduledEndAt,
                      startedAt: apiCourt.session.startedAt,
                      isTournament: apiCourt.session.isTournament ?? false,
                    }
                  : null,
              };
            });

          // Debug: log first 2 transformed courts
          logger.debug(
            'CourtDisplay',
            'Transformed courts (first 2)',
            transformedCourts.slice(0, 2)
          );
          setCourts(transformedCourts);

          // Extract active blocks from courts (for availability calculations)
          const activeBlocks = board.courts
            .filter((c) => c && c.block)
            .map((c) => ({
              id: c.block.id,
              courtNumber: c.number,
              reason: c.block.reason || c.block.title || 'Blocked',
              startTime: c.block.startsAt,
              endTime: c.block.endsAt,
              isWetCourt: c.block.reason?.toLowerCase().includes('wet'),
            }));
          setCourtBlocks(activeBlocks);

          // Extract upcoming blocks from API (future blocks for today, display only)
          const futureBlocks = (board.upcomingBlocks || []).map((b) => ({
            id: b.id,
            courtNumber: b.courtNumber,
            reason: b.title || b.reason || 'Blocked',
            startTime: b.startTime,
            endTime: b.endTime,
            isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
          }));
          setUpcomingBlocks(futureBlocks);

          // Compute court selection using canonical API
          const allBlocks = [...activeBlocks, ...futureBlocks];
          const selection = computeRegistrationCourtSelection(board.courts || [], allBlocks);
          setCourtSelection(selection);
        }

        // Transform already-normalized waitlist from TennisQueries
        // TennisQueries returns { group: { players } } format, we need { names } for rendering
        const normalized = (board.waitlist || []).map((entry) => ({
          id: entry.id,
          position: entry.position,
          groupType: entry.group?.type,
          joinedAt: entry.joinedAt,
          minutesWaiting: entry.minutesWaiting,
          names: (entry.group?.players || []).map((p) => p.displayName || p.name || 'Unknown'),
          players: entry.group?.players || [],
          deferred: entry.deferred ?? false,
        }));
        logger.debug('CourtDisplay', 'Transformed waitlist', normalized);
        setWaitlist(normalized);

        // Set operating hours from board data
        if (board.operatingHours) {
          setOperatingHours(board.operatingHours);
        }
      },
      { pollIntervalMs: 5000 }
    );

    logger.debug('CourtDisplay', 'TennisBackend subscription active');

    return () => {
      logger.debug('CourtDisplay', 'Unsubscribing from board updates');
      unsubscribe();
    };
  }, []);

  // Load check_status_minutes from system settings
  // WP4-4: Normalize settings at boundary
  useEffect(() => {
    const loadSettings = async () => {
      try {
        logger.debug('CourtDisplay', 'Loading settings, backend.admin:', !!backend.admin);
        const result = await backend.admin?.getSettings?.();
        const settings = normalizeSettings(result?.settings);
        logger.debug('CourtDisplay', 'Settings result', {
          ok: result?.ok,
          checkStatusMinutes: settings?.checkStatusMinutes,
        });
        if (result?.ok && settings?.checkStatusMinutes) {
          const minutes = parseInt(settings.checkStatusMinutes, 10);
          if (minutes > 0) {
            setCheckStatusMinutes(minutes);
            logger.debug('CourtDisplay', 'Loaded checkStatusMinutes:', minutes);
          }
        }
        // Load blockWarningMinutes
        if (result?.ok && settings?.blockWarningMinutes) {
          const blockWarnMin = parseInt(settings.blockWarningMinutes, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
            logger.debug('CourtDisplay', 'Loaded blockWarningMinutes:', blockWarnMin);
          }
        }
      } catch (err) {
        logger.warn('CourtDisplay', 'Failed to load settings, using default', err);
      }
    };
    loadSettings();
  }, []);

  /**
   * TWO-ROOT BRIDGE: Sync React state to window for mobile modal access.
   *
   * ARCHITECTURE INVARIANT:
   * - This useEffect is the ONLY WRITER to window.CourtboardState
   * - The mobile modal (second React root in MobileModalSheet) reads via getCourtboardState()
   * - mobile-fallback-bar.js reads via getCourtboardState()
   * - NO OTHER CODE should write to window.CourtboardState
   *
   * This bridge exists because the mobile modal is rendered in a separate React tree
   * and cannot access this component's state directly.
   */
  useEffect(() => {
    const now = new Date().toISOString();
    const freeCount = countPlayableCourts(courts, courtBlocks, now);

    logger.debug('CourtDisplay', 'Setting state', {
      courts: courts?.length,
      courtBlocks: courtBlocks?.length,
      upcomingBlocks: upcomingBlocks?.length,
      waitingGroups: waitlist?.length,
      freeCourts: freeCount,
    });
    writeCourtboardState({
      courts: courts,
      courtBlocks: courtBlocks,
      upcomingBlocks: upcomingBlocks,
      waitingGroups: waitlist,
      freeCourts: freeCount,
      timestamp: Date.now(),
    });

    // Update mobile button state after state is set
    if (typeof window.updateJoinButtonState === 'function') {
      logger.debug('CourtDisplay', 'Calling updateJoinButtonState');
      window.updateJoinButtonState();
    } else {
      logger.debug('CourtDisplay', 'updateJoinButtonState not found');
    }
  }, [courts, courtBlocks, upcomingBlocks, waitlist]);

  // Auto-show waitlist-available notice when court is free and THIS mobile user is first in waitlist
  useEffect(() => {
    if (!isMobileView) return;

    const hasWaitlist = waitlist.length > 0;
    if (!hasWaitlist) {
      // No waitlist - close notice if open
      const mobileModal = getMobileModal();
      if (mobileModal?.currentType === 'waitlist-available') {
        mobileModal?.close?.();
      }
      return;
    }

    // Check if THIS mobile user is first in the waitlist
    // Use mobileState (React state) instead of sessionStorage for reactivity
    const mobileWaitlistEntryId = mobileState.waitlistEntryId;
    const firstGroup = waitlist[0];

    // Deferred groups: only skip when no full-time court available.
    // No blocks means no restrictions — all courts have full time available.
    let deferredBlocked = false;
    if (firstGroup?.deferred) {
      const allBlocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];
      if (allBlocks.length === 0) {
        deferredBlocked = false; // No blocks = all courts have full time
      } else {
        const groupPlayerCount = firstGroup?.players?.length || 0;
        const sessionDuration = groupPlayerCount >= 4 ? 90 : 60;
        const nowDate = new Date();
        const freeForDeferred = listPlayableCourts(courts, courtBlocks, nowDate.toISOString());
        const eligibleForDeferred = freeForDeferred.filter((courtNum) =>
          isCourtEligibleForGroup(courtNum, groupPlayerCount)
        );
        deferredBlocked = !eligibleForDeferred.some((courtNum) => {
          const warning = getUpcomingBlockWarningFromBlocks(
            courtNum,
            sessionDuration + 5,
            allBlocks,
            nowDate
          );
          return warning == null;
        });
      }
    }

    const isUserFirstInWaitlist =
      mobileWaitlistEntryId && firstGroup?.id === mobileWaitlistEntryId && !deferredBlocked;

    // Use shared helper for consistent free court calculation
    const now = new Date().toISOString();
    const freeCourtList = listPlayableCourts(courts, courtBlocks, now);

    // Filter by singles-only eligibility for this group's player count
    const groupPlayerCount = firstGroup?.players?.length || 0;
    const eligibleCourtList = freeCourtList.filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, groupPlayerCount)
    );
    const freeCourtCount = eligibleCourtList.length;

    logger.debug('CourtDisplay', 'WaitlistNotice check', {
      freeCourts: freeCourtCount,
      freeCourtList: eligibleCourtList,
      waitlistLength: waitlist?.length,
      isMobileView: isMobileView,
      mobileWaitlistEntryId: mobileWaitlistEntryId,
      firstGroupId: firstGroup?.id,
      isUserFirstInWaitlist: isUserFirstInWaitlist,
      shouldShow: freeCourtCount > 0 && isUserFirstInWaitlist,
      totalCourts: courts?.length,
      courtsWithSession: courts?.filter((c) => c?.session).length,
    });

    const mobileModal = getMobileModal();
    if (freeCourtCount > 0 && isUserFirstInWaitlist) {
      // Court available AND this mobile user is first in waitlist - show notice
      mobileModal?.open('waitlist-available', { firstGroup });
    } else if (mobileModal?.currentType === 'waitlist-available') {
      // Not first, no free courts, or no waitlist - close notice if it's currently showing
      mobileModal?.close?.();
    }
  }, [courts, courtBlocks, upcomingBlocks, waitlist, isMobileView, mobileState]);

  setRefreshBoardGlobal(loadData);

  // Build status map using courts state from API (no localStorage fallback)
  let statusByCourt = {};
  let selectableByCourt = {};
  let statusObjectByCourt = {};
  // Build data object from React courts state for status computation
  const data = {
    courts: courts,
    waitlist: waitlist.map((g) => ({
      id: g.id,
      players: g.names.map((n) => ({ name: n })),
    })),
  };

  try {
    const domain = getTennisDomain();
    const A = domain?.availability || domain?.Availability;
    if (A) {
      const now = new Date();
      // Use courtBlocks from React state instead of localStorage
      const blocks = courtBlocks || [];

      const wetSet = new Set(
        (blocks || [])
          .filter(
            (b) =>
              b?.isWetCourt &&
              new Date(b.startTime ?? b.start) <= now &&
              now < new Date(b.endTime ?? b.end)
          )
          .map((b) => b.courtNumber)
      );
      // Merge courtBlocks + upcomingBlocks for 20-min threshold check
      const allBlocks = [...(blocks || []), ...(upcomingBlocks || [])];
      const _statuses =
        A.getCourtStatuses({
          data,
          now,
          blocks,
          wetSet,
          upcomingBlocks: allBlocks,
          showingOvertimeCourts: courtSelection?.showingOvertimeCourts ?? false,
        }) || [];
      statusByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s.status]));
      selectableByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s.selectable]));
      statusObjectByCourt = Object.fromEntries(_statuses.map((s) => [s.courtNumber, s]));
    }
  } catch (e) {
    logger.warn('CourtDisplay', 'Error building status map', e);
  }

  const hasWaiting = waitlist.length > 0;

  return (
    <div className="h-screen min-h-screen bg-gradient-to-br from-slate-700 to-slate-600 p-4 text-white flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="w-full flex justify-center">
          <div className="flex items-center relative">
            {hasWaiting && (
              <div className="absolute left-[-140px] lg:left-[-100px] xl:left-[-140px]">
                <svg
                  width="40"
                  height="40"
                  className="lg:w-20 lg:h-20 xl:w-32 xl:h-32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5 20V4" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M5 4L17 7L5 10V4Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1" />
                </svg>
              </div>
            )}
            <div className="text-center">
              <div
                className="time-header font-light text-white mb-1"
                style={{
                  fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div
                className="date-header text-gray-300 -mt-1"
                style={{
                  fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {currentTime.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 main-layout h-full min-h-0 items-stretch">
        {/* LEFT column wrapper */}
        <div className="left-column courts-section h-full flex flex-col min-h-0" data-left-col>
          <div className="bg-slate-800/50 rounded-xl shadow-2xl p-4 h-full backdrop-blur flex flex-col min-h-0">
            {/* Desktop layout - Top row */}
            <div className="courts-grid mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div key={num} className="flex justify-center">
                  <CourtCard
                    courtNumber={num}
                    currentTime={currentTime}
                    statusByCourt={statusByCourt}
                    selectableByCourt={selectableByCourt}
                    statusObjectByCourt={statusObjectByCourt}
                    data={data}
                    isMobileView={isMobileView}
                    checkStatusMinutes={checkStatusMinutes}
                    upcomingBlocks={upcomingBlocks}
                    blockWarningMinutes={blockWarningMinutes}
                    courts={courts}
                    courtBlocks={courtBlocks}
                  />
                </div>
              ))}
            </div>
            <div className="h-3 bg-gray-400 mb-4 rounded-full flex-shrink-0 divider-line" />

            {/* Bottom section */}
            <div className="bottom-section min-h-0 overflow-auto">
              <WaitingList
                waitlist={waitlist}
                courts={courts}
                currentTime={currentTime}
                courtBlocks={courtBlocks}
                upcomingBlocks={upcomingBlocks}
                maxWaitingDisplay={TENNIS_CONFIG.DISPLAY?.MAX_WAITING_DISPLAY || 4}
                courtSelection={courtSelection}
              />
              <div className="courts-grid-bottom">
                {[12, 11, 10, 9].map((num) => (
                  <div key={num} className="flex justify-center">
                    <CourtCard
                      courtNumber={num}
                      currentTime={currentTime}
                      statusByCourt={statusByCourt}
                      selectableByCourt={selectableByCourt}
                      statusObjectByCourt={statusObjectByCourt}
                      data={data}
                      isMobileView={isMobileView}
                      checkStatusMinutes={checkStatusMinutes}
                      upcomingBlocks={upcomingBlocks}
                      blockWarningMinutes={blockWarningMinutes}
                      courts={courts}
                      courtBlocks={courtBlocks}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile layout */}
            <div className="mobile-layout">
              <div className="mobile-courts-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <CourtCard
                    key={num}
                    courtNumber={num}
                    currentTime={currentTime}
                    statusByCourt={statusByCourt}
                    selectableByCourt={selectableByCourt}
                    statusObjectByCourt={statusObjectByCourt}
                    data={data}
                    isMobileView={isMobileView}
                    checkStatusMinutes={checkStatusMinutes}
                    upcomingBlocks={upcomingBlocks}
                    blockWarningMinutes={blockWarningMinutes}
                    courts={courts}
                    courtBlocks={courtBlocks}
                  />
                ))}
              </div>

              {hasWaiting && (
                <div className="mobile-waiting-section">
                  <WaitingList
                    waitlist={waitlist}
                    courts={courts}
                    currentTime={currentTime}
                    courtBlocks={courtBlocks}
                    upcomingBlocks={upcomingBlocks}
                    maxWaitingDisplay={TENNIS_CONFIG.DISPLAY?.MAX_WAITING_DISPLAY || 4}
                    courtSelection={courtSelection}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT column wrapper */}
        <div className="right-column flex flex-col h-full min-h-0" data-right-col>
          <NextAvailablePanel
            courts={courts}
            currentTime={currentTime}
            waitlist={waitlist}
            blocks={[...(courtBlocks || []), ...(upcomingBlocks || [])]}
            operatingHours={operatingHours}
            maxDisplay={_sharedTennisConfig?.DISPLAY?.MAX_WAITING_DISPLAY || 6}
          />
        </div>
      </div>
    </div>
  );
}
