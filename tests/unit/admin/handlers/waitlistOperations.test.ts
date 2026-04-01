/**
 * waitlistOperations — pure async handler tests
 *
 * Tests removeFromWaitlistOp, moveInWaitlistOp, clearWaitlistOp.
 * All functions take a ctx object (or backend directly) with injected deps.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  removeFromWaitlistOp,
  moveInWaitlistOp,
  clearWaitlistOp,
} from '../../../../src/admin/handlers/waitlistOperations.js';

// ============================================================
// Helpers
// ============================================================

const DEVICE_ID = 'admin-device-1';
const TENNIS_CONFIG = { DEVICES: { ADMIN_ID: DEVICE_ID } };

function createCtx(overrides: Record<string, any> = {}) {
  return {
    waitingGroups: overrides.waitingGroups || [],
    backend: {
      admin: {
        removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        reorderWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      },
      commands: {
        clearWaitlist: vi.fn().mockResolvedValue({ ok: true }),
      },
      ...overrides.backend,
    },
    showNotification: vi.fn(),
    refreshBoard: vi.fn(),
    applyBoardResponse: vi.fn(),
    TENNIS_CONFIG,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// D) removeFromWaitlistOp
// ============================================================

describe('removeFromWaitlistOp', () => {
  const GROUPS = [
    { id: 'wl-uuid-1', players: ['Alice'] },
    { id: 'wl-uuid-2', players: ['Bob'] },
  ];

  it('removes group at valid index via backend', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledWith({
      waitlistEntryId: 'wl-uuid-1',
      reason: 'admin_removed',
      deviceId: DEVICE_ID,
    });
    expect(ctx.showNotification).toHaveBeenCalledWith('Group removed from waitlist', 'success');
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('removes group at second index', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await removeFromWaitlistOp(ctx, 1);

    expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({ waitlistEntryId: 'wl-uuid-2' })
    );
  });

  it('notifies error when index out of bounds', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await removeFromWaitlistOp(ctx, 5);

    expect(ctx.backend.admin.removeFromWaitlist).not.toHaveBeenCalled();
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Cannot remove'),
      'error'
    );
  });

  it('notifies error when group has no id', async () => {
    const ctx = createCtx({ waitingGroups: [{ players: ['Alice'] }] });

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.backend.admin.removeFromWaitlist).not.toHaveBeenCalled();
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Cannot remove'),
      'error'
    );
  });

  it('notifies error when backend returns ok:false', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.removeFromWaitlist.mockResolvedValue({
      ok: false,
      message: 'Entry not found',
    });

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Entry not found'),
      'error'
    );
  });

  it('notifies error when backend throws', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.removeFromWaitlist.mockRejectedValue(new Error('Network failure'));

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Network failure'),
      'error'
    );
  });

  it('uses board from response when available (removeFromWaitlist)', async () => {
    const mockBoard = { courts: [], waitlist: [] };
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.removeFromWaitlist.mockResolvedValue({ ok: true, board: mockBoard });

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.applyBoardResponse).toHaveBeenCalledWith(
      expect.objectContaining({ board: mockBoard })
    );
    expect(ctx.refreshBoard).not.toHaveBeenCalled();
  });

  it('falls back to refreshBoard when no board in response', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.removeFromWaitlist.mockResolvedValue({ ok: true });

    await removeFromWaitlistOp(ctx, 0);

    expect(ctx.applyBoardResponse).not.toHaveBeenCalled();
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });
});

// ============================================================
// E) moveInWaitlistOp
// ============================================================

describe('moveInWaitlistOp', () => {
  const GROUPS = [
    { id: 'wl-uuid-1', players: ['Alice'] },
    { id: 'wl-uuid-2', players: ['Bob'] },
    { id: 'wl-uuid-3', players: ['Charlie'] },
  ];

  it('reorders waitlist entry to new position (0-based to 1-based)', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await moveInWaitlistOp(ctx, 0, 2);

    expect(ctx.backend.admin.reorderWaitlist).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.reorderWaitlist).toHaveBeenCalledWith({
      entryId: 'wl-uuid-1',
      newPosition: 3, // 0-based index 2 → 1-based position 3
    });
    expect(ctx.showNotification).toHaveBeenCalledWith('Moved to position 3', 'success');
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('moves to first position (index 0)', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await moveInWaitlistOp(ctx, 2, 0);

    expect(ctx.backend.admin.reorderWaitlist).toHaveBeenCalledWith({
      entryId: 'wl-uuid-3',
      newPosition: 1,
    });
  });

  it('notifies error when reorder returns ok:false', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.reorderWaitlist.mockResolvedValue({
      ok: false,
      error: 'Invalid position',
    });

    await moveInWaitlistOp(ctx, 0, 2);

    expect(ctx.showNotification).toHaveBeenCalledWith('Invalid position', 'error');
  });

  it('returns early when entry at from-index is undefined', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });

    await moveInWaitlistOp(ctx, 99, 0);

    expect(ctx.backend.admin.reorderWaitlist).not.toHaveBeenCalled();
  });

  it('uses board from response when available (moveInWaitlist)', async () => {
    const mockBoard = { courts: [], waitlist: [] };
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.reorderWaitlist.mockResolvedValue({ ok: true, board: mockBoard });

    await moveInWaitlistOp(ctx, 0, 2);

    expect(ctx.applyBoardResponse).toHaveBeenCalledWith(
      expect.objectContaining({ board: mockBoard })
    );
    expect(ctx.refreshBoard).not.toHaveBeenCalled();
  });

  it('falls back to refreshBoard when no board in moveInWaitlist response', async () => {
    const ctx = createCtx({ waitingGroups: GROUPS });
    ctx.backend.admin.reorderWaitlist.mockResolvedValue({ ok: true });

    await moveInWaitlistOp(ctx, 0, 2);

    expect(ctx.applyBoardResponse).not.toHaveBeenCalled();
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });
});

// ============================================================
// F) clearWaitlistOp
// ============================================================

describe('clearWaitlistOp', () => {
  it('delegates to backend.commands.clearWaitlist', async () => {
    const backend = {
      commands: { clearWaitlist: vi.fn().mockResolvedValue({ ok: true }) },
    };

    const result = await clearWaitlistOp(backend as any);

    expect(backend.commands.clearWaitlist).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true });
  });

  it('propagates backend failure', async () => {
    const backend = {
      commands: {
        clearWaitlist: vi.fn().mockResolvedValue({ ok: false, message: 'Failed' }),
      },
    };

    const result = await clearWaitlistOp(backend as any);

    expect(result.ok).toBe(false);
  });

  it('propagates backend exception', async () => {
    const backend = {
      commands: {
        clearWaitlist: vi.fn().mockRejectedValue(new Error('Network')),
      },
    };

    await expect(clearWaitlistOp(backend as any)).rejects.toThrow('Network');
  });
});
