/**
 * useCourtActions Contract Test
 *
 * Freezes the 16-key return shape of useCourtActions.
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
  'closeEditingBlock',
  'closeEditingGame',
  'editingBlock',
  'editingGame',
  'handleAllCourtsDry',
  'handleBlockSaved',
  'handleClearCourt',
  'handleEditClick',
  'handleMoveCourt',
  'handleSaveGame',
  'handleWetCourtToggle',
  'initiateMove',
  'movingFrom',
  'savingGame',
  'showActions',
  'toggleActions',
];

const STATE_KEYS = ['movingFrom', 'showActions', 'editingGame', 'editingBlock', 'savingGame'];
const HANDLER_KEYS = [
  'handleWetCourtToggle',
  'handleClearCourt',
  'handleSaveGame',
  'handleAllCourtsDry',
  'handleEditClick',
  'handleMoveCourt',
  'initiateMove',
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
        wetCourtsActions: { clearCourt: vi.fn(), clearAllCourts: vi.fn() },
        services: { backend: { admin: { updateSession: vi.fn() } } },
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

  it('returns exactly 16 keys', () => {
    expect(Object.keys(hookResult)).toHaveLength(16);
  });

  it('keys match expected shape (inline snapshot)', () => {
    const keys = Object.keys(hookResult).sort();
    expect(keys).toMatchInlineSnapshot(`
      [
        "closeEditingBlock",
        "closeEditingGame",
        "editingBlock",
        "editingGame",
        "handleAllCourtsDry",
        "handleBlockSaved",
        "handleClearCourt",
        "handleEditClick",
        "handleMoveCourt",
        "handleSaveGame",
        "handleWetCourtToggle",
        "initiateMove",
        "movingFrom",
        "savingGame",
        "showActions",
        "toggleActions",
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
        "closeEditingBlock": "function",
        "closeEditingGame": "function",
        "editingBlock": "object",
        "editingGame": "object",
        "handleAllCourtsDry": "function",
        "handleBlockSaved": "function",
        "handleClearCourt": "function",
        "handleEditClick": "function",
        "handleMoveCourt": "function",
        "handleSaveGame": "function",
        "handleWetCourtToggle": "function",
        "initiateMove": "function",
        "movingFrom": "object",
        "savingGame": "boolean",
        "showActions": "object",
        "toggleActions": "function",
      }
    `);
  });
});
