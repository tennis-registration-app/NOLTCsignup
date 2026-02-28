/**
 * useCourtActions — move-mode state management tests
 *
 * Tests that movingFrom and movingTo are correctly set/cleared
 * during the move lifecycle: initiate → in-flight → success/failure.
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

// ============================================================
// Helpers
// ============================================================

function renderHook(moveCourt) {
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

describe('useCourtActions — move-mode state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('movingFrom and movingTo are null initially', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    expect(result.current.movingFrom).toBeNull();
    expect(result.current.movingTo).toBeNull();
    unmount();
  });

  it('initiateMove sets movingFrom', async () => {
    const { result, renderSync, unmount } = renderHook();
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    expect(result.current.movingFrom).toBe(3);
    expect(result.current.movingTo).toBeNull();
    unmount();
  });

  it('clears movingFrom and movingTo after successful move', async () => {
    const moveCourt = vi.fn().mockResolvedValue({ success: true });
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    // Enter move mode
    await act(async () => {
      result.current.initiateMove(3);
    });
    expect(result.current.movingFrom).toBe(3);

    // Execute move
    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    expect(result.current.movingFrom).toBeNull();
    expect(result.current.movingTo).toBeNull();
    unmount();
  });

  it('clears movingTo but preserves movingFrom after failed move', async () => {
    const moveCourt = vi.fn().mockResolvedValue({ success: false, error: 'Occupied' });
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    // Enter move mode
    await act(async () => {
      result.current.initiateMove(3);
    });

    // Execute failed move
    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    // movingFrom preserved so user can pick a different target
    expect(result.current.movingFrom).toBe(3);
    // movingTo cleared so "Moving..." indicator disappears
    expect(result.current.movingTo).toBeNull();
    unmount();
  });

  it('clears movingTo after move throws exception', async () => {
    const moveCourt = vi.fn().mockRejectedValue(new Error('Network'));
    const { result, renderSync, unmount } = renderHook(moveCourt);
    await renderSync();

    await act(async () => {
      result.current.initiateMove(3);
    });

    await act(async () => {
      await result.current.handleMoveCourt(3, 7);
    });

    expect(result.current.movingFrom).toBe(3);
    expect(result.current.movingTo).toBeNull();
    unmount();
  });

  it('cancelMove clears both movingFrom and movingTo', async () => {
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
    expect(result.current.movingTo).toBeNull();
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
    expect(result.current.movingTo).toBeNull();
    unmount();
  });
});
