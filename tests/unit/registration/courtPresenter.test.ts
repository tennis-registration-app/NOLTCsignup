/**
 * courtPresenter behavioral tests
 *
 * Verifies value mapping, renaming, and wrapper behavior for
 * buildCourtModel and buildCourtActions.
 *
 * Plain mock objects — no jsdom, no platform mocks.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildCourtModel,
  buildCourtActions,
} from '../../../src/registration/router/presenters/courtPresenter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp() {
  return {
    derived: { isMobileView: true },
    mobile: { mobileFlow: false },
    refs: { successResetTimerRef: { current: null } },
    setters: {
      setShowSuccess: vi.fn(),
      setCurrentScreen: vi.fn(),
    },
    CONSTANTS: { AUTO_RESET_SUCCESS_MS: 5000 },
  };
}

function makeMockWorkflow() {
  return {
    groupGuest: { currentGroup: [{ displayName: 'Alice' }] },
    courtAssignment: { justAssignedCourt: 3 },
    hasWaitlistPriority: true,
    currentWaitlistEntryId: 'wl-42',
    isChangingCourt: false,
    displacement: null,
    originalCourtData: null,
    setDisplacement: vi.fn(),
    setIsChangingCourt: vi.fn(),
    setWasOvertimeCourt: vi.fn(),
    setOriginalCourtData: vi.fn(),
  };
}

function makeMockHandlers() {
  return {
    getCourtData: vi.fn(),
    assignCourtToGroup: vi.fn().mockResolvedValue(undefined),
    sendGroupToWaitlist: vi.fn().mockResolvedValue(undefined),
    clearSuccessResetTimer: vi.fn(),
    resetForm: vi.fn(),
    saveCourtData: vi.fn(),
    deferWaitlistEntry: vi.fn(),
    undoOvertimeAndClearPrevious: vi.fn().mockResolvedValue(undefined),
    assignNextFromWaitlist: vi.fn(),
    joinWaitlistDeferred: vi.fn(),
  };
}

function makeMockComputed() {
  return {
    availableCourts: [1, 4, 7],
    showingOvertimeCourts: true,
    hasWaitingGroups: true,
    waitingGroupsCount: 3,
    upcomingBlocks: [{ courtNumber: 2, startTime: '10:00' }],
  };
}

function makeMockActionsComputed() {
  return {
    computedAvailableCourts: [1, 4, 7],
  };
}

// ---------------------------------------------------------------------------
// buildCourtModel
// ---------------------------------------------------------------------------

describe('courtPresenter', () => {
  describe('buildCourtModel', () => {
    it('returns all 9 expected keys', () => {
      const model = buildCourtModel(makeMockApp() as any, makeMockWorkflow(), makeMockComputed());
      expect(Object.keys(model).sort()).toEqual([
        'availableCourts',
        'currentGroup',
        'currentWaitlistEntryId',
        'hasWaitingGroups',
        'hasWaitlistPriority',
        'isMobileView',
        'showingOvertimeCourts',
        'upcomingBlocks',
        'waitingGroupsCount',
      ]);
    });

    it('maps computed values by reference', () => {
      const computed = makeMockComputed();
      const model = buildCourtModel(makeMockApp() as any, makeMockWorkflow(), computed);
      expect(model.availableCourts).toBe(computed.availableCourts);
      expect(model.showingOvertimeCourts).toBe(true);
      expect(model.hasWaitingGroups).toBe(true);
      expect(model.waitingGroupsCount).toBe(3);
      expect(model.upcomingBlocks).toBe(computed.upcomingBlocks);
    });

    it('maps workflow-sourced fields correctly', () => {
      const workflow = makeMockWorkflow();
      const model = buildCourtModel(makeMockApp() as any, workflow, makeMockComputed());
      expect(model.currentGroup).toBe(workflow.groupGuest.currentGroup);
      expect(model.hasWaitlistPriority).toBe(true);
      expect(model.currentWaitlistEntryId).toBe('wl-42');
    });

    it('maps shell-sourced isMobileView from app.derived', () => {
      const app = makeMockApp();
      const model = buildCourtModel(app as any, makeMockWorkflow() as any, makeMockComputed() as any);
      expect(model.isMobileView).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // buildCourtActions
  // ---------------------------------------------------------------------------

  describe('buildCourtActions', () => {
    it('returns all 7 expected keys', () => {
      const actions = buildCourtActions(
        makeMockApp(), makeMockWorkflow(), makeMockHandlers(), makeMockActionsComputed()
      );
      expect(Object.keys(actions).sort()).toEqual([
        'onAssignNext',
        'onCourtSelect',
        'onDeferWaitlist',
        'onGoBack',
        'onJoinWaitlist',
        'onJoinWaitlistDeferred',
        'onStartOver',
      ]);
    });

    it('onDeferWaitlist delegates to deferWaitlistEntry', () => {
      const handlers = makeMockHandlers();
      const actions = buildCourtActions(
        makeMockApp(), makeMockWorkflow(), handlers, makeMockActionsComputed()
      );
      actions.onDeferWaitlist('entry-99');
      expect(handlers.deferWaitlistEntry).toHaveBeenCalledWith('entry-99');
    });

    it('onStartOver is resetForm by reference', () => {
      const handlers = makeMockHandlers();
      const actions = buildCourtActions(
        makeMockApp(), makeMockWorkflow(), handlers, makeMockActionsComputed()
      );
      expect(actions.onStartOver).toBe(handlers.resetForm);
    });

    it('onAssignNext delegates to assignNextFromWaitlist', () => {
      const handlers = makeMockHandlers();
      const actions = buildCourtActions(
        makeMockApp(), makeMockWorkflow(), handlers, makeMockActionsComputed()
      );
      actions.onAssignNext();
      expect(handlers.assignNextFromWaitlist).toHaveBeenCalledOnce();
    });

    // -- onCourtSelect: normal path --

    it('onCourtSelect (normal) calls assignCourtToGroup with court number and selectable count', async () => {
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.isChangingCourt = false;
      const computed = { computedAvailableCourts: [1, 4, 7] };

      const actions = buildCourtActions(makeMockApp() as any, workflow, handlers, computed);
      await actions.onCourtSelect(5);

      expect(handlers.undoOvertimeAndClearPrevious).not.toHaveBeenCalled();
      expect(handlers.assignCourtToGroup).toHaveBeenCalledWith(5, 3);
      expect(workflow.setIsChangingCourt).toHaveBeenCalledWith(false);
      expect(workflow.setWasOvertimeCourt).toHaveBeenCalledWith(false);
    });

    // -- onCourtSelect: changing-court path --

    it('onCourtSelect (changing court) undoes overtime first, then assigns', async () => {
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.isChangingCourt = true;
      workflow.displacement = { courtNumber: 3, group: [] };
      const computed = { computedAvailableCourts: [2, 6] };

      const callOrder: string[] = [];
      handlers.undoOvertimeAndClearPrevious.mockImplementation(async () => {
        callOrder.push('undo');
      });
      handlers.assignCourtToGroup.mockImplementation(async () => {
        callOrder.push('assign');
      });

      const actions = buildCourtActions(makeMockApp() as any, workflow, handlers, computed);
      await actions.onCourtSelect(6);

      expect(callOrder).toEqual(['undo', 'assign']);
      expect(handlers.undoOvertimeAndClearPrevious).toHaveBeenCalledWith(
        3, // justAssignedCourt from workflow.courtAssignment
        workflow.displacement
      );
      expect(handlers.assignCourtToGroup).toHaveBeenCalledWith(6, 2);
      expect(workflow.setDisplacement).toHaveBeenCalledWith(null);
      expect(workflow.setIsChangingCourt).toHaveBeenCalledWith(false);
      expect(workflow.setWasOvertimeCourt).toHaveBeenCalledWith(false);
    });

    // -- onJoinWaitlist --

    it('onJoinWaitlist (non-mobile) sends group, shows success, starts reset timer', async () => {
      vi.useFakeTimers();
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.groupGuest.currentGroup = [{ displayName: 'Bob' }];
      const app = makeMockApp();
      app.mobile.mobileFlow = false;

      const actions = buildCourtActions(app as any, workflow as any, handlers as any, makeMockActionsComputed() as any);
      await actions.onJoinWaitlist();

      expect(handlers.sendGroupToWaitlist).toHaveBeenCalledWith([{ displayName: 'Bob' }]);
      expect(app.setters.setShowSuccess).toHaveBeenCalledWith(true);
      expect(handlers.clearSuccessResetTimer).toHaveBeenCalledOnce();
      // Timer should be set
      expect(app.refs.successResetTimerRef.current).not.toBeNull();
      // Advance timer — should call resetForm
      vi.advanceTimersByTime(5000);
      expect(handlers.resetForm).toHaveBeenCalledOnce();
      expect(app.refs.successResetTimerRef.current).toBeNull();
      vi.useRealTimers();
    });

    it('onJoinWaitlist (mobile) sends group, shows success, does NOT start timer', async () => {
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.groupGuest.currentGroup = [{ displayName: 'Carol' }];
      const app = makeMockApp();
      app.mobile.mobileFlow = true;

      const actions = buildCourtActions(app as any, workflow as any, handlers as any, makeMockActionsComputed() as any);
      await actions.onJoinWaitlist();

      expect(handlers.sendGroupToWaitlist).toHaveBeenCalledWith([{ displayName: 'Carol' }]);
      expect(app.setters.setShowSuccess).toHaveBeenCalledWith(true);
      // No timer logic in mobile mode
      expect(handlers.clearSuccessResetTimer).not.toHaveBeenCalled();
      expect(app.refs.successResetTimerRef.current).toBeNull();
    });

    it('onJoinWaitlist with null group defaults to empty array', async () => {
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.groupGuest.currentGroup = null;
      const app = makeMockApp();
      app.mobile.mobileFlow = true;

      const actions = buildCourtActions(app as any, workflow as any, handlers as any, makeMockActionsComputed() as any);
      await actions.onJoinWaitlist();

      expect(handlers.sendGroupToWaitlist).toHaveBeenCalledWith([]);
    });

    // -- onGoBack --

    it('onGoBack navigates to group screen and resets workflow flags', () => {
      const workflow = makeMockWorkflow();
      workflow.isChangingCourt = false;
      const app = makeMockApp();
      const handlers = makeMockHandlers();

      const actions = buildCourtActions(app as any, workflow as any, handlers as any, makeMockActionsComputed() as any);
      actions.onGoBack();

      expect(app.setters.setCurrentScreen).toHaveBeenCalledWith('group', 'courtGoBack');
      expect(workflow.setIsChangingCourt).toHaveBeenCalledWith(false);
      expect(workflow.setWasOvertimeCourt).toHaveBeenCalledWith(false);
    });

    it('onGoBack restores original court data when changing court', () => {
      const workflow = makeMockWorkflow();
      workflow.isChangingCourt = true;
      workflow.courtAssignment.justAssignedCourt = 3;
      const originalCourt = { number: 3, session: { id: 'old' } };
      workflow.originalCourtData = originalCourt;

      const courtDataObj = { courts: [null, null, { number: 3, session: { id: 'new' } }] };
      const handlers = makeMockHandlers();
      handlers.getCourtData.mockReturnValue(courtDataObj);
      const app = makeMockApp();

      const actions = buildCourtActions(app as any, workflow as any, handlers as any, makeMockActionsComputed() as any);
      actions.onGoBack();

      expect(handlers.getCourtData).toHaveBeenCalledOnce();
      // Court at index 2 (courtNumber 3 - 1) should be restored
      expect(courtDataObj.courts[2]).toBe(originalCourt);
      expect(handlers.saveCourtData).toHaveBeenCalledWith(courtDataObj);
      expect(workflow.setOriginalCourtData).toHaveBeenCalledWith(null);
    });

    it('onJoinWaitlistDeferred delegates with currentGroup', () => {
      const handlers = makeMockHandlers();
      const workflow = makeMockWorkflow();
      workflow.groupGuest.currentGroup = [{ displayName: 'Dan' }];

      const actions = buildCourtActions(makeMockApp() as any, workflow, handlers, makeMockActionsComputed());
      actions.onJoinWaitlistDeferred();

      expect(handlers.joinWaitlistDeferred).toHaveBeenCalledWith([{ displayName: 'Dan' }]);
    });
  });
});
