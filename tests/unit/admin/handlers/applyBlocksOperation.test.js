/**
 * applyBlocksOperation — pure async handler tests
 *
 * Tests applyBlocksOp: iterates blocks x courts, validates,
 * maps reason -> blockType, calls backend.admin.createBlock per court.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger (used by applyBlocksOp for info/error logging)
vi.mock('../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { applyBlocksOp } from '../../../../src/admin/handlers/applyBlocksOperation.js';

// ============================================================
// Helpers
// ============================================================

const DEVICE_ID = 'admin-device-1';
const TENNIS_CONFIG = { DEVICES: { ADMIN_ID: DEVICE_ID } };

const COURTS = [
  { number: 1, id: 'uuid-court-1' },
  { number: 2, id: 'uuid-court-2' },
  { number: 3, id: 'uuid-court-3' },
];

function createCtx(overrides = {}) {
  return {
    courts: overrides.courts || COURTS,
    backend: {
      admin: {
        createBlock: vi.fn().mockResolvedValue({ ok: true, block: { id: 'new-block-1' } }),
      },
      ...overrides.backend,
    },
    showNotification: vi.fn(),
    refreshBoard: vi.fn(),
    TENNIS_CONFIG,
    ...overrides,
  };
}

/**
 * Build a valid block input object.
 */
function makeBlock(overrides = {}) {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // +1hr
  return {
    title: 'Maintenance',
    name: 'Maintenance',
    reason: 'Maintenance work',
    startTime: now.toISOString(),
    endTime: later.toISOString(),
    courts: [1],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// G) applyBlocksOp
// ============================================================

describe('applyBlocksOp', () => {
  it('creates block for single court', async () => {
    const ctx = createCtx();
    const block = makeBlock({ courts: [1] });

    await applyBlocksOp(ctx, [block]);

    expect(ctx.backend.admin.createBlock).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        courtId: 'uuid-court-1',
        blockType: 'maintenance',
        title: 'Maintenance',
        deviceId: DEVICE_ID,
        deviceType: 'admin',
      })
    );
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('1 block(s) successfully'),
      'success'
    );
    expect(ctx.refreshBoard).toHaveBeenCalled();
  });

  it('creates blocks for multiple courts from single block', async () => {
    const ctx = createCtx();
    const block = makeBlock({ courts: [1, 2, 3] });

    await applyBlocksOp(ctx, [block]);

    expect(ctx.backend.admin.createBlock).toHaveBeenCalledTimes(3);
    // Verify each court was targeted
    const courtIds = ctx.backend.admin.createBlock.mock.calls.map((c) => c[0].courtId);
    expect(courtIds).toEqual(['uuid-court-1', 'uuid-court-2', 'uuid-court-3']);
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('3 block(s) successfully'),
      'success'
    );
  });

  it('creates blocks for multiple block entries', async () => {
    const ctx = createCtx();
    const blocks = [makeBlock({ courts: [1] }), makeBlock({ courts: [2], reason: 'Wet court' })];

    await applyBlocksOp(ctx, blocks);

    expect(ctx.backend.admin.createBlock).toHaveBeenCalledTimes(2);
  });

  it('reports mixed success/failure counts', async () => {
    const ctx = createCtx();
    ctx.backend.admin.createBlock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: 'Conflict' })
      .mockResolvedValueOnce({ ok: true });

    const blocks = [makeBlock({ courts: [1, 2, 3] })];
    await applyBlocksOp(ctx, blocks);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('2 block(s)'),
      'warning'
    );
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('1 failed'),
      'warning'
    );
  });

  it('counts failure when createBlock throws', async () => {
    const ctx = createCtx();
    ctx.backend.admin.createBlock.mockRejectedValue(new Error('Timeout'));

    await applyBlocksOp(ctx, [makeBlock({ courts: [1] })]);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('1 failed'),
      'warning'
    );
  });

  it('skips court when court number not found in courts array', async () => {
    const ctx = createCtx();
    const block = makeBlock({ courts: [99] });

    await applyBlocksOp(ctx, [block]);

    expect(ctx.backend.admin.createBlock).not.toHaveBeenCalled();
    // failCount incremented — notification shows failure
    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('1 failed'),
      'warning'
    );
  });

  it('returns early on null/undefined blocks', async () => {
    const ctx = createCtx();

    await applyBlocksOp(ctx, null);

    expect(ctx.backend.admin.createBlock).not.toHaveBeenCalled();
    expect(ctx.showNotification).not.toHaveBeenCalled();
  });

  it('returns early on non-array blocks', async () => {
    const ctx = createCtx();

    await applyBlocksOp(ctx, 'not-an-array');

    expect(ctx.backend.admin.createBlock).not.toHaveBeenCalled();
  });

  it('shows validation error for block missing required fields', async () => {
    const ctx = createCtx();
    // Missing title/name, reason — should fail validation
    const block = { startTime: new Date().toISOString(), endTime: new Date().toISOString(), courts: [1] };

    await applyBlocksOp(ctx, [block]);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Please provide'),
      'error'
    );
    expect(ctx.backend.admin.createBlock).not.toHaveBeenCalled();
  });

  it('shows validation error for block with zero-duration', async () => {
    const ctx = createCtx();
    const sameTime = new Date().toISOString();
    const block = makeBlock({ startTime: sameTime, endTime: sameTime });

    await applyBlocksOp(ctx, [block]);

    expect(ctx.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Please provide'),
      'error'
    );
  });

  // ============================================================
  // Reason → blockType mapping
  // ============================================================

  describe('reason to blockType mapping', () => {
    const REASON_MAP = [
      ['Wet courts - rain', 'wet'],
      ['Heavy rain expected', 'wet'],
      ['Maintenance work', 'maintenance'],
      ['Court repair scheduled', 'maintenance'],
      ['Tennis lesson', 'lesson'],
      ['Group class', 'lesson'],
      ['Junior clinic today', 'clinic'],
      ['Summer camp', 'clinic'],
      ['Private party', 'other'],
      ['Reserved', 'other'],
    ];

    it.each(REASON_MAP)('reason "%s" maps to blockType "%s"', async (reason, expectedType) => {
      const ctx = createCtx();
      const block = makeBlock({ reason, courts: [1] });

      await applyBlocksOp(ctx, [block]);

      expect(ctx.backend.admin.createBlock).toHaveBeenCalledWith(
        expect.objectContaining({ blockType: expectedType })
      );
    });
  });

  it('processes valid blocks after an invalid block in the batch', async () => {
    const ctx = createCtx();
    const invalidBlock = { startTime: new Date().toISOString(), endTime: new Date().toISOString(), courts: [1] };
    const validBlock = makeBlock({ courts: [2] });

    await applyBlocksOp(ctx, [invalidBlock, validBlock]);

    // Valid block should still be processed despite invalid block preceding it
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledOnce();
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: 'uuid-court-2' })
    );
  });

  it('uses courtNumber fallback when courts array is absent', async () => {
    const ctx = createCtx();
    // No "courts" field — falls back to block.courtNumber
    const block = makeBlock({ courts: undefined, courtNumber: 2 });

    await applyBlocksOp(ctx, [block]);

    expect(ctx.backend.admin.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: 'uuid-court-2' })
    );
  });
});
