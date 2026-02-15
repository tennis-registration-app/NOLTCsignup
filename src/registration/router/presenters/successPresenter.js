// @ts-check
/**
 * SuccessScreen Presenter
 *
 * Pure functions that transform app state and handlers into
 * the props interface expected by SuccessScreen.
 *
 * Extracted from SuccessRoute.jsx — maintains exact prop mapping.
 *
 * NOTE: Some props require computed values or wrapped handlers
 * that depend on route-level context. These are passed in via
 * the `computed` parameter.
 */

import { logger } from '../../../lib/logger.js';

/**
 * Build the model (data) props for SuccessScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {Object} computed - Route-computed values
 * @param {boolean} computed.isCourtAssignment
 * @param {Object|null} computed.assignedCourt
 * @param {number} computed.position
 * @param {number} computed.estimatedWait
 * @returns {Object} Model props for SuccessScreen
 */
export function buildSuccessModel(app, computed) {
  // Destructure from app (verbatim from SuccessRoute)
  const { state, groupGuest, mobile, blockAdmin, courtAssignment, streak, TENNIS_CONFIG } = app;
  const {
    replacedGroup,
    ballPriceCents,
    data,
    canChangeCourt,
    changeTimeRemaining,
    isTimeLimited,
    timeLimitReason,
  } = state;
  const { blockWarningMinutes, getCourtBlockStatus } = blockAdmin;
  const { justAssignedCourt, assignedSessionId, assignedEndTime } = courtAssignment;
  const { registrantStreak } = streak;
  const { currentGroup } = groupGuest;
  const { mobileFlow, mobileCountdown } = mobile;

  return {
    // Computed values (from route)
    isCourtAssignment: computed.isCourtAssignment,
    assignedCourt: computed.assignedCourt,
    position: computed.position,
    estimatedWait: computed.estimatedWait,
    // Direct state values
    justAssignedCourt,
    sessionId: assignedSessionId,
    assignedEndTime,
    replacedGroup,
    canChangeCourt,
    changeTimeRemaining,
    currentGroup,
    mobileCountdown: mobileFlow ? mobileCountdown : null,
    isMobile: mobileFlow,
    isTimeLimited,
    timeLimitReason,
    registrantStreak,
    ballPriceCents,
    // Utilities
    TENNIS_CONFIG,
    getCourtBlockStatus,
    upcomingBlocks: data.upcomingBlocks,
    blockWarningMinutes,
  };
}

/**
 * Build the actions (callback) props for SuccessScreen
 * @param {import('../../../types/appTypes').AppState} app
 * @param {import('../../../types/appTypes').Handlers} handlers
 * @returns {Object} Action props for SuccessScreen
 */
export function buildSuccessActions(app, handlers) {
  // Destructure from app
  const { services } = app;
  const { backend } = services;

  // Destructure from handlers
  const { changeCourt, resetForm } = handlers;

  return {
    onChangeCourt: changeCourt,
    onHome: resetForm,
    onPurchaseBalls: async (sessionId, accountId, options) => {
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
    },
    onLookupMemberAccount: async (memberNumber) => {
      const members = await backend.directory.getMembersByAccount(memberNumber);
      return members;
    },
    onUpdateSessionTournament: async (sessionId, isTournamentFlag) => {
      const result = await backend.commands.updateSessionTournament({
        sessionId,
        isTournament: isTournamentFlag,
      });
      return result;
    },
  };
}
