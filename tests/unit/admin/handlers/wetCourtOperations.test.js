/**
 * wetCourtOperations unit tests
 *
 * Tests pure backend operation functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  activateWetCourtsOp,
  clearAllWetCourtsOp,
  clearWetCourtOp,
} from '../../../../src/admin/handlers/wetCourtOperations.js';

function createCtx(overrides = {}) {
  return {
    backend: {
      admin: {
        markWetCourts: vi.fn().mockResolvedValue({
          ok: true,
          courtsMarked: 12,
          courtNumbers: [1, 2, 3],
        }),
        clearWetCourts: vi.fn().mockResolvedValue({
          ok: true,
          blocksCleared: 5,
        }),
      },
    },
    getDeviceId: vi.fn().mockReturnValue('device-123'),
    ...overrides,
  };
}

describe('activateWetCourtsOp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls markWetCourts with correct params', async () => {
    const ctx = createCtx();
    await activateWetCourtsOp(ctx);
    expect(ctx.backend.admin.markWetCourts).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-123',
        durationMinutes: 720,
        reason: 'WET COURT',
      })
    );
  });

  it('includes idempotencyKey in the call', async () => {
    const ctx = createCtx();
    await activateWetCourtsOp(ctx);
    const call = ctx.backend.admin.markWetCourts.mock.calls[0][0];
    expect(call.idempotencyKey).toMatch(/^wet-\d+-[a-z0-9]+$/);
  });

  it('returns the backend result', async () => {
    const ctx = createCtx();
    const result = await activateWetCourtsOp(ctx);
    expect(result.ok).toBe(true);
    expect(result.courtsMarked).toBe(12);
  });

  it('propagates backend errors', async () => {
    const ctx = createCtx();
    ctx.backend.admin.markWetCourts.mockRejectedValue(new Error('network'));
    await expect(activateWetCourtsOp(ctx)).rejects.toThrow('network');
  });
});

describe('clearAllWetCourtsOp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls clearWetCourts with deviceId only', async () => {
    const ctx = createCtx();
    await clearAllWetCourtsOp(ctx);
    expect(ctx.backend.admin.clearWetCourts).toHaveBeenCalledWith({
      deviceId: 'device-123',
    });
  });

  it('returns the backend result', async () => {
    const ctx = createCtx();
    const result = await clearAllWetCourtsOp(ctx);
    expect(result.ok).toBe(true);
    expect(result.blocksCleared).toBe(5);
  });

  it('propagates backend errors', async () => {
    const ctx = createCtx();
    ctx.backend.admin.clearWetCourts.mockRejectedValue(new Error('timeout'));
    await expect(clearAllWetCourtsOp(ctx)).rejects.toThrow('timeout');
  });
});

describe('clearWetCourtOp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls clearWetCourts with specific courtId', async () => {
    const ctx = { ...createCtx(), courtId: 'court-uuid-5' };
    await clearWetCourtOp(ctx);
    expect(ctx.backend.admin.clearWetCourts).toHaveBeenCalledWith({
      deviceId: 'device-123',
      courtIds: ['court-uuid-5'],
    });
  });

  it('returns the backend result', async () => {
    const ctx = { ...createCtx(), courtId: 'court-uuid-5' };
    const result = await clearWetCourtOp(ctx);
    expect(result.ok).toBe(true);
  });
});
