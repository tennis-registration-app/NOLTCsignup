/**
 * useCourtActions — optimistic move tests
 *
 * Tests that handleMoveCourt applies an optimistic court update,
 * clears move-mode immediately, and rolls back on failure.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// Mock platform dependencies
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

vi.mock('../../../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
}));

import { useCourtActions } from '../../../../src/admin/courts/useCourtActions.js';
import { toast } from '../../../../src/shared/utils/toast.js';

// ============================================================
// Test data — two courts, one occupied, one available
// ============================================================

const COURTS = [
  {
    number: 3,
    id: 'uuid-3',
    session: { id: 'sess-1', group: { players: [{ name: 'Alice' }] }, scheduledEndAt: '2025-01-01T12:00:00Z' },
    players: [{ name: 'Alice' }],
    startTime: '2025-01-01T11:00:00Z',
    endTime: '2025-01-01T12:00:00Z',
    sessionId: 'sess-1',
  },
  {
    number: 7,
    id: 'uuid-7',
  },
];

// ============================================================
// Helpers
// ============================================================

function renderHook(moveCourt, courts) {
  let result = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    result.current = useCourtActions({
      statusActions: {
        clearCourt: vi.fn(),
        moveCourt: moveCourt || vi.fn().mockResolvedValue({ success: true }),
      },
      wetCourtsActions: { clearCourt: vi.fn(), clearAllCourts: vi.fn() },
      services: { backend: { admin: { updateSession: vi.fn() } } },
      courts: courts || COURTS,
      courtBlocks: [],
      wetCourts: new Set(),
    });
    return null;
  }

  const renderSync = async () => {
    await act(async () => {
      root.render(React.createElement(Harness));
    });
  };

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  return { result, renderSync, unmount };
}

// ============================================================
// Tests
// ============================================================

describe('useCourtActions — optimistic move', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('movingFrom is null and optimisticCourts is null initially', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    expect(result.current.movingFrom).toBeNull();
    expect(result.current.optimisticCourts).toBeNull();
    unmount();
  });

  it('initiateMove sets movingFrom', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    expect(result.current.movingFrom).toBe(3);
    unmount();
  });

  it('clears movingFrom immediately when move is triggered', async () => {
    // Use a deferred promise so the API call stays pending
    let resolveMove;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    // Enter move mode
    await act(async () => {
      result.current.initiateMove(3);
    });
    expect(result.current.movingFrom).toBe(3);

    // Start the move (don't await — API is still pending)
    let movePromise;
    await act(async () => {
      movePromise = result.current.handleMoveCourt(3, 7);
    });

    // Move mode cleared immediately (optimistic)
    expect(result.current.movingFrom).toBeNull();

    // Cleanup: resolve and await
    await act(async () => {
      resolveMove({ success: true });
      await movePromise;
    });
    unmount();
  });

  it('sets optimisticCourts with session swapped from source to target', async () => {
    let resolveMove;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    let movePromise;
    await act(async () => {
      movePromise = result.current.handleMoveCourt(3, 7);
    });

    // Optimistic courts should exist during in-flight
    const opt = result.current.optimisticCourts;
    expect(opt).not.toBeNull();

    // Source court (3) should have no session data
    const fromCourt = opt.find((c) => c.number === 3);
    expect(fromCourt.session).toBeUndefined();
    expect(fromCourt.players).toBeUndefined();

    // Target court (7) should have the session data
    const toCourt = opt.find((c) => c.number === 7);
    expect(toCourt.session).toEqual(COURTS[0].session);
    expect(toCourt.players).toEqual(COURTS[0].players);

    await act(async () => {
      resolveMove({ success: true });
      await movePromise;
    });
    unmount();
  });

  it('clears optimisticCourts after successful move', async () => {
    const moveCourt = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.movingFrom).toBeNull();
    unmount();
  });

  it('clears optimisticCourts and shows error toast after failed move', async () => {
    const moveCourt = vi.fn().mockResolvedValue({ success: false, error: 'Occupied' });
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    // Optimistic state rolled back
    expect(result.current.optimisticCourts).toBeNull();
    // Error toast shown
    expect(toast).toHaveBeenCalledWith('Occupied', { type: 'error' });
    unmount();
  });

  it('clears optimisticCourts and shows error toast after exception', async () => {
    const moveCourt = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    expect(result.current.optimisticCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Unexpected error moving court', { type: 'error' });
    unmount();
  });

  it('prevents double-click during in-flight move', async () => {
    let resolveMove;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    let movePromise;
    await act(async () => {
      movePromise = result.current.handleMoveCourt(3, 7);
    });

    // Second click during in-flight should be ignored
    await act(async () => {
      result.current.handleMoveCourt(3, 8);
    });

    // Only one call to moveCourt
    expect(moveCourt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMove({ success: true });
      await movePromise;
    });
    unmount();
  });

  it('cancelMove clears movingFrom', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });
    expect(result.current.movingFrom).toBe(3);

    await act(async () => {
      result.current.cancelMove();
    });

    expect(result.current.movingFrom).toBeNull();
    unmount();
  });

  it('toggleActions clears move state', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });
    expect(result.current.movingFrom).toBe(3);

    await act(async () => {
      result.current.toggleActions(5);
    });

    expect(result.current.movingFrom).toBeNull();
    unmount();
  });
});
