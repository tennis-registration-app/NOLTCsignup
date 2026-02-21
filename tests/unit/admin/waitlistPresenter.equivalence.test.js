/**
 * WaitlistSection Presenter Equivalence Test
 *
 * Proves that buildWaitlistModel + buildWaitlistActions produce
 * IDENTICAL data to the legacy WaitlistSection direct prop usage.
 *
 * WaitlistSection currently bypasses the controller — it receives
 * raw props from App.jsx. The presenter wraps them into the
 * model/actions pattern for consistency.
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
 * Presenter-based extraction
 */
function presenterWaitlistExtraction(waitingGroups, moveInWaitlist, removeFromWaitlist) {
  const model = buildWaitlistModel(waitingGroups);
  const actions = buildWaitlistActions(moveInWaitlist, removeFromWaitlist);
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
    mockWaitingGroups, mockMoveInWaitlist, mockRemoveFromWaitlist
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
    const model = buildWaitlistModel(mockWaitingGroups);
    expect(Object.keys(model)).toEqual(['waitingGroups']);
  });

  it('actions has exactly 2 keys', () => {
    const actions = buildWaitlistActions(mockMoveInWaitlist, mockRemoveFromWaitlist);
    expect(Object.keys(actions).sort()).toEqual(['moveInWaitlist', 'removeFromWaitlist']);
  });

  it('type map for model matches expected shape', () => {
    const model = buildWaitlistModel(mockWaitingGroups);
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
    const actions = buildWaitlistActions(mockMoveInWaitlist, mockRemoveFromWaitlist);
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
      const model = buildWaitlistModel([]);
      expect(model.waitingGroups).toEqual([]);
      expect(model.waitingGroups).toHaveLength(0);
    });
  });
});
