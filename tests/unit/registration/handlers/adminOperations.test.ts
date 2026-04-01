/**
 * adminOperations.js handler tests
 *
 * Tests all exported handler functions with mocked backend + context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@lib', () => ({
  TENNIS_CONFIG: {
    DEVICES: { ADMIN_ID: 'admin-device-1' },
  },
}));

import {
  handleClearWaitlistOp,
  handleRemoveFromWaitlistOp,
  handleCancelBlockOp,
  handleAdminClearCourtOp,
  handleClearAllCourtsOp,
  handleReorderWaitlistOp,
  handleMoveCourtOp,
  handleBlockCreateOp,
} from '../../../../src/registration/handlers/adminOperations.js';

// Type assertion: partial mock for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCtx(overrides: any = {}): any {
  return {
    backend: {
      admin: {
        removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
        clearAllCourts: vi.fn().mockResolvedValue({ ok: true, sessionsEnded: 5 }),
        reorderWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        createBlock: vi.fn().mockResolvedValue({ ok: true }),
      },
      commands: {
        moveCourt: vi.fn().mockResolvedValue({ ok: true }),
      },
      queries: {
        getBoard: vi.fn().mockResolvedValue({ courts: [] }),
      },
    },
    showAlertMessage: vi.fn(),
    getCourtData: vi.fn(() => ({
      courts: [
        { id: 'c1', number: 1 },
        { id: 'c2', number: 2 },
        { id: 'c3', number: 3 },
      ],
      waitlist: [],
    })),
    confirm: vi.fn(() => true),
    clearCourt: vi.fn().mockResolvedValue(undefined),
    setWaitlistMoveFrom: vi.fn(),
    setCourtToMove: vi.fn(),
    setBlockingInProgress: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── handleClearWaitlistOp ────────────────────────────────────
describe('handleClearWaitlistOp', () => {
  it('removes all waitlist groups on confirm', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      waitlist: [{ id: 'w1' }, { id: 'w2' }],
    });
    await handleClearWaitlistOp(ctx);
    expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledTimes(2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Waitlist cleared (2 groups removed)');
  });

  it('does nothing when user cancels confirm', async () => {
    const ctx = createCtx({ confirm: vi.fn(() => false) });
    await handleClearWaitlistOp(ctx);
    expect(ctx.backend.admin.removeFromWaitlist).not.toHaveBeenCalled();
  });

  it('counts failures for groups without id', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      waitlist: [{ id: null }, { id: 'w1' }],
    });
    await handleClearWaitlistOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('1 failed'));
  });

  it('shows failure message when all fail', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({ waitlist: [{ id: null }] });
    await handleClearWaitlistOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Failed to clear waitlist');
  });

  it('shows partial failure message', async () => {
    const ctx = createCtx();
    ctx.backend.admin.removeFromWaitlist.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
    ctx.getCourtData.mockReturnValue({ waitlist: [{ id: 'w1' }, { id: 'w2' }] });
    await handleClearWaitlistOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('1 failed'));
  });
});

// ── handleRemoveFromWaitlistOp ───────────────────────────────
describe('handleRemoveFromWaitlistOp', () => {
  it('removes group by id', async () => {
    const ctx = createCtx();
    await handleRemoveFromWaitlistOp(ctx, { id: 'w1' });
    expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({ waitlistEntryId: 'w1' })
    );
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Group removed from waitlist');
  });

  it('shows error when group has no id', async () => {
    const ctx = createCtx();
    await handleRemoveFromWaitlistOp(ctx, {});
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Cannot remove: group ID not found');
  });

  it('shows backend error message on failure', async () => {
    const ctx = createCtx();
    ctx.backend.admin.removeFromWaitlist.mockResolvedValue({ ok: false, message: 'Server error' });
    await handleRemoveFromWaitlistOp(ctx, { id: 'w1' });
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Server error');
  });
});

// ── handleCancelBlockOp ──────────────────────────────────────
describe('handleCancelBlockOp', () => {
  it('cancels block successfully', async () => {
    const ctx = createCtx();
    await handleCancelBlockOp(ctx, 'b1', 3);
    expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledWith(
      expect.objectContaining({ blockId: 'b1' })
    );
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 3 unblocked');
  });

  it('shows error on failure', async () => {
    const ctx = createCtx();
    ctx.backend.admin.cancelBlock.mockResolvedValue({ ok: false, message: 'Not found' });
    await handleCancelBlockOp(ctx, 'b1', 3);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Not found');
  });
});

// ── handleAdminClearCourtOp ──────────────────────────────────
describe('handleAdminClearCourtOp', () => {
  it('clears court and shows message', async () => {
    const ctx = createCtx();
    await handleAdminClearCourtOp(ctx, 5);
    expect(ctx.clearCourt).toHaveBeenCalledWith(5);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 5 cleared');
  });
});

// ── handleClearAllCourtsOp ───────────────────────────────────
describe('handleClearAllCourtsOp', () => {
  it('clears all courts on confirm', async () => {
    const ctx = createCtx();
    await handleClearAllCourtsOp(ctx);
    expect(ctx.backend.admin.clearAllCourts).toHaveBeenCalled();
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('5 sessions'));
  });

  it('does nothing when user cancels', async () => {
    const ctx = createCtx({ confirm: vi.fn(() => false) });
    await handleClearAllCourtsOp(ctx);
    expect(ctx.backend.admin.clearAllCourts).not.toHaveBeenCalled();
  });

  it('shows error on failure', async () => {
    const ctx = createCtx();
    ctx.backend.admin.clearAllCourts.mockResolvedValue({ ok: false, message: 'Error' });
    await handleClearAllCourtsOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Error');
  });
});

// ── handleReorderWaitlistOp ──────────────────────────────────
describe('handleReorderWaitlistOp', () => {
  it('reorders group successfully', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({ waitlist: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] });
    await handleReorderWaitlistOp(ctx, 0, 2);
    expect(ctx.backend.admin.reorderWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: 'w1', newPosition: 2 })
    );
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Group moved to position 3');
    expect(ctx.setWaitlistMoveFrom).toHaveBeenCalledWith(null);
  });

  it('uses group.id as fallback', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({ waitlist: [{ group: { id: 'g1' } }] });
    await handleReorderWaitlistOp(ctx, 0, 1);
    expect(ctx.backend.admin.reorderWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: 'g1' })
    );
  });

  it('shows unavailable message when API missing', async () => {
    const ctx = createCtx();
    ctx.backend.admin.reorderWaitlist = undefined;
    ctx.getCourtData.mockReturnValue({ waitlist: [{ id: 'w1' }] });
    await handleReorderWaitlistOp(ctx, 0, 1);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('temporarily unavailable'));
  });

  it('handles API errors', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({ waitlist: [{ id: 'w1' }] });
    ctx.backend.admin.reorderWaitlist.mockRejectedValue(new Error('Network error'));
    await handleReorderWaitlistOp(ctx, 0, 1);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Network error');
  });
});

// ── handleMoveCourtOp ────────────────────────────────────────
describe('handleMoveCourtOp', () => {
  it('moves court successfully', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [
        { id: 'from-id', number: 1 },
        { id: 'to-id', number: 2 },
      ],
    });
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith({
      fromCourtId: 'from-id',
      toCourtId: 'to-id',
    });
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 1 moved to Court 2');
    expect(ctx.setCourtToMove).toHaveBeenCalledWith(null);
  });

  it('shows error when source court not found', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({ courts: [null, { id: 'to-id' }] });
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Source court not found');
  });

  it('looks up destination court via API when id missing', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [{ id: 'from-id' }, {}], // toCourt has no id
    });
    ctx.backend.queries.getBoard.mockResolvedValue({
      courts: [{ number: 2, id: 'api-to-id' }],
    });
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith(
      expect.objectContaining({ toCourtId: 'api-to-id' })
    );
  });

  it('shows error when destination not found', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [{ id: 'from-id' }, {}],
    });
    ctx.backend.queries.getBoard.mockResolvedValue({ courts: [] });
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Destination court not found');
  });

  it('handles move API failure', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [{ id: 'f' }, { id: 't' }],
    });
    ctx.backend.commands.moveCourt.mockResolvedValue({ ok: false, message: 'Conflict' });
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Conflict');
  });

  it('handles thrown errors', async () => {
    const ctx = createCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [{ id: 'f' }, { id: 't' }],
    });
    ctx.backend.commands.moveCourt.mockRejectedValue(new Error('Network'));
    await handleMoveCourtOp(ctx, 1, 2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('Network');
    expect(ctx.setCourtToMove).toHaveBeenCalledWith(null);
  });
});

// ── handleBlockCreateOp ──────────────────────────────────────
describe('handleBlockCreateOp', () => {
  function createBlockCtx(overrides = {}) {
    return createCtx({
      selectedCourtsToBlock: [1, 2],
      blockMessage: 'LESSON',
      blockStartTime: 'now',
      blockEndTime: '14:00',
      ...overrides,
    });
  }

  it('validates no courts selected', async () => {
    const ctx = createBlockCtx({ selectedCourtsToBlock: [] });
    await handleBlockCreateOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('select at least'));
  });

  it('validates no block reason', async () => {
    const ctx = createBlockCtx({ blockMessage: '' });
    await handleBlockCreateOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('block reason'));
  });

  it('validates no end time', async () => {
    const ctx = createBlockCtx({ blockEndTime: '' });
    await handleBlockCreateOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('end time'));
  });

  it('creates blocks successfully', async () => {
    const ctx = createBlockCtx();
    ctx.getCourtData.mockReturnValue({
      courts: [{ id: 'c1' }, { id: 'c2' }],
    });
    await handleBlockCreateOp(ctx);
    expect(ctx.setBlockingInProgress).toHaveBeenCalledWith(true);
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledTimes(2);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith('2 court(s) blocked successfully');
  });

  it('maps block types correctly', async () => {
    const ctx = createBlockCtx({ selectedCourtsToBlock: [1], blockMessage: 'WET COURT' });
    ctx.getCourtData.mockReturnValue({ courts: [{ id: 'c1' }] });
    await handleBlockCreateOp(ctx);
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({ blockType: 'wet' })
    );
  });

  it('reports partial failures', async () => {
    const ctx = createBlockCtx();
    ctx.getCourtData.mockReturnValue({ courts: [{ id: 'c1' }, null] });
    await handleBlockCreateOp(ctx);
    expect(ctx.showAlertMessage).toHaveBeenCalledWith(expect.stringContaining('Failed'));
  });

  it('handles specific start time', async () => {
    const ctx = createBlockCtx({ blockStartTime: '10:00', selectedCourtsToBlock: [1] });
    ctx.getCourtData.mockReturnValue({ courts: [{ id: 'c1' }] });
    await handleBlockCreateOp(ctx);
    expect(ctx.backend.admin.createBlock).toHaveBeenCalledTimes(1);
  });
});
