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

import type { AppState, Handlers } from '../../../types/appTypes.js';
import { logger } from '../../../lib/logger.js';

export interface SuccessModelComputed {
  isCourtAssignment: boolean;
  assignedCourt: any | null;
  position: number;
  estimatedWait: number;
}

export interface SuccessModel {
  // Computed values (from route)
  isCourtAssignment: boolean;
  assignedCourt: any | null;
  position: number;
  estimatedWait: number;
  // Direct state values
  justAssignedCourt: number | null;
  sessionId: string | null;
  assignedEndTime: string | null;
  replacedGroup: any;
  canChangeCourt: boolean;
  changeTimeRemaining: number | null;
  currentGroup: any[] | null;
  mobileCountdown: number | null;
  isMobile: boolean;
  isTimeLimited: boolean;
  timeLimitReason: string | null;
  registrantStreak: any;
  ballPriceCents: number | null;
  // Utilities
  TENNIS_CONFIG: any;
  getCourtBlockStatus: Function;
  upcomingBlocks: any[];
  blockWarningMinutes: number | null;
}

export interface SuccessActions {
  onChangeCourt: Function;
  onHome: Function;
  onPurchaseBalls: (sessionId: string, accountId: string, options?: any) => Promise<any>;
  onLookupMemberAccount: (memberNumber: string) => Promise<any>;
  onUpdateSessionTournament: (sessionId: string, isTournamentFlag: boolean) => Promise<any>;
}

/**
 * Build the model (data) props for SuccessScreen
 */
export function buildSuccessModel(app: AppState, computed: SuccessModelComputed): SuccessModel {
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
 */
export function buildSuccessActions(app: AppState, handlers: Handlers): SuccessActions {
  // Destructure from app
  const { services } = app;
  const { backend } = services;

  // Destructure from handlers
  const { changeCourt, resetForm } = handlers;

  return {
    onChangeCourt: changeCourt,
    onHome: resetForm,
    onPurchaseBalls: async (sessionId: string, accountId: string, options?: any) => {
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
    onLookupMemberAccount: async (memberNumber: string) => {
      const members = await backend.directory.getMembersByAccount(memberNumber);
      return members;
    },
    onUpdateSessionTournament: async (sessionId: string, isTournamentFlag: boolean) => {
      const result = await backend.commands.updateSessionTournament({
        sessionId,
        isTournament: isTournamentFlag,
      });
      return result;
    },
  };
}
