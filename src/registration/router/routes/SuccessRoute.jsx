import React from 'react';
import { SuccessScreen } from '../../screens';
import { AlertDisplay, ToastHost } from '../../components';

/**
 * SuccessRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Verbatim JSX. No behavior change.
 */
export function SuccessRoute({ app, handlers }) {
  // Destructure from app
  const {
    state,
    groupGuest,
    alert,
    mobile,
    blockAdmin,
    courtAssignment,
    streak,
    services,
    CONSTANTS,
    TENNIS_CONFIG,
  } = app;
  const {
    replacedGroup,
    ballPriceCents,
    waitlistPosition,
    data,
    canChangeCourt,
    changeTimeRemaining,
    isTimeLimited,
    timeLimitReason,
  } = state;
  const { blockWarningMinutes } = blockAdmin;
  const { justAssignedCourt, assignedSessionId } = courtAssignment;
  const { registrantStreak } = streak;
  const { currentGroup } = groupGuest;
  const { showAlert, alertMessage } = alert;
  const { mobileFlow, mobileCountdown } = mobile;
  const { getCourtBlockStatus } = blockAdmin;
  const { backend } = services;

  // Destructure from handlers
  const { changeCourt, resetForm, getCourtData } = handlers;

  const isCourtAssignment = justAssignedCourt !== null;
  const courtData = getCourtData();
  // Find court by number (API may return courts in different order than array index)
  const courts = courtData.courts || [];
  const assignedCourt = justAssignedCourt
    ? courts.find((c) => c.number === justAssignedCourt) || courts[justAssignedCourt - 1]
    : null;

  let estimatedWait = 0;
  let position = 0;
  if (!isCourtAssignment) {
    // Position in queue - use API position if available
    position = waitlistPosition > 0 ? waitlistPosition : courtData.waitlist.length;

    // Calculate estimated wait time using domain functions
    try {
      const A = window.Tennis?.Domain?.Availability;
      const W = window.Tennis?.Domain?.Waitlist;

      if (A && W && A.getFreeCourtsInfo && A.getNextFreeTimes && W.estimateWaitForPositions) {
        const now = new Date();

        // Build blocks array from court-level blocks (active) and upcomingBlocks (future)
        const activeBlocks = courtData.courts
          .filter((c) => c?.block)
          .map((c) => ({
            courtNumber: c.number,
            startTime: c.block.startsAt || c.block.startTime,
            endTime: c.block.endsAt || c.block.endTime,
            isWetCourt: (c.block.reason || c.block.title || '').toLowerCase().includes('wet'),
          }));
        const upcomingBlocks = (courtData.upcomingBlocks || []).map((b) => ({
          courtNumber: b.courtNumber,
          startTime: b.startTime || b.startsAt,
          endTime: b.endTime || b.endsAt,
          isWetCourt: (b.reason || b.title || '').toLowerCase().includes('wet'),
        }));
        const allBlocks = [...activeBlocks, ...upcomingBlocks];

        // Build wetSet from currently active wet blocks
        const wetSet = new Set(
          allBlocks
            .filter(
              (b) => b.isWetCourt && new Date(b.startTime) <= now && new Date(b.endTime) > now
            )
            .map((b) => b.courtNumber)
        );

        // Convert data to domain format
        const domainData = { courts: courtData.courts };

        // Get availability info
        const info = A.getFreeCourtsInfo({ data: domainData, now, blocks: allBlocks, wetSet });
        const nextTimes = A.getNextFreeTimes({
          data: domainData,
          now,
          blocks: allBlocks,
          wetSet,
        });

        // Calculate ETA using domain function
        const avgGame = window.Tennis?.Config?.Timing?.AVG_GAME || CONSTANTS.AVG_GAME_TIME_MIN;
        const etas = W.estimateWaitForPositions({
          positions: [position],
          currentFreeCount: info.free?.length || 0,
          nextFreeTimes: nextTimes,
          avgGameMinutes: avgGame,
        });
        estimatedWait = etas[0] || 0;
      } else {
        // Domain functions not available - fallback to simple calculation
        estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
      }
    } catch (e) {
      console.error('Error calculating wait time:', e);
      estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
    }
  }

  return (
    <>
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <SuccessScreen
        isCourtAssignment={isCourtAssignment}
        justAssignedCourt={justAssignedCourt}
        assignedCourt={assignedCourt}
        sessionId={assignedSessionId}
        replacedGroup={replacedGroup}
        canChangeCourt={canChangeCourt}
        changeTimeRemaining={changeTimeRemaining}
        position={position}
        estimatedWait={estimatedWait}
        currentGroup={currentGroup}
        mobileCountdown={mobileFlow ? mobileCountdown : null}
        isMobile={mobileFlow}
        isTimeLimited={isTimeLimited}
        timeLimitReason={timeLimitReason}
        registrantStreak={registrantStreak}
        onChangeCourt={changeCourt}
        onHome={resetForm}
        ballPriceCents={ballPriceCents}
        onPurchaseBalls={async (sessionId, accountId, options) => {
          console.log('[Ball Purchase] App.jsx handler called', {
            sessionId,
            accountId,
            options,
          });
          const result = await backend.commands.purchaseBalls({
            sessionId,
            accountId,
            splitBalls: options?.splitBalls || false,
            splitAccountIds: options?.splitAccountIds || null,
          });
          console.log('[Ball Purchase] API result from backend.commands.purchaseBalls', result);
          return result;
        }}
        onLookupMemberAccount={async (memberNumber) => {
          const members = await backend.directory.getMembersByAccount(memberNumber);
          return members;
        }}
        TENNIS_CONFIG={TENNIS_CONFIG}
        getCourtBlockStatus={getCourtBlockStatus}
        upcomingBlocks={data.upcomingBlocks}
        blockWarningMinutes={blockWarningMinutes}
      />
    </>
  );
}
