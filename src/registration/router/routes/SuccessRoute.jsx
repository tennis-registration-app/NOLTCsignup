// @ts-check
import React from 'react';
import { SuccessScreen } from '../../screens';
import { AlertDisplay, ToastHost } from '../../components';
import { logger } from '../../../lib/logger.js';
import { buildSuccessModel, buildSuccessActions } from '../presenters';

// Platform bridge
import { getTennisDomain, getTennisNamespaceConfig } from '../../../platform';

/**
 * SuccessRoute
 * Extracted from RegistrationRouter
 * Collapsed to app/handlers only
 * Refactored to use presenter functions
 *
 * @param {{
 *   app: import('../../../types/appTypes').AppState,
 *   handlers: import('../../../types/appTypes').Handlers
 * }} props
 */
export function SuccessRoute({ app, handlers }) {
  // Route-internal state for alert display
  const { alert, state, courtAssignment, CONSTANTS } = app;
  const { showAlert, alertMessage } = alert;
  const { waitlistPosition } = state;
  const { justAssignedCourt } = courtAssignment;

  // Get court data for computed values
  const { getCourtData } = handlers;
  const courtData = getCourtData();

  // Compute route-level values
  const isCourtAssignment = justAssignedCourt !== null;
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

  // Build props via presenter functions
  const computed = { isCourtAssignment, assignedCourt, position, estimatedWait };
  const model = buildSuccessModel(app, computed);
  const actions = buildSuccessActions(app, handlers);

  return (
    <>
      <ToastHost />
      <AlertDisplay show={showAlert} message={alertMessage} />
      <SuccessScreen {...model} {...actions} />
    </>
  );
}
