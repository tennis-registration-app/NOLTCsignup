/**
 * useAdminHandlers Contract Test
 *
 * Freezes the 8-key return shape of useAdminHandlers.
 * Changes to the hook's public surface will fail this test,
 * requiring explicit acknowledgment via snapshot update.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

// Mock handler operation modules (useAdminHandlers imports these)
vi.mock('../../../src/admin/handlers/waitlistOperations', () => ({
  removeFromWaitlistOp: vi.fn(),
  moveInWaitlistOp: vi.fn(),
}));

vi.mock('../../../src/admin/handlers/courtOperations', () => ({
  clearCourtOp: vi.fn(),
  moveCourtOp: vi.fn(),
  clearAllCourtsOp: vi.fn(),
}));

vi.mock('../../../src/admin/handlers/applyBlocksOperation', () => ({
  applyBlocksOp: vi.fn(),
}));

import { useAdminHandlers } from '../../../src/admin/hooks/useAdminHandlers.js';

// Expected keys (alphabetical) — update this when the contract changes
const EXPECTED_KEYS = [
  'applyBlocks',
  'clearAllCourts',
  'clearCourt',
  'handleEditBlockFromStatus',
  'moveCourt',
  'moveInWaitlist',
  'refreshData',
  'removeFromWaitlist',
];

describe('useAdminHandlers contract', () => {
  let hookResult = null;

  beforeAll(async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    function Harness() {
      const result = useAdminHandlers({
        backend: { queries: {}, commands: {}, admin: {} },
        dataStore: { getData: () => null },
        TENNIS_CONFIG: { STORAGE: {} },
        courts: [],
        waitingGroups: [],
        showNotification: vi.fn(),
        confirm: vi.fn(),
        setBlockToEdit: vi.fn(),
        setActiveTab: vi.fn(),
        setBlockingView: vi.fn(),
        reloadSettings: vi.fn(),
        bumpRefreshTrigger: vi.fn(),
      });
      hookResult = result;
      return null;
    }

    const root = createRoot(container);
    await new Promise((resolve) => {
      root.render(React.createElement(Harness));
      setTimeout(resolve, 50);
    });
  });

  it('returns exactly 8 keys', () => {
    expect(Object.keys(hookResult)).toHaveLength(8);
  });

  it('keys match expected shape (inline snapshot)', () => {
    const keys = Object.keys(hookResult).sort();
    expect(keys).toMatchInlineSnapshot(`
      [
        "applyBlocks",
        "clearAllCourts",
        "clearCourt",
        "handleEditBlockFromStatus",
        "moveCourt",
        "moveInWaitlist",
        "refreshData",
        "removeFromWaitlist",
      ]
    `);
  });

  it('matches EXPECTED_KEYS constant', () => {
    expect(Object.keys(hookResult).sort()).toEqual(EXPECTED_KEYS);
  });

  describe('all returned values are functions', () => {
    for (const key of EXPECTED_KEYS) {
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
        "applyBlocks": "function",
        "clearAllCourts": "function",
        "clearCourt": "function",
        "handleEditBlockFromStatus": "function",
        "moveCourt": "function",
        "moveInWaitlist": "function",
        "refreshData": "function",
        "removeFromWaitlist": "function",
      }
    `);
  });
});
