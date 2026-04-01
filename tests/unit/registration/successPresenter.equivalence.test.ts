/**
 * SuccessScreen Presenter Equivalence Test
 *
 * Proves that buildSuccessModel + buildSuccessActions produce
 * IDENTICAL props to the legacy SuccessRoute destructuring.
 *
 * NOTE: SuccessRoute has computed values (position, estimatedWait, assignedCourt)
 * and async wrapper functions. The test verifies:
 * 1. Static props are identical
 * 2. Computed props are correctly passed through
 * 3. Wrapper functions have correct signatures
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkflowProvider, useWorkflowContext } from '../../../src/registration/context/WorkflowProvider.jsx';

// Mock all platform/window dependencies before importing hooks
vi.mock('../../../src/platform/windowBridge.js', () => ({
  getTennisDataStore: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
  getTennisUI: () => ({
    toast: vi.fn(),
  }),
  getTennisDomain: () => ({
    time: {
      durationForGroupSize: (size: any) => (size <= 2 ? 60 : 90),
    },
    Waitlist: {
      simulateWaitlistEstimates: vi.fn().mockReturnValue([15, 30, 45]),
    },
  }),
  getUI: () => null,
}));

vi.mock('../../../src/platform/registerGlobals.js', () => ({
  setLoadDataGlobal: vi.fn(),
}));

vi.mock('../../../src/lib/backend/index.js', () => ({
  createBackend: () => ({
    queries: {
      subscribeToBoardChanges: vi.fn(() => () => {}),
      refresh: vi.fn().mockResolvedValue(undefined),
      getBoard: vi.fn().mockResolvedValue({ courts: [], waitlist: [] }),
    },
    commands: {
      assignCourtWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
      assignFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      joinWaitlistWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
      purchaseBalls: vi.fn().mockResolvedValue({ ok: true }),
      updateSessionTournament: vi.fn().mockResolvedValue({ ok: true }),
    },
    directory: {
      getAllMembers: vi.fn().mockResolvedValue([]),
      getFrequentPartners: vi.fn().mockResolvedValue([]),
      getMembersByAccount: vi.fn().mockResolvedValue([]),
    },
    admin: {
      clearAllCourts: vi.fn().mockResolvedValue({ ok: true }),
      removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
      createBlock: vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
}));

// Mock @lib
vi.mock('@lib', () => ({
  getCourtBlockStatus: vi.fn().mockResolvedValue({ isBlocked: false }),
  TENNIS_CONFIG: {
    ADMIN: { ACCESS_CODE: '9999' },
    PLAYERS: { MAX_PER_GROUP: 4 },
    TIMING: {
      MAX_PLAY_DURATION_MS: 5400000,
      MAX_PLAY_DURATION_MIN: 90,
      TIMEOUT_WARNING_MIN: 2,
      SESSION_TIMEOUT_MS: 120000,
      SESSION_WARNING_MS: 30000,
      CHANGE_COURT_TIMEOUT_SEC: 30,
      AUTO_RESET_SUCCESS_MS: 5000,
      ALERT_DISPLAY_MS: 3000,
      AUTO_RESET_CLEAR_MS: 5000,
      SINGLES_DURATION_MIN: 60,
      DOUBLES_DURATION_MIN: 90,
      AVG_GAME_TIME_MIN: 75,
      POLL_INTERVAL_MS: 5000,
      UPDATE_INTERVAL_MS: 1000,
    },
    COURTS: { TOTAL_COUNT: 8 },
    DISPLAY: {
      MAX_AUTOCOMPLETE_RESULTS: 10,
      MAX_FREQUENT_PARTNERS: 5,
      MAX_WAITING_DISPLAY: 10,
    },
    PRICING: { TENNIS_BALLS: 5.0 },
    STORAGE: { SETTINGS_KEY: 'tennis_settings' },
    DEVICES: { ADMIN_ID: 'admin-device-001' },
  },
  TennisBusinessLogic: {},
}));

// Import hooks and presenter after mocks
import { useRegistrationAppState } from '../../../src/registration/appHandlers/useRegistrationAppState.js';
import { useRegistrationHandlers } from '../../../src/registration/appHandlers/useRegistrationHandlers.js';
import {
  buildSuccessModel,
  buildSuccessActions,
} from '../../../src/registration/router/presenters/successPresenter.js';

/**
 * Legacy SuccessRoute prop mapping — VERBATIM from SuccessRoute.jsx
 * This is the source of truth we're testing against.
 *
 * NOTE: Computed values (isCourtAssignment, assignedCourt, position, estimatedWait)
 * and async wrappers are handled separately since they're route-level concerns.
 */
function legacySuccessScreenProps(app: any, workflow: any, handlers: any, computed: any) {
  // Destructure from app (shell slices) and workflow (per-flow state)
  const { state, mobile, admin, TENNIS_CONFIG } = app;
  const { courtAssignment, streak, groupGuest } = workflow;
  const { blockAdmin } = admin;
  const {
    ballPriceCents,
    data,
  } = state;
  const { replacedGroup, canChangeCourt, changeTimeRemaining, isTimeLimited, timeLimitReason } = workflow;
  const { blockWarningMinutes, getCourtBlockStatus } = blockAdmin;
  const { justAssignedCourt, assignedSessionId, assignedEndTime } = courtAssignment;
  const { registrantStreak } = streak;
  const { currentGroup } = groupGuest;
  const { mobileFlow, mobileCountdown } = mobile;

  // Destructure from handlers
  const { changeCourt, resetForm } = handlers;

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
    // Callbacks
    onChangeCourt: changeCourt,
    onHome: resetForm,
    // Utilities
    TENNIS_CONFIG,
    getCourtBlockStatus,
    upcomingBlocks: data.upcomingBlocks,
    blockWarningMinutes,
  };
}

/**
 * Build workflow object from captured WorkflowContext value —
 * mirrors what SuccessRoute reads from useWorkflowContext().
 */
function buildWorkflowForPresenter(workflow: any) {
  return {
    replacedGroup: workflow.replacedGroup,
    canChangeCourt: workflow.canChangeCourt,
    changeTimeRemaining: workflow.changeTimeRemaining,
    isTimeLimited: workflow.isTimeLimited,
    timeLimitReason: workflow.timeLimitReason,
    courtAssignment: workflow.courtAssignment,
    streak: workflow.streak,
    groupGuest: workflow.groupGuest,
  };
}

/**
 * Presenter-based prop mapping
 */
function presenterSuccessScreenProps(app: any, workflow: any, handlers: any, computed: any) {
  const w = buildWorkflowForPresenter(workflow);
  return {
    ...buildSuccessModel(app, w, computed),
    ...buildSuccessActions(app, handlers),
  };
}

/**
 * Minimal component to capture both hooks' results.
 */
function HookCapture({ onResult }: any) {
  const app = useRegistrationAppState({ isMobileView: false });
  const handlers = useRegistrationHandlers({ app });
  const workflow = useWorkflowContext();

  // Capture immediately during first render
  if (onResult._captured === undefined) {
    onResult._captured = { app, handlers, workflow };
    onResult({ app, handlers, workflow });
  }

  return null;
}

/**
 * Helper to render hooks and capture results.
 */
function captureHookResults() {
  return new Promise<any>((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const callback = (result: any) => {
      resolve(result);
    };

    // Create mock backend matching the vi.mock above
    const mockBackend = {
      queries: {
        subscribeToBoardChanges: vi.fn(() => () => {}),
        refresh: vi.fn().mockResolvedValue(undefined),
        getBoard: vi.fn().mockResolvedValue({ courts: [], waitlist: [] }),
      },
      commands: {
        assignCourtWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
        assignFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        joinWaitlistWithPlayers: vi.fn().mockResolvedValue({ ok: true }),
        purchaseBalls: vi.fn().mockResolvedValue({ ok: true }),
        updateSessionTournament: vi.fn().mockResolvedValue({ ok: true }),
      },
      directory: {
        getAllMembers: vi.fn().mockResolvedValue([]),
        getFrequentPartners: vi.fn().mockResolvedValue([]),
        getMembersByAccount: vi.fn().mockResolvedValue([]),
      },
      admin: {
        clearAllCourts: vi.fn().mockResolvedValue({ ok: true }),
        removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
        createBlock: vi.fn().mockResolvedValue({ ok: true }),
      },
    };

    const root = createRoot(container);
    root.render(
      React.createElement(
        WorkflowProvider,
        { backend: mockBackend } as any,
        React.createElement(HookCapture, { onResult: callback })
      )
    );
  });
}

describe('SuccessScreen presenter equivalence', () => {
  let app: any;
  let handlers: any;
  let legacy: any;
  let presenter: any;

  // Mock computed values that would be calculated in the route
  const mockComputed = {
    isCourtAssignment: true,
    assignedCourt: { number: 3, session: { id: 'test-session' } },
    position: 2,
    estimatedWait: 30,
  };

  beforeAll(async () => {
    const result = await captureHookResults();
    app = (result as any).app;
    handlers = (result as any).handlers;
    const workflow = (result as any).workflow;
    legacy = legacySuccessScreenProps(app, workflow, handlers, mockComputed);
    presenter = presenterSuccessScreenProps(app, workflow, handlers, mockComputed);
  });

  it('captures hooks successfully', () => {
    expect(app).not.toBeNull();
    expect(handlers).not.toBeNull();
  });

  it('produces same static keys', () => {
    // Compare keys excluding async wrappers (which are new functions each time)
    const staticKeys = Object.keys(legacy)
      .filter((k) => !['onPurchaseBalls', 'onLookupMemberAccount', 'onUpdateSessionTournament'].includes(k))
      .sort();
    const presenterStaticKeys = Object.keys(presenter)
      .filter((k) => !['onPurchaseBalls', 'onLookupMemberAccount', 'onUpdateSessionTournament'].includes(k))
      .sort();
    expect(presenterStaticKeys).toEqual(staticKeys);
  });

  it('produces identical values for static props', () => {
    const staticKeys = Object.keys(legacy).filter(
      (k) => !['onPurchaseBalls', 'onLookupMemberAccount', 'onUpdateSessionTournament'].includes(k)
    );

    for (const key of staticKeys) {
      if (typeof legacy[key] === 'function') {
        // Functions must be reference-equal
        expect(presenter[key]).toBe(legacy[key]);
      } else {
        // Data must be deep-equal
        expect(presenter[key]).toEqual(legacy[key]);
      }
    }
  });

  it('includes async wrapper functions', () => {
    expect(typeof presenter.onPurchaseBalls).toBe('function');
    expect(typeof presenter.onLookupMemberAccount).toBe('function');
    expect(typeof presenter.onUpdateSessionTournament).toBe('function');
  });

  it('computed values are passed through correctly', () => {
    expect(presenter.isCourtAssignment).toBe(mockComputed.isCourtAssignment);
    expect(presenter.assignedCourt).toEqual(mockComputed.assignedCourt);
    expect(presenter.position).toBe(mockComputed.position);
    expect(presenter.estimatedWait).toBe(mockComputed.estimatedWait);
  });

  it('all expected props are present', () => {
    const expectedProps = [
      // Computed values
      'isCourtAssignment',
      'assignedCourt',
      'position',
      'estimatedWait',
      // Direct state values
      'justAssignedCourt',
      'sessionId',
      'assignedEndTime',
      'replacedGroup',
      'canChangeCourt',
      'changeTimeRemaining',
      'currentGroup',
      'mobileCountdown',
      'isMobile',
      'isTimeLimited',
      'timeLimitReason',
      'registrantStreak',
      'ballPriceCents',
      // Callbacks
      'onChangeCourt',
      'onHome',
      'onPurchaseBalls',
      'onLookupMemberAccount',
      'onUpdateSessionTournament',
      // Utilities
      'TENNIS_CONFIG',
      'getCourtBlockStatus',
      'upcomingBlocks',
      'blockWarningMinutes',
    ];

    for (const prop of expectedProps) {
      expect(presenter).toHaveProperty(prop);
    }
    expect(Object.keys(presenter).length).toBe(expectedProps.length);
  });
});
