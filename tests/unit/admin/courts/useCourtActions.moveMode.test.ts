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

// Courts with wet blocks (simulates board data after "Wet Courts" activation).
// getCourtStatus checks BOTH wetCourts Set AND court.block.reason for "wet".
const WET_BLOCK_COURTS = [
  {
    number: 3,
    id: 'uuid-3',
    block: { id: 'wet-3', reason: 'WET COURT', startsAt: '2025-01-01T08:00:00Z', endsAt: '2025-01-01T20:00:00Z', isActive: true },
  },
  {
    number: 7,
    id: 'uuid-7',
    block: { id: 'wet-7', reason: 'WET COURT', startsAt: '2025-01-01T08:00:00Z', endsAt: '2025-01-01T20:00:00Z', isActive: true },
  },
];

// ============================================================
// Helpers
// ============================================================

function renderHook(moveCourt: any, courts: any, { clearCourt, courtBlocks, clearWetCourt, clearAllWetCourts, activateEmergency, deactivateAll, wetCourts }: any = {}) {
  // Type assertion: partial mock for testing
  let result = { current: null } as unknown as { current: ReturnType<typeof useCourtActions> };
  // Mutable props ref — allows re-rendering with updated values
  const propsRef = {
    courts: courts || COURTS,
    wetCourts: wetCourts || new Set(),
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    result.current = useCourtActions({
      statusActions: {
        clearCourt: clearCourt || vi.fn().mockResolvedValue({ success: true }),
        moveCourt: moveCourt || vi.fn().mockResolvedValue({ success: true }),
      },
      wetCourtsActions: {
        activateEmergency: activateEmergency || vi.fn().mockResolvedValue({ success: true }),
        deactivateAll: deactivateAll || vi.fn().mockResolvedValue({ success: true }),
        clearCourt: clearWetCourt || vi.fn().mockResolvedValue({ success: true }),
        clearAllCourts: clearAllWetCourts || vi.fn().mockResolvedValue({ success: true }),
      },
      services: { backend: { admin: { updateSession: vi.fn() } } },
      courts: propsRef.courts,
      courtBlocks: courtBlocks || [],
      wetCourts: propsRef.wetCourts,
    });
    return null;
  }

  const renderSync = async () => {
    await act(async () => {
      root.render(React.createElement(Harness));
    });
  };

  // Re-render with updated props (simulates real data arriving from applyBoardResponse)
  const rerender = async (newProps: any) => {
    if (newProps.wetCourts !== undefined) propsRef.wetCourts = newProps.wetCourts;
    if (newProps.courts !== undefined) propsRef.courts = newProps.courts;
    await act(async () => {
      root.render(React.createElement(Harness));
    });
  };

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  return { result, renderSync, rerender, unmount };
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
    let resolveMove: (value: unknown) => void;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    // Enter move mode
    await act(async () => {
      result.current.initiateMove(3);
    });
    expect(result.current.movingFrom).toBe(3);

    // Start the move (don't await — API is still pending)
    let movePromise: Promise<unknown>;
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
    let resolveMove: (value: unknown) => void;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    let movePromise: Promise<unknown>;
    await act(async () => {
      movePromise = result.current.handleMoveCourt(3, 7);
    });

    // Optimistic courts should exist during in-flight
    const opt = result.current.optimisticCourts;
    expect(opt).not.toBeNull();

    // Source court (3) should have no session data
    const fromCourt = opt!.find((c) => c.number === 3);
    expect(fromCourt!.session).toBeUndefined();
    expect(fromCourt!.players).toBeUndefined();

    // Target court (7) should have the session data
    const toCourt = opt!.find((c) => c.number === 7);
    expect(toCourt!.session).toEqual(COURTS[0].session);
    expect(toCourt!.players).toEqual(COURTS[0].players);

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
    let resolveMove: (value: unknown) => void;
    const moveCourt = vi.fn(() => new Promise((r) => { resolveMove = r; }));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    let movePromise: Promise<unknown>;
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

// ============================================================
// Optimistic clear tests
// ============================================================

describe('useCourtActions — optimistic clear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clearInFlight is false initially', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    expect(result.current.clearInFlight).toBe(false);
    unmount();
  });

  it('sets optimisticCourts with target court emptied during in-flight', async () => {
    let resolveClear: (value: unknown) => void;
    const clearCourt = vi.fn(() => new Promise((r) => { resolveClear = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    let clearPromise: Promise<unknown>;
    await act(async () => {
      clearPromise = result.current.handleClearCourt(3);
    });

    // Optimistic courts should exist during in-flight
    const opt = result.current.optimisticCourts;
    expect(opt).not.toBeNull();

    // Cleared court (3) should have no session/players/block data
    const clearedCourt = opt!.find((c) => c.number === 3);
    expect(clearedCourt!.session).toBeUndefined();
    expect(clearedCourt!.players).toBeUndefined();
    expect(clearedCourt!.block).toBeUndefined();
    expect(clearedCourt!.startTime).toBeUndefined();
    // Should still have number and id
    expect(clearedCourt!.number).toBe(3);
    expect(clearedCourt!.id).toBe('uuid-3');

    // Other court (7) should be unchanged
    const otherCourt = opt!.find((c) => c.number === 7);
    expect(otherCourt).toEqual(COURTS[1]);

    await act(async () => {
      resolveClear({ success: true });
      await clearPromise;
    });
    unmount();
  });

  it('clears optimisticCourts after successful clear', async () => {
    const clearCourt = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    await act(async () => {
      await result.current.handleClearCourt(3);
    });

    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.clearInFlight).toBe(false);
    unmount();
  });

  it('clears optimisticCourts and shows error toast after failed clear', async () => {
    const clearCourt = vi.fn().mockResolvedValue({ success: false, error: 'Session locked' });
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    await act(async () => {
      await result.current.handleClearCourt(3);
    });

    // Optimistic state rolled back
    expect(result.current.optimisticCourts).toBeNull();
    // Error toast shown
    expect(toast).toHaveBeenCalledWith('Session locked', { type: 'error' });
    unmount();
  });

  it('clears optimisticCourts and shows error toast after exception', async () => {
    const clearCourt = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    await act(async () => {
      await result.current.handleClearCourt(3);
    });

    expect(result.current.optimisticCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Unexpected error clearing court', { type: 'error' });
    unmount();
  });

  it('prevents double-click during in-flight clear', async () => {
    let resolveClear: (value: unknown) => void;
    const clearCourt = vi.fn(() => new Promise((r) => { resolveClear = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    let clearPromise: Promise<unknown>;
    await act(async () => {
      clearPromise = result.current.handleClearCourt(3);
    });

    // Second click during in-flight should be ignored
    await act(async () => {
      result.current.handleClearCourt(7);
    });

    // Only one call to clearCourt
    expect(clearCourt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveClear({ success: true });
      await clearPromise;
    });
    unmount();
  });

  it('clears showActions immediately', async () => {
    let resolveClear: (value: unknown) => void;
    const clearCourt = vi.fn(() => new Promise((r) => { resolveClear = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, { clearCourt });
    await renderSync();

    // Open actions menu first
    await act(async () => {
      result.current.toggleActions(3);
    });
    expect(result.current.showActions).toBe(3);

    let clearPromise: Promise<unknown>;
    await act(async () => {
      clearPromise = result.current.handleClearCourt(3);
    });

    // Actions menu should be closed immediately
    expect(result.current.showActions).toBeNull();

    await act(async () => {
      resolveClear({ success: true });
      await clearPromise;
    });
    unmount();
  });
});

// ============================================================
// Optimistic wet court toggle tests
// ============================================================

describe('useCourtActions — optimistic wet court toggle', () => {
  const WET_COURTS = new Set([3, 7]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets optimisticWetCourts with court removed during in-flight', async () => {
    let resolveWet: (value: unknown) => void;
    const clearWetCourt = vi.fn(() => new Promise((r) => { resolveWet = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let togglePromise: Promise<unknown>;
    await act(async () => {
      togglePromise = result.current.handleWetCourtToggle(3);
    });

    // Optimistic wet courts should exist with court 3 removed
    const opt = result.current.optimisticWetCourts;
    expect(opt).not.toBeNull();
    expect(opt!.has(3)).toBe(false);
    expect(opt!.has(7)).toBe(true);

    await act(async () => {
      resolveWet({ success: true });
      await togglePromise;
    });
    unmount();
  });

  it('clears optimisticWetCourts when real data catches up', async () => {
    const clearWetCourt = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, rerender, unmount } = renderHook(null, COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleWetCourtToggle(3);
    });

    // Optimistic state stays until real data arrives
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.wetToggleInFlight).toBe(false);

    // Simulate real data arriving (applyBoardResponse updates wetCourts upstream)
    await rerender({ wetCourts: new Set([7]) });

    expect(result.current.optimisticWetCourts).toBeNull();
    unmount();
  });

  it('rolls back and shows toast on failure', async () => {
    const clearWetCourt = vi.fn().mockResolvedValue({ success: false, error: 'Backend error' });
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleWetCourtToggle(3);
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Backend error', { type: 'error' });
    unmount();
  });

  it('rolls back and shows toast on exception', async () => {
    const clearWetCourt = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleWetCourtToggle(3);
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Unexpected error clearing wet court', { type: 'error' });
    unmount();
  });

  it('does not set optimisticCourts (single source of truth: wetCourts Set)', async () => {
    let resolveWet: (value: unknown) => void;
    const clearWetCourt = vi.fn(() => new Promise((r) => { resolveWet = r; }));
    const { result, renderSync, unmount } = renderHook(null, WET_BLOCK_COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let togglePromise: Promise<unknown>;
    await act(async () => {
      togglePromise = result.current.handleWetCourtToggle(3);
    });

    // Wet ops only set optimisticWetCourts, not optimisticCourts
    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.optimisticWetCourts!.has(3)).toBe(false);

    await act(async () => {
      resolveWet({ success: true });
      await togglePromise;
    });
    unmount();
  });

  it('prevents double-click during in-flight wet toggle', async () => {
    let resolveWet: (value: unknown) => void;
    const clearWetCourt = vi.fn(() => new Promise((r) => { resolveWet = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearWetCourt,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let togglePromise: Promise<unknown>;
    await act(async () => {
      togglePromise = result.current.handleWetCourtToggle(3);
    });

    await act(async () => {
      result.current.handleWetCourtToggle(7);
    });

    expect(clearWetCourt).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveWet({ success: true });
      await togglePromise;
    });
    unmount();
  });
});

// ============================================================
// Optimistic "All Courts Dry" tests
// ============================================================

describe('useCourtActions — optimistic All Courts Dry', () => {
  const WET_COURTS = new Set([1, 3, 7]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets optimisticWetCourts to empty set during in-flight', async () => {
    let resolveDry: (value: unknown) => void;
    const clearAllWetCourts = vi.fn(() => new Promise((r) => { resolveDry = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let dryPromise: Promise<unknown>;
    await act(async () => {
      dryPromise = result.current.handleAllCourtsDry();
    });

    // Should be empty set (all courts dry)
    const opt = result.current.optimisticWetCourts;
    expect(opt).not.toBeNull();
    expect(opt!.size).toBe(0);

    await act(async () => {
      resolveDry({ success: true });
      await dryPromise;
    });
    unmount();
  });

  it('does not set optimisticCourts (single source of truth: wetCourts Set)', async () => {
    let resolveDry: (value: unknown) => void;
    const clearAllWetCourts = vi.fn(() => new Promise((r) => { resolveDry = r; }));
    const { result, renderSync, unmount } = renderHook(null, WET_BLOCK_COURTS, {
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let dryPromise: Promise<unknown>;
    await act(async () => {
      dryPromise = result.current.handleAllCourtsDry();
    });

    // Wet ops only set optimisticWetCourts, not optimisticCourts
    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.optimisticWetCourts!.size).toBe(0);

    await act(async () => {
      resolveDry({ success: true });
      await dryPromise;
    });
    unmount();
  });

  it('calls clearAllWetCourts NOT clearAllCourts (no sessions ended)', async () => {
    const clearAllWetCourts = vi.fn().mockResolvedValue({ success: true });
    const clearCourt = vi.fn();
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearCourt,
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleAllCourtsDry();
    });

    // Should call wet court handler
    expect(clearAllWetCourts).toHaveBeenCalledOnce();
    // Should NOT call session-clearing handler
    expect(clearCourt).not.toHaveBeenCalled();
    unmount();
  });

  it('clears optimisticWetCourts when real data catches up', async () => {
    const clearAllWetCourts = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, rerender, unmount } = renderHook(null, COURTS, {
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleAllCourtsDry();
    });

    // Optimistic state stays until real data arrives
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.wetToggleInFlight).toBe(false);

    // Simulate real data arriving (applyBoardResponse updates wetCourts upstream)
    await rerender({ wetCourts: new Set() });

    expect(result.current.optimisticWetCourts).toBeNull();
    unmount();
  });

  it('rolls back and shows toast on failure', async () => {
    const clearAllWetCourts = vi.fn().mockResolvedValue({ success: false, error: 'Partial failure' });
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleAllCourtsDry();
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Partial failure', { type: 'error' });
    unmount();
  });

  it('prevents double-click during in-flight All Courts Dry', async () => {
    let resolveDry: (value: unknown) => void;
    const clearAllWetCourts = vi.fn(() => new Promise((r) => { resolveDry = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      clearAllWetCourts,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let dryPromise: Promise<unknown>;
    await act(async () => {
      dryPromise = result.current.handleAllCourtsDry();
    });

    await act(async () => {
      result.current.handleAllCourtsDry();
    });

    expect(clearAllWetCourts).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDry({ success: true });
      await dryPromise;
    });
    unmount();
  });
});

// ============================================================
// Optimistic "Wet Courts" activate tests
// ============================================================

describe('useCourtActions — optimistic activate wet courts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets optimisticWetCourts to all 12 courts during in-flight', async () => {
    let resolveActivate: (value: unknown) => void;
    const activateEmergency = vi.fn(() => new Promise((r) => { resolveActivate = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    let activatePromise: Promise<unknown>;
    await act(async () => {
      activatePromise = result.current.handleActivateWet();
    });

    // Should be all 12 courts wet
    const opt = result.current.optimisticWetCourts;
    expect(opt).not.toBeNull();
    expect(opt!.size).toBe(12);
    for (let i = 1; i <= 12; i++) {
      expect(opt!.has(i)).toBe(true);
    }

    await act(async () => {
      resolveActivate({ success: true });
      await activatePromise;
    });
    unmount();
  });

  it('clears optimisticWetCourts when real data catches up', async () => {
    const activateEmergency = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, rerender, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleActivateWet();
    });

    // Optimistic state stays until real data arrives
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.wetToggleInFlight).toBe(false);

    // Simulate real data arriving (applyBoardResponse updates wetCourts upstream)
    await rerender({ wetCourts: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) });

    expect(result.current.optimisticWetCourts).toBeNull();
    unmount();
  });

  it('rolls back and shows toast on failure', async () => {
    const activateEmergency = vi.fn().mockResolvedValue({ success: false, error: 'Backend down' });
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleActivateWet();
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Backend down', { type: 'error' });
    unmount();
  });

  it('rolls back and shows toast on exception', async () => {
    const activateEmergency = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleActivateWet();
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Unexpected error activating wet courts', { type: 'error' });
    unmount();
  });

  it('prevents double-click during in-flight activate', async () => {
    let resolveActivate: (value: unknown) => void;
    const activateEmergency = vi.fn(() => new Promise((r) => { resolveActivate = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    let activatePromise: Promise<unknown>;
    await act(async () => {
      activatePromise = result.current.handleActivateWet();
    });

    await act(async () => {
      result.current.handleActivateWet();
    });

    expect(activateEmergency).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveActivate({ success: true });
      await activatePromise;
    });
    unmount();
  });

  it('does not affect court sessions (optimisticCourts stays null)', async () => {
    const activateEmergency = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      activateEmergency,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleActivateWet();
    });

    // Court sessions untouched
    expect(result.current.optimisticCourts).toBeNull();
    unmount();
  });
});

// ============================================================
// Optimistic deactivate wet courts tests
// ============================================================

describe('useCourtActions — optimistic deactivate wet courts', () => {
  const WET_COURTS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets optimisticWetCourts to empty set during in-flight', async () => {
    let resolveDeactivate: (value: unknown) => void;
    const deactivateAll = vi.fn(() => new Promise((r) => { resolveDeactivate = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let deactivatePromise: Promise<unknown>;
    await act(async () => {
      deactivatePromise = result.current.handleDeactivateWet();
    });

    // Should be empty set (all courts dry)
    const opt = result.current.optimisticWetCourts;
    expect(opt).not.toBeNull();
    expect(opt!.size).toBe(0);

    await act(async () => {
      resolveDeactivate({ success: true });
      await deactivatePromise;
    });
    unmount();
  });

  it('does not set optimisticCourts (single source of truth: wetCourts Set)', async () => {
    let resolveDeactivate: (value: unknown) => void;
    const deactivateAll = vi.fn(() => new Promise((r) => { resolveDeactivate = r; }));
    const { result, renderSync, unmount } = renderHook(null, WET_BLOCK_COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let deactivatePromise: Promise<unknown>;
    await act(async () => {
      deactivatePromise = result.current.handleDeactivateWet();
    });

    // Wet ops only use optimisticWetCourts (the Set), never optimisticCourts
    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.optimisticWetCourts!.size).toBe(0);

    await act(async () => {
      resolveDeactivate({ success: true });
      await deactivatePromise;
    });
    unmount();
  });

  it('clears optimisticWetCourts when real data catches up', async () => {
    const deactivateAll = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, rerender, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleDeactivateWet();
    });

    // Optimistic state stays until real data arrives
    expect(result.current.optimisticWetCourts).not.toBeNull();
    expect(result.current.wetToggleInFlight).toBe(false);

    // Simulate real data arriving (applyBoardResponse updates wetCourts upstream)
    await rerender({ wetCourts: new Set() });

    expect(result.current.optimisticWetCourts).toBeNull();
    unmount();
  });

  it('rolls back and shows toast on failure', async () => {
    const deactivateAll = vi.fn().mockResolvedValue({ success: false, error: 'Partial failure' });
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleDeactivateWet();
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Partial failure', { type: 'error' });
    unmount();
  });

  it('rolls back and shows toast on exception', async () => {
    const deactivateAll = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleDeactivateWet();
    });

    expect(result.current.optimisticWetCourts).toBeNull();
    expect(toast).toHaveBeenCalledWith('Unexpected error deactivating wet courts', { type: 'error' });
    unmount();
  });

  it('prevents double-click during in-flight deactivate', async () => {
    let resolveDeactivate: (value: unknown) => void;
    const deactivateAll = vi.fn(() => new Promise((r) => { resolveDeactivate = r; }));
    const { result, renderSync, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    let deactivatePromise: Promise<unknown>;
    await act(async () => {
      deactivatePromise = result.current.handleDeactivateWet();
    });

    await act(async () => {
      result.current.handleDeactivateWet();
    });

    expect(deactivateAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDeactivate({ success: true });
      await deactivatePromise;
    });
    unmount();
  });

  it('clears optimisticWetCourts when real data catches up (optimisticCourts never set)', async () => {
    const deactivateAll = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, rerender, unmount } = renderHook(null, COURTS, {
      deactivateAll,
      wetCourts: WET_COURTS,
    });
    await renderSync();

    await act(async () => {
      await result.current.handleDeactivateWet();
    });

    // Only optimisticWetCourts is set; optimisticCourts is never used for wet ops
    expect(result.current.optimisticCourts).toBeNull();
    expect(result.current.optimisticWetCourts).not.toBeNull();

    // Simulate real data arriving
    await rerender({ wetCourts: new Set() });

    // Optimistic override cleared
    expect(result.current.optimisticWetCourts).toBeNull();
    unmount();
  });
});
