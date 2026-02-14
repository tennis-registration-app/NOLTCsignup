// @ts-check
import React from 'react';
import { SuccessScreen } from '../../screens';
import { AlertDisplay, ToastHost } from '../../components';
import { logger } from '../../../lib/logger.js';

// Platform bridge
import { getTennisDomain, getTennisNamespaceConfig } from '../../../platform';

/**
 * SuccessRoute
 * Extracted from RegistrationRouter — WP6.0.1
 * Collapsed to app/handlers only — WP6.0.2b
 * Verbatim JSX. No behavior change.
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
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
  const { justAssignedCourt, assignedSessionId, assignedEndTime } = courtAssignment;
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

    // Calculate estimated wait time using domain simulation function
    try {
      const Domain = getTennisDomain();
      const W = Domain?.Waitlist;

      if (W?.simulateWaitlistEstimates) {
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

        // Build a minimal waitlist up to current position for simulation
        const waitlistUpToPosition = (courtData.waitlist || []).slice(0, position);

        // Calculate ETA using domain simulation function
        const avgGame = getTennisNamespaceConfig()?.Timing?.AVG_GAME || CONSTANTS.AVG_GAME_TIME_MIN;
        const etas = W.simulateWaitlistEstimates({
          courts: courtData.courts || [],
          waitlist: waitlistUpToPosition,
          blocks: allBlocks,
          now,
          avgGameMinutes: avgGame,
        });
        // Get the last position's estimate (our position)
        estimatedWait = etas[position - 1] || 0;
      } else {
        // Domain function not available - fallback to simple calculation
        estimatedWait = position * CONSTANTS.AVG_GAME_TIME_MIN;
      }
    } catch (e) {
      logger.error('SuccessRoute', 'Error calculating wait time', e);
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
        assignedEndTime={assignedEndTime}
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
          logger.debug('SuccessRoute', 'Ball purchase handler called', {
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
          logger.debug('SuccessRoute', 'Ball purchase API result', result);
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
        onUpdateSessionTournament={async (sessionId, isTournamentFlag) => {
          const result = await backend.commands.updateSessionTournament({
            sessionId,
            isTournament: isTournamentFlag,
          });
          return result;
        }}
      />
    </>
  );
}
