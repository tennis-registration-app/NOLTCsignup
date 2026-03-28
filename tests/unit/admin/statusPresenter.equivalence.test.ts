/**
 * StatusSection Presenter Equivalence Test
 *
 * Proves that buildStatusModel + buildStatusActions produce
 * IDENTICAL data to the legacy StatusSection destructuring.
 *
 * StatusSection has two children:
 * 1. CourtStatusGrid — receives domain objects as pass-through
 * 2. Inline waitlist UI — receives extracted waitingGroups + actions
 *
 * The presenter must provide both sets of data identically.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildStatusModel,
  buildStatusActions,
} from '../../../src/admin/presenters/statusPresenter.js';

// --- Fixtures ---

const mockCourts = [{ number: 1, players: ['Alice'] }, { number: 2 }];
const mockCourtBlocks = [{ courtNumber: 1, reason: 'maintenance' }];
const mockSelectedDate = new Date('2025-01-15');
const mockCurrentTime = new Date('2025-01-15T10:00:00');
const mockWaitingGroups = [
  { names: ['Alice', 'Bob'], players: 2 },
  { names: ['Charlie'], players: 1 },
];

const mockClearCourt = vi.fn();
const mockMoveCourt = vi.fn();
const mockClearAllCourts = vi.fn();
const mockEditBlock = vi.fn();
const mockMoveInWaitlist = vi.fn();
const mockRemoveFromWaitlist = vi.fn();

const mockSetActive = vi.fn();
const mockSetCourts = vi.fn();
const mockActivateEmergency = vi.fn();
const mockDeactivateAll = vi.fn();
const mockClearWetCourt = vi.fn();
const mockClearAllWetCourts = vi.fn();

const mockBackend = { queries: {}, commands: {}, admin: {} };

const statusModel = {
  courts: mockCourts,
  courtBlocks: mockCourtBlocks,
  selectedDate: mockSelectedDate,
  currentTime: mockCurrentTime,
  waitingGroups: mockWaitingGroups,
};

const statusActions = {
  clearCourt: mockClearCourt,
  moveCourt: mockMoveCourt,
  clearAllCourts: mockClearAllCourts,
  editBlock: mockEditBlock,
  moveInWaitlist: mockMoveInWaitlist,
  removeFromWaitlist: mockRemoveFromWaitlist,
};

const wetCourtsModel = {
  active: true,
  courts: new Set([3, 5]),
  enabled: true,
};

const wetCourtsActions = {
  setActive: mockSetActive,
  setCourts: mockSetCourts,
  activateEmergency: mockActivateEmergency,
  deactivateAll: mockDeactivateAll,
  clearCourt: mockClearWetCourt,
  clearAllCourts: mockClearAllWetCourts,
};

const services = {
  backend: mockBackend,
};

/**
 * Legacy StatusSection prop extraction — VERBATIM from StatusSection.jsx
 * before the presenter refactor.
 *
 * Returns what StatusSection passes to its two children:
 * - courtStatusGridProps: the 5 domain objects for CourtStatusGrid
 * - waitlistData: waitingGroups array
 * - waitlistActions: moveInWaitlist, removeFromWaitlist
 */
function legacyStatusExtraction(sModel, sActions, wcModel, wcActions, svc) {
  // Extract values needed for local waitlist UI
  const { waitingGroups } = sModel;
  const { moveInWaitlist, removeFromWaitlist } = sActions;

  return {
    // CourtStatusGrid props (pass-through)
    courtStatusGridProps: {
      statusModel: sModel,
      statusActions: sActions,
      wetCourtsModel: wcModel,
      wetCourtsActions: wcActions,
      services: svc,
    },
    // Waitlist UI data
    waitingGroups,
    moveInWaitlist,
    removeFromWaitlist,
  };
}

/**
 * Presenter-based extraction
 */
function presenterStatusExtraction(sModel, sActions, wcModel, wcActions, svc) {
  const model = buildStatusModel(sModel, wcModel, svc);
  const actions = buildStatusActions(sActions, wcActions);

  return {
    // CourtStatusGrid props (from presenter output)
    courtStatusGridProps: {
      statusModel: model.statusModel,
      statusActions: actions.statusActions,
      wetCourtsModel: model.wetCourtsModel,
      wetCourtsActions: actions.wetCourtsActions,
      services: model.services,
    },
    // Waitlist UI data (from presenter output)
    waitingGroups: model.waitingGroups,
    moveInWaitlist: actions.moveInWaitlist,
    removeFromWaitlist: actions.removeFromWaitlist,
  };
}

describe('StatusSection presenter equivalence', () => {
  const legacy = legacyStatusExtraction(
    statusModel, statusActions, wetCourtsModel, wetCourtsActions, services
  );
  const presenter = presenterStatusExtraction(
    statusModel, statusActions, wetCourtsModel, wetCourtsActions, services
  );

  it('produces same top-level keys', () => {
    expect(Object.keys(presenter).sort()).toEqual(Object.keys(legacy).sort());
  });

  describe('CourtStatusGrid props are reference-equal', () => {
    const gridKeys = ['statusModel', 'statusActions', 'wetCourtsModel', 'wetCourtsActions', 'services'];
    for (const key of gridKeys) {
      it(`${key} is reference-equal`, () => {
        expect(presenter.courtStatusGridProps[key]).toBe(legacy.courtStatusGridProps[key]);
      });
    }
  });

  it('waitingGroups is reference-equal to statusModel.waitingGroups', () => {
    expect(presenter.waitingGroups).toBe(legacy.waitingGroups);
    expect(presenter.waitingGroups).toBe(statusModel.waitingGroups);
  });

  it('moveInWaitlist is reference-equal', () => {
    expect(presenter.moveInWaitlist).toBe(legacy.moveInWaitlist);
    expect(presenter.moveInWaitlist).toBe(mockMoveInWaitlist);
  });

  it('removeFromWaitlist is reference-equal', () => {
    expect(presenter.removeFromWaitlist).toBe(legacy.removeFromWaitlist);
    expect(presenter.removeFromWaitlist).toBe(mockRemoveFromWaitlist);
  });

  it('no extra keys in presenter model', () => {
    const model = buildStatusModel(statusModel, wetCourtsModel, services);
    const expectedKeys = ['statusModel', 'wetCourtsModel', 'services', 'waitingGroups'];
    expect(Object.keys(model).sort()).toEqual(expectedKeys.sort());
  });

  it('no extra keys in presenter actions', () => {
    const actions = buildStatusActions(statusActions, wetCourtsActions);
    const expectedKeys = ['statusActions', 'wetCourtsActions', 'moveInWaitlist', 'removeFromWaitlist'];
    expect(Object.keys(actions).sort()).toEqual(expectedKeys.sort());
  });

  it('type map for model matches expected shape', () => {
    const model = buildStatusModel(statusModel, wetCourtsModel, services);
    const typeMap = {};
    for (const key of Object.keys(model).sort()) {
      typeMap[key] = typeof model[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "services": "object",
        "statusModel": "object",
        "waitingGroups": "object",
        "wetCourtsModel": "object",
      }
    `);
  });

  it('type map for actions matches expected shape', () => {
    const actions = buildStatusActions(statusActions, wetCourtsActions);
    const typeMap = {};
    for (const key of Object.keys(actions).sort()) {
      typeMap[key] = typeof actions[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "moveInWaitlist": "function",
        "removeFromWaitlist": "function",
        "statusActions": "object",
        "wetCourtsActions": "object",
      }
    `);
  });
});
