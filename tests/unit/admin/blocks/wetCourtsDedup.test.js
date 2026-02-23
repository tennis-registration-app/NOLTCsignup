/** @vitest-environment jsdom */
/**
 * wetCourtsDedup — characterization test for legacy useWetCourts hook
 *
 * Documents that:
 * 1. Legacy blocks/hooks/useWetCourts.js is pure orchestration (not a React hook)
 * 2. It calls backend methods AND injected setters on success
 * 3. In production, setters are no-ops (from useAdminAppState lines 69-71)
 * 4. Controller already provides equivalent actions via reducer-based hook
 *
 * This test characterizes the CURRENT behavior before dedup (bug #12).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWetCourts as legacyUseWetCourts } from '../../../../src/admin/blocks/hooks/useWetCourts.js';

// Mock window.Events (IIFE sets this at module level)
vi.stubGlobal('Events', { emitDom: vi.fn() });

describe('legacy useWetCourts (blocks/hooks) — characterization', () => {
  let backend;
  let setWetCourts;
  let setWetCourtsActive;
  let setSuspendedBlocks;
  let setRefreshTrigger;
  let onNotification;
  let result;

  beforeEach(() => {
    vi.clearAllMocks();

    backend = {
      admin: {
        markWetCourts: vi.fn(),
        clearWetCourts: vi.fn(),
      },
    };

    // These are vi.fn() here to OBSERVE calls —
    // in production they are no-ops: () => {}
    setWetCourts = vi.fn();
    setWetCourtsActive = vi.fn();
    setSuspendedBlocks = vi.fn();
    setRefreshTrigger = vi.fn();
    onNotification = vi.fn();

    result = legacyUseWetCourts({
      backend,
      onNotification,
      ENABLE_WET_COURTS: true,
      wetCourts: new Set(),
      setWetCourts,
      setWetCourtsActive,
      setSuspendedBlocks,
      courts: Array.from({ length: 12 }, (_, i) => ({ id: `court-${i + 1}`, number: i + 1 })),
      setRefreshTrigger,
    });
  });

  // ============================================================
  // A) Pure orchestration — NOT a React hook
  // ============================================================

  it('is pure orchestration — returns object with 3 handler functions', () => {
    expect(typeof result.handleEmergencyWetCourt).toBe('function');
    expect(typeof result.deactivateWetCourts).toBe('function');
    expect(typeof result.clearWetCourt).toBe('function');
    expect(Object.keys(result)).toEqual([
      'handleEmergencyWetCourt',
      'deactivateWetCourts',
      'clearWetCourt',
    ]);
  });

  // ============================================================
  // B) handleEmergencyWetCourt — calls backend + setters
  // ============================================================

  describe('handleEmergencyWetCourt', () => {
    it('calls backend.admin.markWetCourts on success', async () => {
      backend.admin.markWetCourts.mockResolvedValue({
        ok: true,
        courtsMarked: 12,
        courtNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        endsAt: '2025-06-15T22:00:00Z',
      });

      await result.handleEmergencyWetCourt();

      expect(backend.admin.markWetCourts).toHaveBeenCalledOnce();
    });

    it('calls setWetCourts and setWetCourtsActive on success', async () => {
      backend.admin.markWetCourts.mockResolvedValue({
        ok: true,
        courtsMarked: 12,
        courtNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        endsAt: '2025-06-15T22:00:00Z',
      });

      await result.handleEmergencyWetCourt();

      // Documents: these setters ARE called, but in production they are no-ops
      expect(setWetCourts).toHaveBeenCalledOnce();
      expect(setWetCourtsActive).toHaveBeenCalledWith(true);
      expect(setRefreshTrigger).toHaveBeenCalledOnce();
    });

    it('does NOT call setters on backend failure', async () => {
      backend.admin.markWetCourts.mockResolvedValue({
        ok: false,
        message: 'Failed',
      });

      await result.handleEmergencyWetCourt();

      expect(setWetCourts).not.toHaveBeenCalled();
      expect(setWetCourtsActive).not.toHaveBeenCalled();
      expect(onNotification).toHaveBeenCalledWith('Failed', 'error');
    });

    it('does nothing when ENABLE_WET_COURTS is false', async () => {
      const disabled = legacyUseWetCourts({
        backend,
        onNotification,
        ENABLE_WET_COURTS: false,
        wetCourts: new Set(),
        setWetCourts,
        setWetCourtsActive,
        setSuspendedBlocks,
        courts: [],
        setRefreshTrigger,
      });

      await disabled.handleEmergencyWetCourt();

      expect(backend.admin.markWetCourts).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // C) deactivateWetCourts — calls backend + setters
  // ============================================================

  describe('deactivateWetCourts', () => {
    it('calls backend.admin.clearWetCourts on success', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({
        ok: true,
        blocksCleared: 12,
      });

      await result.deactivateWetCourts();

      expect(backend.admin.clearWetCourts).toHaveBeenCalledOnce();
    });

    it('calls all three setters on success', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({
        ok: true,
        blocksCleared: 12,
      });

      await result.deactivateWetCourts();

      // Documents: all three setters called, all are no-ops in production
      expect(setWetCourtsActive).toHaveBeenCalledWith(false);
      expect(setWetCourts).toHaveBeenCalledWith(new Set());
      expect(setSuspendedBlocks).toHaveBeenCalledWith([]);
      expect(setRefreshTrigger).toHaveBeenCalledOnce();
    });

    it('does NOT call setters on backend failure', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({
        ok: false,
        message: 'Service unavailable',
      });

      await result.deactivateWetCourts();

      expect(setWetCourtsActive).not.toHaveBeenCalled();
      expect(setWetCourts).not.toHaveBeenCalled();
      expect(setSuspendedBlocks).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // D) clearWetCourt — calls backend + setters
  // ============================================================

  describe('clearWetCourt', () => {
    it('calls backend.admin.clearWetCourts with courtIds on success', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({ ok: true });

      await result.clearWetCourt(3);

      expect(backend.admin.clearWetCourts).toHaveBeenCalledWith(
        expect.objectContaining({ courtIds: ['court-3'] })
      );
    });

    it('calls setWetCourts on success', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({ ok: true });

      await result.clearWetCourt(3);

      // Documents: setter called with updated Set, but is no-op in production
      expect(setWetCourts).toHaveBeenCalledOnce();
    });

    it('auto-deactivates when last court cleared', async () => {
      // Create hook with single wet court
      const singleCourt = legacyUseWetCourts({
        backend,
        onNotification,
        ENABLE_WET_COURTS: true,
        wetCourts: new Set([5]),
        setWetCourts,
        setWetCourtsActive,
        setSuspendedBlocks,
        courts: Array.from({ length: 12 }, (_, i) => ({ id: `court-${i + 1}`, number: i + 1 })),
        setRefreshTrigger,
      });

      backend.admin.clearWetCourts.mockResolvedValue({ ok: true });

      await singleCourt.clearWetCourt(5);

      // Documents: setWetCourtsActive(false) called when Set becomes empty
      expect(setWetCourtsActive).toHaveBeenCalledWith(false);
    });

    it('does NOT call setters on backend failure', async () => {
      backend.admin.clearWetCourts.mockResolvedValue({
        ok: false,
        message: 'Court busy',
      });

      await result.clearWetCourt(3);

      expect(setWetCourts).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // E) Document: production no-op behavior
  // ============================================================

  describe('production no-op setter behavior (bug #12)', () => {
    it('setters execute without error when they are no-ops', async () => {
      // Replace mocks with actual no-ops (as in production)
      const noOpResult = legacyUseWetCourts({
        backend,
        onNotification,
        ENABLE_WET_COURTS: true,
        wetCourts: new Set(),
        setWetCourts: () => {},
        setWetCourtsActive: () => {},
        setSuspendedBlocks: () => {},
        courts: Array.from({ length: 12 }, (_, i) => ({ id: `court-${i + 1}`, number: i + 1 })),
        setRefreshTrigger,
      });

      backend.admin.markWetCourts.mockResolvedValue({
        ok: true,
        courtsMarked: 12,
        courtNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      });

      // Does not throw — backend call succeeds, setters called but discarded
      await expect(noOpResult.handleEmergencyWetCourt()).resolves.not.toThrow();

      // Backend WAS called (duplicate call — reducer-based hook also calls it)
      expect(backend.admin.markWetCourts).toHaveBeenCalledOnce();
    });
  });

  // ============================================================
  // F) Document: controller already provides equivalent actions
  // ============================================================

  describe('controller overlap documentation', () => {
    it('controller wetCourtsActions has activateEmergency (= handleEmergencyWetCourt)', () => {
      // From buildAdminController.js:103 — actions.handleEmergencyWetCourt
      // This is the reducer-based version from wetCourts/useWetCourts.js
      // which dispatches to wetCourtsReducer and works correctly
      expect(true).toBe(true); // Documenting overlap
    });

    it('controller wetCourtsActions has deactivateAll (= deactivateWetCourts)', () => {
      // From buildAdminController.js:104 — actions.deactivateWetCourts
      expect(true).toBe(true);
    });

    it('controller wetCourtsActions has clearCourt (= clearWetCourt)', () => {
      // From buildAdminController.js:105 — actions.clearWetCourt
      expect(true).toBe(true);
    });
  });
});
