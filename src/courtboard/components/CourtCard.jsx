import React from 'react';
import { getUpcomingBlockWarningFromBlocks } from '@lib';
import { listPlayableCourts } from '../../shared/courts/courtAvailability.js';
import { classForStatus, namesFor, formatTime, computeClock } from '../utils/courtUtils.js';
import {
  getTennisUI,
  getMobileModal,
  getMobileTapToRegister,
} from '../../platform/windowBridge.js';

/**
 * CourtCard - Display card for a single tennis court
 * Shows court status, player names, time remaining, and block warnings
 */
export function CourtCard({
  courtNumber,
  currentTime: _currentTime,
  statusByCourt,
  selectableByCourt,
  statusObjectByCourt,
  data,
  isMobileView,
  checkStatusMinutes = 150,
  upcomingBlocks = [],
  blockWarningMinutes = 60,
  courts = [],
  courtBlocks = [],
}) {
  const status = statusByCourt[courtNumber] || 'free';
  const _selectable = selectableByCourt[courtNumber] || false; // Unused, kept for prop consistency
  const statusObj = statusObjectByCourt?.[courtNumber] || {};
  const cObj = data?.courts?.[courtNumber - 1] || {};

  const now = new Date();
  const {
    primary,
    secondary,
    secondaryColor: _secondaryColor,
  } = computeClock(status, status === 'blocked' ? statusObj : cObj, now, checkStatusMinutes);
  const nm = namesFor(cObj);

  const base =
    'court-card border-4 rounded-xl flex flex-col items-center justify-start p-2 court-transition';
  const courtClass = base + ' ' + classForStatus(statusObj);

  // Mobile name formatting
  function formatMobileNames(input) {
    if (!input) return '';
    const names = Array.isArray(input)
      ? input
      : String(input)
          .split(/,\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
    if (!names.length) return '';

    const SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV']);
    const formatOne = (full) => {
      const tokens = full.replace(/\s+/g, ' ').trim().split(' ');
      if (tokens.length === 1) {
        const t = tokens[0];
        return t.length <= 3 ? t : `${t[0]}. ${t.slice(1)}`;
      }
      let last = tokens[tokens.length - 1];
      let last2 = tokens[tokens.length - 2];
      let lastName, remainder;
      if (SUFFIXES.has(last)) {
        lastName = `${last2} ${last}`;
        remainder = tokens.slice(0, -2);
      } else {
        lastName = last;
        remainder = tokens.slice(0, -1);
      }
      const first = remainder[0] || '';
      const firstInitial = first ? `${first[0]}.` : '';
      return `${firstInitial} ${lastName}`.trim();
    };

    const primaryName = formatOne(names[0]);
    return names.length > 1 ? `${primaryName} +${names.length - 1}` : primaryName;
  }

  // Handler for occupied/overtime court taps (mobile only)
  const handleOccupiedCourtTap = () => {
    // Check overtime directly from session end time (not status, which uses different threshold)
    const isOvertime =
      cObj?.session?.scheduledEndAt && new Date(cObj.session.scheduledEndAt) < new Date();

    if (!isMobileView) return;

    // Check if court is overtime - treat like free court for registration
    if (isOvertime) {
      try {
        // Check if empty playable courts exist - if so, block overtime tap
        const playableCourts = listPlayableCourts(courts, courtBlocks, new Date().toISOString());
        const emptyPlayable = playableCourts.filter((cn) => {
          const c = courts[cn - 1];
          return !c?.session;
        });
        if (emptyPlayable.length > 0) {
          const tennisUI = getTennisUI();
          tennisUI?.toast?.('Please select an available court', { type: 'warning' });
          return;
        }
        // No empty courts - allow overtime takeover
        const mobileTap = getMobileTapToRegister();
        mobileTap?.(courtNumber);
        return;
      } catch (e) {
        console.error('[Overtime Tap] Error checking playable courts:', e);
      }
    }

    // Court is truly occupied (not overtime) - handle clear court flow
    const registeredCourt = sessionStorage.getItem('mobile-registered-court');

    const mobileModal = getMobileModal();
    if (registeredCourt) {
      // User has a registration - only allow clearing THEIR court
      if (Number(registeredCourt) === courtNumber) {
        mobileModal?.open('clear-court-confirm', { courtNumber });
      }
      // Tapping other occupied courts does nothing when registered
    } else {
      // No registration - show players on this court
      mobileModal?.open('clear-court-confirm', {
        courtNumber,
        players: nm, // nm already has player names from namesFor(cObj)
      });
    }
  };

  const isOccupiedOrOvertime = status === 'occupied' || status === 'overtime';
  const isClickable = status === 'free' || (isOccupiedOrOvertime && isMobileView);

  return (
    <div
      className={courtClass}
      data-court={courtNumber}
      data-available={status === 'free'}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={
        status === 'free'
          ? () => getMobileTapToRegister()?.(courtNumber)
          : isOccupiedOrOvertime && isMobileView
            ? handleOccupiedCourtTap
            : undefined
      }
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <h3
        className={`court-text-lg font-bold ${status === 'wet' || status === 'blocked' ? 'text-gray-800' : 'text-white'} mb-1`}
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
      >
        Court {courtNumber}
      </h3>
      <div
        className={`court-text-sm w-full ${status === 'wet' || status === 'blocked' ? 'text-gray-800' : 'text-white'} flex flex-col h-full`}
      >
        <div className="flex flex-col h-full w-full">
          {status === 'free' ? (
            <div className="relative flex-1 flex flex-col items-center justify-center w-full">
              {/* Block warning - absolutely positioned at top */}
              {(() => {
                const blockWarning = getUpcomingBlockWarningFromBlocks(
                  courtNumber,
                  blockWarningMinutes,
                  upcomingBlocks
                );
                if (!blockWarning || blockWarning.minutesUntilBlock >= blockWarningMinutes)
                  return null;

                return (
                  <div
                    className="absolute top-0 left-0 right-0 court-text-base font-bold leading-tight text-center"
                    style={{ color: 'yellow' }}
                  >
                    {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                  </div>
                );
              })()}
              {/* "Available" - centered in full space */}
              <div
                className={`${isMobileView ? 'court-text-base font-medium leading-tight text-sm font-normal' : 'court-text-base font-medium leading-tight'} text-center`}
              >
                {isMobileView ? 'Tap to Select' : primary}
              </div>
            </div>
          ) : status === 'wet' ? (
            <div className="mt-1 court-text-base font-bold leading-tight text-center flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div style={{ fontSize: '2.5em', lineHeight: '1' }}>🌧️</div>
                <div className="mt-1">WET COURT</div>
              </div>
            </div>
          ) : status === 'blocked' ? (
            <>
              <div className="text-center flex-1 flex items-center justify-center mt-1 font-bold leading-tight blocked-court-label">
                {(() => {
                  let blockReason = statusObj.blockedLabel || statusObj.reason || 'Blocked';
                  const upperReason = blockReason.toUpperCase();
                  if (
                    upperReason.includes('SHORT') ||
                    upperReason.includes('COURT WORK') ||
                    upperReason.includes('MAINTENANCE')
                  ) {
                    return 'Court work';
                  }
                  if (upperReason.includes('LESSON')) return 'Lesson';
                  if (upperReason.includes('CLINIC')) return 'Clinic';
                  if (upperReason.includes('LEAGUE')) return 'League';
                  return blockReason.charAt(0).toUpperCase() + blockReason.slice(1).toLowerCase();
                })()}
              </div>
              {statusObj.blockedEnd && !isMobileView && (
                <div className="mt-auto text-sm text-gray-700 opacity-90 text-center">
                  Until {formatTime(statusObj.blockedEnd)}
                </div>
              )}
            </>
          ) : status === 'occupied' || status === 'overtime' ? (
            isMobileView ? (
              <>
                {nm ? (
                  <div
                    className="mt-1 court-text-sm font-medium text-center flex-1 flex items-center justify-center"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <div className="truncate text-sm leading-tight px-1" title={nm}>
                      {formatMobileNames(nm)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
                <div className="mt-auto text-sm opacity-90 text-center">{primary}</div>
              </>
            ) : (
              <>
                {/* For occupied: show block warning instead of "X min" if applicable */}
                {status === 'occupied' &&
                  (() => {
                    const blockWarning = getUpcomingBlockWarningFromBlocks(
                      courtNumber,
                      0,
                      upcomingBlocks
                    );
                    if (blockWarning && blockWarning.minutesUntilBlock < blockWarningMinutes) {
                      return (
                        <div
                          className="mt-1 court-text-base font-bold leading-tight text-center"
                          style={{ color: 'yellow' }}
                        >
                          {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                        </div>
                      );
                    }
                    return (
                      <div className="mt-1 court-text-base font-bold leading-tight text-center">
                        {primary}
                      </div>
                    );
                  })()}
                {/* For overtime: show primary then block warning below */}
                {status === 'overtime' && (
                  <>
                    <div className="mt-1 court-text-base font-bold leading-tight text-center">
                      {primary}
                    </div>
                    {(() => {
                      const blockWarning = getUpcomingBlockWarningFromBlocks(
                        courtNumber,
                        0,
                        upcomingBlocks
                      );
                      if (!blockWarning || blockWarning.minutesUntilBlock >= blockWarningMinutes)
                        return null;
                      return (
                        <div
                          className="mt-1 court-text-base font-bold leading-tight text-center"
                          style={{ color: 'yellow' }}
                        >
                          {blockWarning.reason} in {blockWarning.minutesUntilBlock}m
                        </div>
                      );
                    })()}
                  </>
                )}
                {nm ? (
                  <div
                    className="mt-1 court-text-sm font-medium text-center flex-1 flex items-center justify-center"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {nm}
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
                {status === 'occupied' && cObj?.session?.scheduledEndAt && (
                  <div className="mt-auto text-sm opacity-90 text-center">
                    {cObj?.session?.isTournament
                      ? 'Tournament'
                      : `Until ${formatTime(cObj.session.scheduledEndAt)}`}
                  </div>
                )}
                {status === 'overtime' && (
                  <div className="mt-auto text-sm text-center" style={{ color: 'yellow' }}>
                    {cObj?.session?.isTournament ? 'Tournament' : secondary}
                  </div>
                )}
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
