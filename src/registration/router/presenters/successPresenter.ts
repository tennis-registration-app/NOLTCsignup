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
 *
 * Workflow-owned fields (11) are sourced from the `workflow` parameter,
 * which SuccessRoute reads directly from WorkflowContext.
 * Shell/global fields continue to come from `app`.
 */

import type { AppState, CommandResponse, DirectoryMember, DomainCourt, GroupPlayer, Handlers, ReplacedGroup, TennisConfig, UpcomingBlock } from '../../../types/appTypes.js';
import { logger } from '../../../lib/logger';

type PurchaseBallsOptions = { splitBalls?: boolean; splitAccountIds?: string[] | null };

export interface SuccessModelComputed {
  isCourtAssignment: boolean;
  assignedCourt: DomainCourt | null;
  position: number;
  estimatedWait: number;
}

/** Workflow-owned fields that buildSuccessModel reads. */
export interface SuccessWorkflow {
  replacedGroup: ReplacedGroup | null;
  canChangeCourt: boolean;
  changeTimeRemaining: number;
  isTimeLimited: boolean;
  timeLimitReason: string | null;
  courtAssignment: {
    justAssignedCourt: number | null;
    assignedSessionId: string | null;
    assignedEndTime: string | null;
  };
  streak: {
    registrantStreak: number;
  };
  groupGuest: {
    currentGroup: GroupPlayer[] | null;
  };
}

export interface SuccessModel {
  // Computed values (from route)
  isCourtAssignment: boolean;
  assignedCourt: DomainCourt | null;
  position: number;
  estimatedWait: number;
  // Direct state values
  justAssignedCourt: number | null;
  sessionId: string | null;
  assignedEndTime: string | null;
  replacedGroup: ReplacedGroup | null;
  canChangeCourt: boolean;
  changeTimeRemaining: number | null;
  currentGroup: GroupPlayer[] | null;
  mobileCountdown: number | null;
  isMobile: boolean;
  isTimeLimited: boolean;
  timeLimitReason: string | null;
  registrantStreak: number;
  ballPriceCents: number | null;
  // Utilities
  TENNIS_CONFIG: TennisConfig;
  getCourtBlockStatus: Function;
  upcomingBlocks?: UpcomingBlock[];
  blockWarningMinutes: number | null;
}

export interface SuccessActions {
  onChangeCourt: Function;
  onHome: Function;
  onPurchaseBalls: (sessionId: string, accountId: string, options?: PurchaseBallsOptions) => Promise<CommandResponse>;
  onLookupMemberAccount: (memberNumber: string) => Promise<DirectoryMember[]>;
  onUpdateSessionTournament: (sessionId: string, isTournamentFlag: boolean) => Promise<CommandResponse>;
}

/**
 * Build the model (data) props for SuccessScreen.
 *
 * Workflow-owned fields come from the `workflow` parameter (WorkflowContext).
 * Shell/global fields come from `app`.
 */
export function buildSuccessModel(app: AppState, workflow: SuccessWorkflow, computed: SuccessModelComputed): SuccessModel {
  // Shell fields from app
  const { state, mobile, admin, TENNIS_CONFIG } = app;
  const { blockAdmin } = admin;
  const { ballPriceCents, data } = state;
  const { blockWarningMinutes, getCourtBlockStatus } = blockAdmin;
  const { mobileFlow, mobileCountdown } = mobile;

  // Workflow fields from context
  const { replacedGroup, canChangeCourt, changeTimeRemaining, isTimeLimited, timeLimitReason } = workflow;
  const { justAssignedCourt, assignedSessionId, assignedEndTime } = workflow.courtAssignment;
  const { registrantStreak } = workflow.streak;
  const { currentGroup } = workflow.groupGuest;

  return {
    // Computed values (from route)
    isCourtAssignment: computed.isCourtAssignment,
    assignedCourt: computed.assignedCourt,
    position: computed.position,
    estimatedWait: computed.estimatedWait,
    // Direct state values — workflow-sourced
    justAssignedCourt,
    sessionId: assignedSessionId,
    assignedEndTime,
    replacedGroup,
    canChangeCourt,
    changeTimeRemaining,
    currentGroup,
    isTimeLimited,
    timeLimitReason,
    registrantStreak,
    // Direct state values — shell-sourced
    mobileCountdown: mobileFlow ? mobileCountdown : null,
    isMobile: mobileFlow,
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
    onPurchaseBalls: async (sessionId: string, accountId: string, options?: PurchaseBallsOptions) => {
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
