/**
 * courtOperations — pure async handler tests
 *
 * Tests clearCourtOp, moveCourtOp, clearAllCourtsOp.
 * All functions take a ctx object with injected deps — no React, no DOM.
 *
 * All operations use ctx.showNotification for user feedback.
 * ctx.refreshBoard is called after successful mutations.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearCourtOp,
  moveCourtOp,
  clearAllCourtsOp,
} from '../../../../src/admin/handlers/courtOperations.js';

// ============================================================
// Helpers
// ============================================================

const DEVICE_ID = 'admin-device-1';
const TENNIS_CONFIG = { DEVICES: { ADMIN_ID: DEVICE_ID } };

function createCtx(overrides = {}) {
  return {
    courts: overrides.courts || [],
    backend: {
      admin: {
        adminEndSession: vi.fn().mockResolvedValue({ ok: true }),
        cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
        clearAllCourts: vi.fn().mockResolvedValue({ ok: true, sessionsEnded: 3 }),
      },
      commands: {
        moveCourt: vi.fn().mockResolvedValue({ ok: true }),
      },
      queries: {
        getBoard: vi.fn().mockResolvedValue({
          ok: true,
          courts: overrides.boardCourts || [],
        }),
      },
      ...overrides.backend,
    },
    showNotification: vi.fn(),
    refreshBoard: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
    dataStore: {
      set: vi.fn().mockResolvedValue(undefined),
    },
    TENNIS_CONFIG,
    ...overrides,
    // Ensure nested backend isn't flattened by spread
  };
}

// Re-assemble backend when overrides need it
function createCtxWithBackend(backendOverrides, ctxOverrides = {}) {
  const ctx = createCtx(ctxOverrides);
  // Apply backend overrides deeply
  if (backendOverrides.admin) {
    Object.assign(ctx.backend.admin, backendOverrides.admin);
  }
  if (backendOverrides.commands) {
    Object.assign(ctx.backend.commands, backendOverrides.commands);
  }
  if (backendOverrides.queries) {
    Object.assign(ctx.backend.queries, backendOverrides.queries);
  }
  return ctx;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// A) clearCourtOp
// ============================================================

describe('clearCourtOp', () => {
  it('ends session when court has active session (no block)', async () => {
    const ctx = createCtx({
      courts: [{ number: 3, id: 'court-uuid-3', session: { id: 'sess-1' } }],
    });

    await clearCourtOp(ctx, 3);

    expect(ctx.backend.admin.adminEndSession).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.adminEndSession).toHaveBeenCalledWith({
      courtId: 'court-uuid-3',
      reason: 'admin_force_end',
      deviceId: DEVICE_ID,
    });
    expect(ctx.showNotification).toHaveBeenCalledWith('Court 3 cleared', 'success');
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('cancels block when court has active block (no session)', async () => {
    const ctx = createCtx({
      courts: [{ number: 5, id: 'court-uuid-5', block: { id: 'block-1' } }],
    });

    await clearCourtOp(ctx, 5);

    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledWith({
      blockId: 'block-1',
      deviceId: DEVICE_ID,
    });
    expect(ctx.showNotification).toHaveBeenCalledWith('Court 5 unblocked', 'success');
    // Should NOT call adminEndSession
    expect(ctx.backend.admin.adminEndSession).not.toHaveBeenCalled();
  });

  it('clears both block and session when court has both', async () => {
    const ctx = createCtx({
      courts: [
        { number: 1, id: 'court-uuid-1', block: { id: 'block-1' }, session: { id: 'sess-1' } },
      ],
    });

    await clearCourtOp(ctx, 1);

    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.adminEndSession).toHaveBeenCalledOnce();
  });

  it('still clears session even if block cancel fails', async () => {
    const ctx = createCtx({
      courts: [
        { number: 1, id: 'court-uuid-1', block: { id: 'block-1' }, session: { id: 'sess-1' } },
      ],
    });
    ctx.backend.admin.cancelBlock.mockResolvedValue({ ok: false, message: 'Block locked' });

    await clearCourtOp(ctx, 1);

    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.adminEndSession).toHaveBeenCalledOnce();
    expect(ctx.showNotification).toHaveBeenCalledWith('Block locked', 'error');
  });

  it('notifies "already empty" when court has neither session nor block', async () => {
    const ctx = createCtx({
      courts: [{ number: 2, id: 'court-uuid-2' }],
    });

    await clearCourtOp(ctx, 2);

    expect(ctx.backend.admin.adminEndSession).not.toHaveBeenCalled();
    expect(ctx.backend.admin.cancelBlock).not.toHaveBeenCalled();
    expect(ctx.showNotification).toHaveBeenCalledWith('Court 2 is already empty', 'info');
  });

  it('notifies error when court number not found in courts array', async () => {
    const ctx = createCtx({
      courts: [{ number: 1, id: 'court-uuid-1' }],
    });

    await clearCourtOp(ctx, 99);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Court 99 not found'),
      'error'
    );
  });

  it('notifies error when adminEndSession returns ok:false', async () => {
    const ctx = createCtx({
      courts: [{ number: 3, id: 'court-uuid-3', session: { id: 'sess-1' } }],
    });
    ctx.backend.admin.adminEndSession.mockResolvedValue({
      ok: false,
      message: 'Session locked',
    });

    await clearCourtOp(ctx, 3);

    expect(ctx.showNotification).toHaveBeenCalledWith('Session locked', 'error');
  });

  it('notifies error when cancelBlock returns ok:false', async () => {
    const ctx = createCtx({
      courts: [{ number: 5, id: 'court-uuid-5', block: { id: 'block-1' } }],
    });
    ctx.backend.admin.cancelBlock.mockResolvedValue({
      ok: false,
      message: 'Block not found',
    });

    await clearCourtOp(ctx, 5);

    expect(ctx.showNotification).toHaveBeenCalledWith('Block not found', 'error');
  });

  it('notifies error when backend throws', async () => {
    const ctx = createCtx({
      courts: [{ number: 3, id: 'court-uuid-3', session: { id: 'sess-1' } }],
    });
    ctx.backend.admin.adminEndSession.mockRejectedValue(new Error('Network down'));

    await clearCourtOp(ctx, 3);

    expect(ctx.showNotification).toHaveBeenCalledWith('Network down', 'error');
  });
});

// ============================================================
// B) moveCourtOp
// ============================================================

describe('moveCourtOp', () => {
  const BOARD_COURTS = [
    { number: 1, id: 'uuid-court-1' },
    { number: 2, id: 'uuid-court-2' },
    { number: 3, id: 'uuid-court-3' },
  ];

  it('looks up court UUIDs from board and calls moveCourt', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });

    const result = await moveCourtOp(ctx, 1, 3);

    expect(ctx.backend.queries.getBoard).toHaveBeenCalledOnce();
    expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith({
      fromCourtId: 'uuid-court-1',
      toCourtId: 'uuid-court-3',
    });
    expect(result).toEqual({ success: true, from: 1, to: 3 });
    expect(ctx.showNotification).toHaveBeenCalledWith('Moved from Court 1 to Court 3', 'success');
  });

  it('converts string court numbers to integers', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });

    const result = await moveCourtOp(ctx, '2', '3');

    expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith({
      fromCourtId: 'uuid-court-2',
      toCourtId: 'uuid-court-3',
    });
    expect(result).toEqual({ success: true, from: 2, to: 3 });
  });

  it('calls refreshBoard after success', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });

    await moveCourtOp(ctx, 1, 2);

    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('returns error when source court not found', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });

    const result = await moveCourtOp(ctx, 99, 1);

    expect(result).toEqual({ success: false, error: 'Source court not found' });
    expect(ctx.showNotification).toHaveBeenCalledWith('Court 99 not found', 'error');
    expect(ctx.backend.commands.moveCourt).not.toHaveBeenCalled();
  });

  it('returns error when destination court not found', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });

    const result = await moveCourtOp(ctx, 1, 99);

    expect(result).toEqual({ success: false, error: 'Destination court not found' });
    expect(ctx.showNotification).toHaveBeenCalledWith('Court 99 not found', 'error');
    expect(ctx.backend.commands.moveCourt).not.toHaveBeenCalled();
  });

  it('returns error when moveCourt returns ok:false', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });
    ctx.backend.commands.moveCourt.mockResolvedValue({
      ok: false,
      message: 'Destination occupied',
    });

    const result = await moveCourtOp(ctx, 1, 2);

    expect(result).toEqual({ success: false, error: 'Destination occupied' });
    expect(ctx.showNotification).toHaveBeenCalledWith('Destination occupied', 'error');
  });

  it('returns error when backend throws', async () => {
    const ctx = createCtx({ boardCourts: BOARD_COURTS });
    ctx.backend.commands.moveCourt.mockRejectedValue(new Error('Timeout'));

    const result = await moveCourtOp(ctx, 1, 2);

    expect(result).toEqual({ success: false, error: 'Timeout' });
    expect(ctx.showNotification).toHaveBeenCalledWith('Timeout', 'error');
  });

  it('returns error when getBoard returns empty courts', async () => {
    const ctx = createCtx({ boardCourts: [] });

    const result = await moveCourtOp(ctx, 1, 2);

    expect(result).toEqual({ success: false, error: 'Source court not found' });
  });
});

// ============================================================
// C) clearAllCourtsOp
// ============================================================

describe('clearAllCourtsOp', () => {
  it('clears all courts when confirm accepted', async () => {
    const ctx = createCtx({
      courts: [
        { number: 1, id: 'uuid-1', block: { id: 'block-1' } },
        { number: 2, id: 'uuid-2', session: { id: 'sess-1' } },
        { number: 3, id: 'uuid-3' }, // empty court — no block
      ],
    });

    await clearAllCourtsOp(ctx);

    // confirm should be called with the warning message
    expect(ctx.confirm).toHaveBeenCalledOnce();
    expect(ctx.confirm).toHaveBeenCalledWith(expect.stringContaining('clear ALL courts'));

    // clearAllCourts called to end all sessions
    expect(ctx.backend.admin.clearAllCourts).toHaveBeenCalledWith({
      deviceId: DEVICE_ID,
      reason: 'admin_clear_all',
    });

    // cancelBlock called for each court WITH a block (only court 1)
    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledTimes(1);
    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledWith({
      blockId: 'block-1',
      deviceId: DEVICE_ID,
    });

    // localStorage cleared via dataStore
    expect(ctx.dataStore.set).toHaveBeenCalledWith('courtBlocks', [], { immediate: true });

    // Success notification with sessions count
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('3 sessions ended'),
      'success'
    );
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('does nothing when confirm rejected', async () => {
    const ctx = createCtx();
    ctx.confirm.mockResolvedValue(false);

    await clearAllCourtsOp(ctx);

    expect(ctx.backend.admin.clearAllCourts).not.toHaveBeenCalled();
    expect(ctx.backend.admin.cancelBlock).not.toHaveBeenCalled();
    expect(ctx.dataStore.set).not.toHaveBeenCalled();
    expect(ctx.showNotification).not.toHaveBeenCalled();
  });

  it('notifies error when clearAllCourts returns ok:false', async () => {
    const ctx = createCtx({
      courts: [],
    });
    ctx.backend.admin.clearAllCourts.mockResolvedValue({
      ok: false,
      message: 'Permission denied',
    });

    await clearAllCourtsOp(ctx);

    expect(ctx.showNotification).toHaveBeenCalledWith('Permission denied', 'error');
    // Should NOT proceed to cancel blocks or clear dataStore
    expect(ctx.dataStore.set).not.toHaveBeenCalled();
  });

  it('notifies error when backend throws', async () => {
    const ctx = createCtx({
      courts: [],
    });
    ctx.backend.admin.clearAllCourts.mockRejectedValue(new Error('Network error'));

    await clearAllCourtsOp(ctx);

    expect(ctx.showNotification).toHaveBeenCalledWith('Network error', 'error');
  });

  it('cancels multiple blocks when multiple courts have blocks', async () => {
    const ctx = createCtx({
      courts: [
        { number: 1, id: 'uuid-1', block: { id: 'block-1' } },
        { number: 2, id: 'uuid-2', block: { id: 'block-2' } },
        { number: 3, id: 'uuid-3', block: { id: 'block-3' } },
      ],
    });

    await clearAllCourtsOp(ctx);

    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledTimes(3);
  });
});
