/**
 * useWetCourts — reducer-hook coverage
 *
 * Tests state transitions, backend call counts, side effects (Events.emitDom,
 * onRefresh), failure paths, and busy guards.
 *
 * Uses minimal React wrapper pattern (no renderHook dependency).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Mock the backend operation modules so no real backend calls happen
vi.mock('../../../../src/admin/handlers/wetCourtOperations.js', () => ({
  activateWetCourtsOp: vi.fn(),
  clearAllWetCourtsOp: vi.fn(),
  clearWetCourtOp: vi.fn(),
}));

import { useWetCourts } from '../../../../src/admin/wetCourts/useWetCourts.js';
import {
  activateWetCourtsOp,
  clearAllWetCourtsOp,
  clearWetCourtOp,
} from '../../../../src/admin/handlers/wetCourtOperations.js';

// ============================================================
// Test harness — minimal wrapper that exposes hook return via ref
// ============================================================

function createHarness(depsOverrides = {}) {
  const deps = {
    backend: { admin: {} },
    getDeviceId: vi.fn(() => 'test-device'),
    courts: [
      { number: 1, id: 'uuid-1' },
      { number: 2, id: 'uuid-2' },
      { number: 3, id: 'uuid-3' },
    ],
    Events: { emitDom: vi.fn() },
    onRefresh: vi.fn(),
    ...depsOverrides,
  };

  /** @type {{ current: ReturnType<typeof useWetCourts> | null }} */
  const hookRef = { current: null };

  const Wrapper = forwardRef(function Wrapper(_props, ref) {
    const hook = useWetCourts(deps);
    useImperativeHandle(ref, () => hook);
    // Also stash in outer ref for sync access
    hookRef.current = hook;
    return null;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef();

  act(() => {
    root.render(<Wrapper ref={ref} />);
  });

  return {
    /** Get current hook return value */
    get hook() {
      return ref.current;
    },
    deps,
    cleanup() {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

// ============================================================
// Setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all ops resolve successfully
  activateWetCourtsOp.mockResolvedValue({
    ok: true,
    courtNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  });
  clearAllWetCourtsOp.mockResolvedValue({ ok: true, blocksCleared: 3 });
  clearWetCourtOp.mockResolvedValue({ ok: true, blocksCleared: 1 });
});

// ============================================================
// A) Initial state
// ============================================================

describe('initial state', () => {
  it('returns isActive=false', () => {
    const h = createHarness();
    expect(h.hook.isActive).toBe(false);
    h.cleanup();
  });

  it('returns wetCourtNumbers=[]', () => {
    const h = createHarness();
    expect(h.hook.wetCourtNumbers).toEqual([]);
    h.cleanup();
  });

  it('returns isBusy=false, error=null', () => {
    const h = createHarness();
    expect(h.hook.isBusy).toBe(false);
    expect(h.hook.error).toBeNull();
    h.cleanup();
  });

  it('returns wetCount=0, isEmpty=true', () => {
    const h = createHarness();
    expect(h.hook.wetCount).toBe(0);
    expect(h.hook.isEmpty).toBe(true);
    h.cleanup();
  });

  it('returns all 4 API methods as functions', () => {
    const h = createHarness();
    expect(typeof h.hook.activateWet).toBe('function');
    expect(typeof h.hook.deactivateWet).toBe('function');
    expect(typeof h.hook.clearWetCourt).toBe('function');
    expect(typeof h.hook.clearAllWet).toBe('function');
    h.cleanup();
  });
});

// ============================================================
// B) activateWet
// ============================================================

describe('activateWet', () => {
  it('calls activateWetCourtsOp exactly once', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(activateWetCourtsOp).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('passes backend and getDeviceId to op', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(activateWetCourtsOp).toHaveBeenCalledWith({
      backend: h.deps.backend,
      getDeviceId: h.deps.getDeviceId,
    });
    h.cleanup();
  });

  it('sets isActive=true after success', async () => {
    const h = createHarness();
    expect(h.hook.isActive).toBe(false);

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.isActive).toBe(true);
    h.cleanup();
  });

  it('populates wetCourtNumbers from result', async () => {
    activateWetCourtsOp.mockResolvedValue({
      ok: true,
      courtNumbers: [3, 5, 7],
    });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.wetCourtNumbers).toEqual([3, 5, 7]);
    expect(h.hook.wetCount).toBe(3);
    expect(h.hook.isEmpty).toBe(false);
    h.cleanup();
  });

  it('defaults to courts 1-12 when result has no courtNumbers', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(h.hook.wetCount).toBe(12);
    h.cleanup();
  });

  it('calls Events.emitDom with courtNumbers after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.deps.Events.emitDom).toHaveBeenCalledWith('tennisDataUpdate', {
      key: 'wetCourts',
      data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });
    h.cleanup();
  });

  it('calls onRefresh after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.deps.onRefresh).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('settles with isBusy=false after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.isBusy).toBe(false);
    expect(h.hook.busyOp).toBeNull();
    h.cleanup();
  });
});

// ============================================================
// C) deactivateWet
// ============================================================

describe('deactivateWet', () => {
  it('calls clearAllWetCourtsOp exactly once', async () => {
    const h = createHarness();

    // First activate, then deactivate
    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(clearAllWetCourtsOp).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('sets isActive=false after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.isActive).toBe(true);

    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.hook.isActive).toBe(false);
    h.cleanup();
  });

  it('clears wetCourtNumbers after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.wetCourtNumbers.length).toBeGreaterThan(0);

    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.hook.wetCourtNumbers).toEqual([]);
    expect(h.hook.wetCount).toBe(0);
    expect(h.hook.isEmpty).toBe(true);
    h.cleanup();
  });

  it('emits empty wetCourts data after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    h.deps.Events.emitDom.mockClear();

    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.deps.Events.emitDom).toHaveBeenCalledWith('tennisDataUpdate', {
      key: 'wetCourts',
      data: [],
    });
    h.cleanup();
  });

  it('calls onRefresh after success', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    h.deps.onRefresh.mockClear();

    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.deps.onRefresh).toHaveBeenCalledOnce();
    h.cleanup();
  });
});

// ============================================================
// D) clearWetCourt(courtNumber)
// ============================================================

describe('clearWetCourt', () => {
  it('calls clearWetCourtOp with court ID from lookup', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.clearWetCourt(2);
    });

    expect(clearWetCourtOp).toHaveBeenCalledWith({
      backend: h.deps.backend,
      getDeviceId: h.deps.getDeviceId,
      courtId: 'uuid-2',
    });
    h.cleanup();
  });

  it('removes court from wetCourtNumbers', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3]);

    await act(async () => {
      await h.hook.clearWetCourt(2);
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 3]);
    expect(h.hook.wetCount).toBe(2);
    h.cleanup();
  });

  it('calls onRefresh after success', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    h.deps.onRefresh.mockClear();

    await act(async () => {
      await h.hook.clearWetCourt(1);
    });

    expect(h.deps.onRefresh).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('emits updated wetCourts data after success', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    h.deps.Events.emitDom.mockClear();

    await act(async () => {
      await h.hook.clearWetCourt(2);
    });

    expect(h.deps.Events.emitDom).toHaveBeenCalledWith('tennisDataUpdate', {
      key: 'wetCourts',
      data: [1, 3],
    });
    h.cleanup();
  });

  it('handles string court number via Number() coercion', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.clearWetCourt('2');
    });

    expect(clearWetCourtOp).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: 'uuid-2' })
    );
    expect(h.hook.wetCourtNumbers).toEqual([1, 3]);
    h.cleanup();
  });

  it('dispatches WET_OP_FAILED when court not found — no backend call', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    clearWetCourtOp.mockClear();

    await act(async () => {
      await h.hook.clearWetCourt(99);
    });

    expect(clearWetCourtOp).not.toHaveBeenCalled();
    expect(h.hook.error).toBe('Court 99 not found');
    expect(h.deps.onRefresh).toHaveBeenCalledTimes(1); // only from activateWet
    h.cleanup();
  });

  it('auto-deactivates when clearing the last wet court', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [2] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.isActive).toBe(true);
    expect(h.hook.wetCourtNumbers).toEqual([2]);

    await act(async () => {
      await h.hook.clearWetCourt(2);
    });

    // Auto-deactivated
    expect(h.hook.isActive).toBe(false);
    expect(h.hook.wetCourtNumbers).toEqual([]);
    expect(h.hook.isEmpty).toBe(true);
    h.cleanup();
  });

  it('does NOT auto-deactivate when other courts remain', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2] });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.clearWetCourt(1);
    });

    expect(h.hook.isActive).toBe(true);
    expect(h.hook.wetCourtNumbers).toEqual([2]);
    h.cleanup();
  });

  it('auto-deactivates isActive when last wet court is cleared individually', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1] });
    clearWetCourtOp.mockResolvedValue({ ok: true });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.isActive).toBe(true);
    expect(h.hook.wetCourtNumbers).toEqual([1]);

    await act(async () => {
      await h.hook.clearWetCourt(1);
    });

    // After clearing the only wet court, isActive should auto-deactivate
    expect(h.hook.wetCourtNumbers).toEqual([]);
    expect(h.hook.isActive).toBe(false);
    h.cleanup();
  });
});

// ============================================================
// E) clearAllWet
// ============================================================

describe('clearAllWet', () => {
  it('calls clearAllWetCourtsOp exactly once', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    clearAllWetCourtsOp.mockClear();

    await act(async () => {
      await h.hook.clearAllWet();
    });

    expect(clearAllWetCourtsOp).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('empties wetCourtNumbers and auto-deactivates isActive', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.isActive).toBe(true);

    await act(async () => {
      await h.hook.clearAllWet();
    });

    // clearAllWet empties list; useEffect auto-deactivates when list is empty
    expect(h.hook.isActive).toBe(false);
    expect(h.hook.wetCourtNumbers).toEqual([]);
    expect(h.hook.wetCount).toBe(0);
    h.cleanup();
  });

  it('emits empty wetCourts data and calls onRefresh', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    h.deps.Events.emitDom.mockClear();
    h.deps.onRefresh.mockClear();

    await act(async () => {
      await h.hook.clearAllWet();
    });

    expect(h.deps.Events.emitDom).toHaveBeenCalledWith('tennisDataUpdate', {
      key: 'wetCourts',
      data: [],
    });
    expect(h.deps.onRefresh).toHaveBeenCalledOnce();
    h.cleanup();
  });
});

// ============================================================
// F) Failure paths
// ============================================================

describe('failure paths', () => {
  it('activateWet: backend ok:false → error set, isActive unchanged', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: false, message: 'Rate limited' });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.isActive).toBe(false);
    expect(h.hook.error).toBe('Rate limited');
    expect(h.hook.isBusy).toBe(false);
    expect(h.deps.onRefresh).not.toHaveBeenCalled();
    expect(h.deps.Events.emitDom).not.toHaveBeenCalled();
    h.cleanup();
  });

  it('activateWet: backend throws → error set, isActive unchanged', async () => {
    activateWetCourtsOp.mockRejectedValue(new Error('Network down'));
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.isActive).toBe(false);
    expect(h.hook.error).toBe('Network down');
    expect(h.hook.isBusy).toBe(false);
    expect(h.deps.onRefresh).not.toHaveBeenCalled();
    h.cleanup();
  });

  it('activateWet: ok:false with no message → default error message', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: false });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.error).toBe('Failed to activate wet courts');
    h.cleanup();
  });

  it('deactivateWet: backend ok:false → error set, isActive unchanged', async () => {
    clearAllWetCourtsOp.mockResolvedValue({ ok: false, message: 'Permission denied' });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.isActive).toBe(true);

    // Reset mock for deactivate call
    clearAllWetCourtsOp.mockResolvedValue({ ok: false, message: 'Permission denied' });
    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.hook.isActive).toBe(true); // NOT flipped
    expect(h.hook.error).toBe('Permission denied');
    h.cleanup();
  });

  it('deactivateWet: backend throws → error set, isActive unchanged', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    clearAllWetCourtsOp.mockRejectedValue(new Error('Timeout'));
    await act(async () => {
      await h.hook.deactivateWet();
    });

    expect(h.hook.isActive).toBe(true);
    expect(h.hook.error).toBe('Timeout');
    h.cleanup();
  });

  it('clearWetCourt: backend ok:false → error set, court NOT removed', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    clearWetCourtOp.mockResolvedValue({ ok: false, message: 'Block locked' });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.clearWetCourt(2);
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3]); // unchanged
    expect(h.hook.error).toBe('Block locked');
    h.cleanup();
  });

  it('clearWetCourt: backend throws → error set, court NOT removed', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    clearWetCourtOp.mockRejectedValue(new Error('Server error'));
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    await act(async () => {
      await h.hook.clearWetCourt(1);
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3]);
    expect(h.hook.error).toBe('Server error');
    h.cleanup();
  });

  it('clearAllWet: backend ok:false → error set, courts NOT cleared', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    clearAllWetCourtsOp.mockResolvedValue({ ok: false, message: 'System busy' });
    await act(async () => {
      await h.hook.clearAllWet();
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(h.hook.error).toBe('System busy');
    h.cleanup();
  });

  it('clearAllWet: backend throws → error set, courts NOT cleared', async () => {
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });

    clearAllWetCourtsOp.mockRejectedValue(new Error('Disconnected'));
    await act(async () => {
      await h.hook.clearAllWet();
    });

    expect(h.hook.wetCourtNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(h.hook.error).toBe('Disconnected');
    h.cleanup();
  });
});

// ============================================================
// G) Error clears on next operation
// ============================================================

describe('error clears on next operation', () => {
  it('error from failed activate clears when activate is retried', async () => {
    activateWetCourtsOp.mockResolvedValue({ ok: false, message: 'First fail' });
    const h = createHarness();

    await act(async () => {
      await h.hook.activateWet();
    });
    expect(h.hook.error).toBe('First fail');

    // Retry succeeds
    activateWetCourtsOp.mockResolvedValue({ ok: true, courtNumbers: [1, 2, 3] });
    await act(async () => {
      await h.hook.activateWet();
    });

    expect(h.hook.error).toBeNull();
    expect(h.hook.isActive).toBe(true);
    h.cleanup();
  });
});
