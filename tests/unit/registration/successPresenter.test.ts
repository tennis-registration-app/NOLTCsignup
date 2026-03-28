/**
 * successPresenter behavioral tests
 *
 * Verifies value mapping, conditional logic, renaming, and
 * async wrapper behavior for buildSuccessModel and buildSuccessActions.
 *
 * Plain mock objects — no jsdom, no platform mocks.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildSuccessModel,
  buildSuccessActions,
} from '../../../src/registration/router/presenters/successPresenter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp({ mobileFlow = false } = {}) {
  return {
    state: {
      ballPriceCents: 500,
      data: {
        upcomingBlocks: [{ courtNumber: 2, startTime: '14:00' }],
      },
    },
    mobile: {
      mobileFlow,
      mobileCountdown: 15,
    },
    admin: {
      blockAdmin: {
        blockWarningMinutes: 10,
        getCourtBlockStatus: vi.fn(),
      },
    },
    TENNIS_CONFIG: { COURTS: { TOTAL_COUNT: 8 } },
    services: {
      backend: {
        commands: {
          purchaseBalls: vi.fn().mockResolvedValue({ ok: true, data: { id: 'purchase-1' } }),
          updateSessionTournament: vi.fn().mockResolvedValue({ ok: true }),
        },
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { member_id: 'm1', display_name: 'Alice' },
          ]),
        },
      },
    },
  };
}

function makeMockWorkflow() {
  return {
    replacedGroup: { players: [{ displayName: 'OldPlayer' }] },
    canChangeCourt: true,
    changeTimeRemaining: 25,
    isTimeLimited: true,
    timeLimitReason: 'overtime',
    courtAssignment: {
      justAssignedCourt: 5,
      assignedSessionId: 'sess-abc',
      assignedEndTime: '2025-01-15T16:00:00Z',
    },
    streak: { registrantStreak: 3 },
    groupGuest: {
      currentGroup: [{ displayName: 'Alice' }, { displayName: 'Bob' }],
    },
  };
}

function makeMockComputed() {
  return {
    isCourtAssignment: true,
    assignedCourt: { number: 5, session: { id: 'sess-abc' } },
    position: 2,
    estimatedWait: 30,
  };
}

function makeMockHandlers() {
  return {
    changeCourt: vi.fn(),
    resetForm: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// buildSuccessModel
// ---------------------------------------------------------------------------

describe('successPresenter', () => {
  describe('buildSuccessModel', () => {
    it('returns all 21 expected keys', () => {
      const model = buildSuccessModel(makeMockApp(), makeMockWorkflow(), makeMockComputed());
      expect(Object.keys(model)).toHaveLength(21);
    });

    it('maps computed values correctly', () => {
      const computed = makeMockComputed();
      const model = buildSuccessModel(makeMockApp(), makeMockWorkflow(), computed);
      expect(model.isCourtAssignment).toBe(true);
      expect(model.assignedCourt).toBe(computed.assignedCourt);
      expect(model.position).toBe(2);
      expect(model.estimatedWait).toBe(30);
    });

    it('maps workflow-sourced fields correctly', () => {
      const workflow = makeMockWorkflow();
      const model = buildSuccessModel(makeMockApp(), workflow, makeMockComputed());
      expect(model.justAssignedCourt).toBe(5);
      expect(model.replacedGroup).toBe(workflow.replacedGroup);
      expect(model.canChangeCourt).toBe(true);
      expect(model.changeTimeRemaining).toBe(25);
      expect(model.currentGroup).toBe(workflow.groupGuest.currentGroup);
      expect(model.isTimeLimited).toBe(true);
      expect(model.timeLimitReason).toBe('overtime');
      expect(model.registrantStreak).toBe(3);
    });

    it('renames assignedSessionId to sessionId', () => {
      const model = buildSuccessModel(makeMockApp(), makeMockWorkflow(), makeMockComputed());
      expect(model.sessionId).toBe('sess-abc');
    });

    it('renames mobileFlow to isMobile', () => {
      const model = buildSuccessModel(makeMockApp({ mobileFlow: true }), makeMockWorkflow(), makeMockComputed());
      expect(model.isMobile).toBe(true);
    });

    it('mobileCountdown becomes null when mobileFlow is false', () => {
      const model = buildSuccessModel(
        makeMockApp({ mobileFlow: false }),
        makeMockWorkflow(),
        makeMockComputed()
      );
      expect(model.mobileCountdown).toBeNull();
    });

    it('mobileCountdown passes through when mobileFlow is true', () => {
      const model = buildSuccessModel(
        makeMockApp({ mobileFlow: true }),
        makeMockWorkflow(),
        makeMockComputed()
      );
      expect(model.mobileCountdown).toBe(15);
    });

    it('maps shell-sourced utility fields correctly', () => {
      const app = makeMockApp();
      const model = buildSuccessModel(app, makeMockWorkflow(), makeMockComputed());
      expect(model.ballPriceCents).toBe(500);
      expect(model.TENNIS_CONFIG).toBe(app.TENNIS_CONFIG);
      expect(model.getCourtBlockStatus).toBe(app.admin.blockAdmin.getCourtBlockStatus);
      expect(model.upcomingBlocks).toBe(app.state.data.upcomingBlocks);
      expect(model.blockWarningMinutes).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // buildSuccessActions
  // ---------------------------------------------------------------------------

  describe('buildSuccessActions', () => {
    it('returns all 5 expected keys', () => {
      const actions = buildSuccessActions(makeMockApp(), makeMockHandlers());
      expect(Object.keys(actions).sort()).toEqual([
        'onChangeCourt',
        'onHome',
        'onLookupMemberAccount',
        'onPurchaseBalls',
        'onUpdateSessionTournament',
      ]);
    });

    it('maps onChangeCourt from changeCourt and onHome from resetForm', () => {
      const handlers = makeMockHandlers();
      const actions = buildSuccessActions(makeMockApp(), handlers);
      expect(actions.onChangeCourt).toBe(handlers.changeCourt);
      expect(actions.onHome).toBe(handlers.resetForm);
    });

    it('onPurchaseBalls calls backend.commands.purchaseBalls with correct params', async () => {
      const app = makeMockApp();
      const actions = buildSuccessActions(app, makeMockHandlers());

      const result = await actions.onPurchaseBalls('sess-1', 'acct-2', {
        splitBalls: true,
        splitAccountIds: ['acct-3'],
      });

      expect(app.services.backend.commands.purchaseBalls).toHaveBeenCalledWith({
        sessionId: 'sess-1',
        accountId: 'acct-2',
        splitBalls: true,
        splitAccountIds: ['acct-3'],
      });
      expect(result).toEqual({ ok: true, data: { id: 'purchase-1' } });
    });

    it('onPurchaseBalls defaults splitBalls to false and splitAccountIds to null', async () => {
      const app = makeMockApp();
      const actions = buildSuccessActions(app, makeMockHandlers());

      await actions.onPurchaseBalls('sess-1', 'acct-2');

      expect(app.services.backend.commands.purchaseBalls).toHaveBeenCalledWith({
        sessionId: 'sess-1',
        accountId: 'acct-2',
        splitBalls: false,
        splitAccountIds: null,
      });
    });

    it('onLookupMemberAccount calls backend.directory.getMembersByAccount', async () => {
      const app = makeMockApp();
      const actions = buildSuccessActions(app, makeMockHandlers());

      const result = await actions.onLookupMemberAccount('M-999');

      expect(app.services.backend.directory.getMembersByAccount).toHaveBeenCalledWith('M-999');
      expect(result).toEqual([{ member_id: 'm1', display_name: 'Alice' }]);
    });

    it('onUpdateSessionTournament calls backend.commands.updateSessionTournament', async () => {
      const app = makeMockApp();
      const actions = buildSuccessActions(app, makeMockHandlers());

      const result = await actions.onUpdateSessionTournament('sess-1', true);

      expect(app.services.backend.commands.updateSessionTournament).toHaveBeenCalledWith({
        sessionId: 'sess-1',
        isTournament: true,
      });
      expect(result).toEqual({ ok: true });
    });
  });
});
