/**
 * WaitlistSection Presenter Equivalence Test
 *
 * Proves that buildWaitlistModel + buildWaitlistActions produce
 * IDENTICAL data to the legacy WaitlistSection direct prop usage.
 *
 * The presenter now accepts controller domain objects (WaitlistModel,
 * WaitlistActions) rather than raw values.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildWaitlistModel,
  buildWaitlistActions,
} from '../../../src/admin/presenters/waitlistPresenter.js';

// --- Fixtures ---

const mockWaitingGroups = [
  { names: ['Alice', 'Bob'], players: 2 },
  { names: ['Charlie'], players: 1 },
  { names: ['Diana', 'Eve', 'Frank'], players: 3 },
];

const mockMoveInWaitlist = vi.fn();
const mockRemoveFromWaitlist = vi.fn();

// Domain objects (as produced by buildAdminController)
const mockWaitlistModel = { waitingGroups: mockWaitingGroups };
const mockWaitlistActions = {
  moveInWaitlist: mockMoveInWaitlist,
  removeFromWaitlist: mockRemoveFromWaitlist,
};

/**
 * Legacy WaitlistSection prop extraction — VERBATIM from WaitlistSection.jsx
 * before the presenter refactor.
 *
 * Returns what WaitlistSection used directly from its props.
 */
function legacyWaitlistExtraction(waitingGroups, moveInWaitlist, removeFromWaitlist) {
  return {
    waitingGroups,
    moveInWaitlist,
    removeFromWaitlist,
  };
}

/**
 * Presenter-based extraction (now accepts domain objects)
 */
function presenterWaitlistExtraction(waitlistModel, waitlistActions) {
  const model = buildWaitlistModel(waitlistModel);
  const actions = buildWaitlistActions(waitlistActions);
  return {
    waitingGroups: model.waitingGroups,
    moveInWaitlist: actions.moveInWaitlist,
    removeFromWaitlist: actions.removeFromWaitlist,
  };
}

describe('WaitlistSection presenter equivalence', () => {
  const legacy = legacyWaitlistExtraction(
    mockWaitingGroups, mockMoveInWaitlist, mockRemoveFromWaitlist
  );
  const presenter = presenterWaitlistExtraction(
    mockWaitlistModel, mockWaitlistActions
  );

  it('produces same keys', () => {
    expect(Object.keys(presenter).sort()).toEqual(Object.keys(legacy).sort());
  });

  it('waitingGroups is reference-equal', () => {
    expect(presenter.waitingGroups).toBe(legacy.waitingGroups);
    expect(presenter.waitingGroups).toBe(mockWaitingGroups);
  });

  it('moveInWaitlist is reference-equal', () => {
    expect(presenter.moveInWaitlist).toBe(legacy.moveInWaitlist);
    expect(presenter.moveInWaitlist).toBe(mockMoveInWaitlist);
  });

  it('removeFromWaitlist is reference-equal', () => {
    expect(presenter.removeFromWaitlist).toBe(legacy.removeFromWaitlist);
    expect(presenter.removeFromWaitlist).toBe(mockRemoveFromWaitlist);
  });

  it('model has exactly 1 key', () => {
    const model = buildWaitlistModel(mockWaitlistModel);
    expect(Object.keys(model)).toEqual(['waitingGroups']);
  });

  it('actions has exactly 2 keys', () => {
    const actions = buildWaitlistActions(mockWaitlistActions);
    expect(Object.keys(actions).sort()).toEqual(['moveInWaitlist', 'removeFromWaitlist']);
  });

  it('type map for model matches expected shape', () => {
    const model = buildWaitlistModel(mockWaitlistModel);
    const typeMap = {};
    for (const key of Object.keys(model).sort()) {
      typeMap[key] = typeof model[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "waitingGroups": "object",
      }
    `);
  });

  it('type map for actions matches expected shape', () => {
    const actions = buildWaitlistActions(mockWaitlistActions);
    const typeMap = {};
    for (const key of Object.keys(actions).sort()) {
      typeMap[key] = typeof actions[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "moveInWaitlist": "function",
        "removeFromWaitlist": "function",
      }
    `);
  });

  describe('works with empty waitlist', () => {
    it('handles empty array', () => {
      const model = buildWaitlistModel({ waitingGroups: [] });
      expect(model.waitingGroups).toEqual([]);
      expect(model.waitingGroups).toHaveLength(0);
    });
  });
});
