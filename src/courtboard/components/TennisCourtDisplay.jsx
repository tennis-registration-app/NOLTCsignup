import React, { useEffect, useMemo } from 'react';
import { CourtCard } from './CourtCard';
import { WaitingList } from './WaitingList';
import { NextAvailablePanel } from './NextAvailablePanel';
import ErrorBoundary from '../../shared/components/ErrorBoundary.jsx';
import { logger } from '../../lib/logger.js';
import { getTennisDomain } from '../../platform/windowBridge.js';
import { useClockTick } from '../hooks/useClockTick.js';
import { useMobileBridge } from '../hooks/useMobileBridge.js';
import { useCourtboardSettings } from '../hooks/useCourtboardSettings.js';
import { useBoardSubscription } from '../hooks/useBoardSubscription.js';
import { useWaitlistAvailable } from '../hooks/useWaitlistAvailable.js';

// Court availability helper - single source of truth for free/playable courts
import { countPlayableCourts } from '../../shared/courts/courtAvailability.js';

// Window bridge - single writer for window.CourtboardState
import { writeCourtboardState } from '../bridge/window-bridge';

// Import shared utilities from @lib
import { TENNIS_CONFIG as _sharedTennisConfig } from '@lib';

const TENNIS_CONFIG = _sharedTennisConfig;

/**
 * TennisCourtDisplay - Main court display component
 * Shows all 12 courts, waitlist, and availability panels
 */
export function TennisCourtDisplay() {
  const isMobileView = window.IS_MOBILE_VIEW || false;
  const currentTime = useClockTick();
  const { courts, waitlist, courtBlocks, upcomingBlocks, courtSelection, operatingHours } =
    useBoardSubscription();
  const { checkStatusMinutes, blockWarningMinutes } = useCourtboardSettings();
  const mobileState = useMobileBridge();

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

  useWaitlistAvailable({
    courts,
    courtBlocks,
    upcomingBlocks,
    waitlist,
    isMobileView,
    mobileState,
  });

  // Build status map using courts state from API (no localStorage fallback)
  const { statusByCourt, selectableByCourt, statusObjectByCourt, data } = useMemo(() => {
    const d = {
      courts: courts,
      waitlist: waitlist.map((g) => ({
        id: g.id,
        players: g.names.map((n) => ({ name: n })),
      })),
    };
    let sByC = {};
    let selByC = {};
    let soByC = {};
    try {
      const domain = getTennisDomain();
      const A = domain?.availability || domain?.Availability;
      if (A) {
        const now = new Date();
        const blocks = courtBlocks || [];
        const wetSet = new Set(
          blocks
            .filter(
              (b) =>
                b?.isWetCourt &&
                new Date(b.startTime ?? b.start) <= now &&
                now < new Date(b.endTime ?? b.end)
            )
            .map((b) => b.courtNumber)
        );
        const allBlocks = [...blocks, ...(upcomingBlocks || [])];
        const statuses =
          A.getCourtStatuses({
            data: d,
            now,
            blocks,
            wetSet,
            upcomingBlocks: allBlocks,
            showingOvertimeCourts: courtSelection?.showingOvertimeCourts ?? false,
          }) || [];
        sByC = Object.fromEntries(statuses.map((s) => [s.courtNumber, s.status]));
        selByC = Object.fromEntries(statuses.map((s) => [s.courtNumber, s.selectable]));
        soByC = Object.fromEntries(statuses.map((s) => [s.courtNumber, s]));
      }
    } catch (e) {
      logger.warn('CourtDisplay', 'Error building status map', e);
    }
    return { statusByCourt: sByC, selectableByCourt: selByC, statusObjectByCourt: soByC, data: d };
  }, [courts, waitlist, courtBlocks, upcomingBlocks, courtSelection]);

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
              <ErrorBoundary context="Waitlist Display">
                <WaitingList
                  waitlist={waitlist}
                  courts={courts}
                  currentTime={currentTime}
                  courtBlocks={courtBlocks}
                  upcomingBlocks={upcomingBlocks}
                  maxWaitingDisplay={TENNIS_CONFIG.DISPLAY?.MAX_WAITING_DISPLAY || 4}
                  courtSelection={courtSelection}
                />
              </ErrorBoundary>
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
                  <ErrorBoundary context="Waitlist Display">
                    <WaitingList
                      waitlist={waitlist}
                      courts={courts}
                      currentTime={currentTime}
                      courtBlocks={courtBlocks}
                      upcomingBlocks={upcomingBlocks}
                      maxWaitingDisplay={TENNIS_CONFIG.DISPLAY?.MAX_WAITING_DISPLAY || 4}
                      courtSelection={courtSelection}
                    />
                  </ErrorBoundary>
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
