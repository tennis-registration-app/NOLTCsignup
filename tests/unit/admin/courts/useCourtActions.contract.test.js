/**
 * useCourtActions Contract Test
 *
 * Freezes the 23-key return shape of useCourtActions.
 * Changes to the hook's public surface will fail this test,
 * requiring explicit acknowledgment via snapshot update.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Mock platform dependencies that useCourtActions imports
vi.mock('../../../../src/platform/windowBridge.js', () => ({
  getTennis: () => ({}),
  getTennisUI: () => ({ toast: vi.fn() }),
  getTennisDataStore: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../../src/platform/prefsStorage.js', () => ({
  getPref: vi.fn(() => null),
}));

vi.mock('../../../../src/lib/config.js', () => ({
  TENNIS_CONFIG: {
    STORAGE: { UPDATE_EVENT: 'tennisDataUpdate' },
  },
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useCourtActions } from '../../../../src/admin/courts/useCourtActions.js';

// Expected keys (alphabetical) — update this when the contract changes
const EXPECTED_KEYS = [
  'cancelMove',
  'clearInFlight',
  'closeEditingBlock',
  'closeEditingGame',
  'editingBlock',
  'editingGame',
  'handleActivateWet',
  'handleAllCourtsDry',
  'handleBlockSaved',
  'handleClearCourt',
  'handleDeactivateWet',
  'handleEditClick',
  'handleMoveCourt',
  'handleSaveGame',
  'handleWetCourtToggle',
  'initiateMove',
  'movingFrom',
  'optimisticCourts',
  'optimisticWetCourts',
  'savingGame',
  'showActions',
  'toggleActions',
  'wetToggleInFlight',
];

const STATE_KEYS = ['movingFrom', 'clearInFlight', 'wetToggleInFlight', 'optimisticCourts', 'optimisticWetCourts', 'showActions', 'editingGame', 'editingBlock', 'savingGame'];
const HANDLER_KEYS = [
  'handleActivateWet',
  'handleDeactivateWet',
  'handleWetCourtToggle',
  'handleClearCourt',
  'handleSaveGame',
  'handleAllCourtsDry',
  'handleEditClick',
  'handleMoveCourt',
  'initiateMove',
  'cancelMove',
  'toggleActions',
  'closeEditingGame',
  'closeEditingBlock',
  'handleBlockSaved',
];

describe('useCourtActions contract', () => {
  let hookResult = null;

  beforeAll(async () => {
    // Render a minimal component that captures the hook return value
    const container = document.createElement('div');
    document.body.appendChild(container);

    function Harness() {
      const result = useCourtActions({
        statusActions: { clearCourt: vi.fn(), moveCourt: vi.fn() },
        wetCourtsActions: { activateEmergency: vi.fn(), deactivateAll: vi.fn(), clearCourt: vi.fn(), clearAllCourts: vi.fn() },
        services: { backend: { admin: { updateSession: vi.fn() } } },
        courts: [],
        courtBlocks: [],
        wetCourts: new Set(),
      });
      hookResult = result;
      return null;
    }

    const root = createRoot(container);
    await new Promise((resolve) => {
      root.render(React.createElement(Harness));
      // Give React time to render
      setTimeout(resolve, 50);
    });
  });

  it('returns exactly 23 keys', () => {
    expect(Object.keys(hookResult)).toHaveLength(23);
  });

  it('keys match expected shape (inline snapshot)', () => {
    const keys = Object.keys(hookResult).sort();
    expect(keys).toMatchInlineSnapshot(`
      [
        "cancelMove",
        "clearInFlight",
        "closeEditingBlock",
        "closeEditingGame",
        "editingBlock",
        "editingGame",
        "handleActivateWet",
        "handleAllCourtsDry",
        "handleBlockSaved",
        "handleClearCourt",
        "handleDeactivateWet",
        "handleEditClick",
        "handleMoveCourt",
        "handleSaveGame",
        "handleWetCourtToggle",
        "initiateMove",
        "movingFrom",
        "optimisticCourts",
        "optimisticWetCourts",
        "savingGame",
        "showActions",
        "toggleActions",
        "wetToggleInFlight",
      ]
    `);
  });

  it('matches EXPECTED_KEYS constant', () => {
    expect(Object.keys(hookResult).sort()).toEqual(EXPECTED_KEYS);
  });

  describe('state keys have expected initial values', () => {
    it('movingFrom is null', () => {
      expect(hookResult.movingFrom).toBeNull();
    });

    it('clearInFlight is false', () => {
      expect(hookResult.clearInFlight).toBe(false);
    });

    it('wetToggleInFlight is false', () => {
      expect(hookResult.wetToggleInFlight).toBe(false);
    });

    it('optimisticCourts is null', () => {
      expect(hookResult.optimisticCourts).toBeNull();
    });

    it('optimisticWetCourts is null', () => {
      expect(hookResult.optimisticWetCourts).toBeNull();
    });

    it('showActions is null', () => {
      expect(hookResult.showActions).toBeNull();
    });

    it('editingGame is null', () => {
      expect(hookResult.editingGame).toBeNull();
    });

    it('editingBlock is null', () => {
      expect(hookResult.editingBlock).toBeNull();
    });

    it('savingGame is false', () => {
      expect(hookResult.savingGame).toBe(false);
    });
  });

  describe('handler keys are functions', () => {
    for (const key of HANDLER_KEYS) {
      it(`${key} is a function`, () => {
        expect(typeof hookResult[key]).toBe('function');
      });
    }
  });

  it('type map matches expected shape', () => {
    const typeMap = {};
    for (const key of Object.keys(hookResult).sort()) {
      typeMap[key] = typeof hookResult[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "cancelMove": "function",
        "clearInFlight": "boolean",
        "closeEditingBlock": "function",
        "closeEditingGame": "function",
        "editingBlock": "object",
        "editingGame": "object",
        "handleActivateWet": "function",
        "handleAllCourtsDry": "function",
        "handleBlockSaved": "function",
        "handleClearCourt": "function",
        "handleDeactivateWet": "function",
        "handleEditClick": "function",
        "handleMoveCourt": "function",
        "handleSaveGame": "function",
        "handleWetCourtToggle": "function",
        "initiateMove": "function",
        "movingFrom": "object",
        "optimisticCourts": "object",
        "optimisticWetCourts": "object",
        "savingGame": "boolean",
        "showActions": "object",
        "toggleActions": "function",
        "wetToggleInFlight": "boolean",
      }
    `);
  });
});
