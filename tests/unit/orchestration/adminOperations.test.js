/**
 * adminOperations unit tests
 *
 * Tests admin operation handlers with mocked context (ctx).
 * All handlers receive a flat ctx object with specific deps.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleClearWaitlistOp,
  handleRemoveFromWaitlistOp,
  handleCancelBlockOp,
  handleAdminClearCourtOp,
  handleClearAllCourtsOp,
  handleMoveCourtOp,
  handleReorderWaitlistOp,
} from '../../../src/registration/handlers/adminOperations.js';

// Mock @lib to provide TENNIS_CONFIG
vi.mock('@lib', () => ({
  TENNIS_CONFIG: {
    DEVICES: {
      ADMIN_ID: 'admin-device-001',
    },
  },
}));

// Create a mock for window.confirm that we can control
const mockConfirm = vi.fn().mockReturnValue(true);

describe('adminOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm - must be on window object since code uses window.confirm
    vi.stubGlobal('window', {
      ...globalThis.window,
      confirm: mockConfirm,
      Tennis: undefined,
    });
    mockConfirm.mockReturnValue(true);
  });

  describe('handleAdminClearCourtOp', () => {
    it('calls clearCourt with court number', async () => {
      const ctx = {
        clearCourt: vi.fn().mockResolvedValue(undefined),
        showAlertMessage: vi.fn(),
      };

      await handleAdminClearCourtOp(ctx, 3);

      expect(ctx.clearCourt).toHaveBeenCalledWith(3);
      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 3 cleared');
    });

    it('shows success message after clearing', async () => {
      const ctx = {
        clearCourt: vi.fn().mockResolvedValue(undefined),
        showAlertMessage: vi.fn(),
      };

      await handleAdminClearCourtOp(ctx, 7);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 7 cleared');
    });
  });

  describe('handleClearAllCourtsOp', () => {
    it('shows confirmation dialog before clearing', async () => {
      const ctx = {
        backend: {
          admin: {
            clearAllCourts: vi.fn().mockResolvedValue({ ok: true, sessionsEnded: 5 }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleClearAllCourtsOp(ctx);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Clear all courts? This will make all courts immediately available.'
      );
    });

    it('does not clear when user cancels', async () => {
      mockConfirm.mockReturnValue(false);
      const ctx = {
        backend: {
          admin: {
            clearAllCourts: vi.fn(),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleClearAllCourtsOp(ctx);

      expect(ctx.backend.admin.clearAllCourts).not.toHaveBeenCalled();
    });

    it('shows success message with session count', async () => {
      const ctx = {
        backend: {
          admin: {
            clearAllCourts: vi.fn().mockResolvedValue({ ok: true, sessionsEnded: 3 }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleClearAllCourtsOp(ctx);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith(
        'All courts cleared successfully (3 sessions ended)'
      );
    });

    it('shows error message on failure', async () => {
      const ctx = {
        backend: {
          admin: {
            clearAllCourts: vi.fn().mockResolvedValue({ ok: false, message: 'Server error' }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleClearAllCourtsOp(ctx);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Server error');
    });
  });

  describe('handleRemoveFromWaitlistOp', () => {
    it('shows error when group has no ID', async () => {
      const ctx = {
        backend: { admin: { removeFromWaitlist: vi.fn() } },
        showAlertMessage: vi.fn(),
      };

      await handleRemoveFromWaitlistOp(ctx, { name: 'Test Group' });

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Cannot remove: group ID not found');
      expect(ctx.backend.admin.removeFromWaitlist).not.toHaveBeenCalled();
    });

    it('calls removeFromWaitlist with correct params', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleRemoveFromWaitlistOp(ctx, { id: 'entry-123' });

      expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledWith({
        waitlistEntryId: 'entry-123',
        reason: 'admin_removed',
        deviceId: 'admin-device-001',
      });
    });

    it('shows success message on removal', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleRemoveFromWaitlistOp(ctx, { id: 'entry-123' });

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Group removed from waitlist');
    });

    it('shows error message on failure', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi.fn().mockResolvedValue({ ok: false, message: 'Entry not found' }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleRemoveFromWaitlistOp(ctx, { id: 'entry-123' });

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Entry not found');
    });
  });

  describe('handleClearWaitlistOp', () => {
    it('shows confirmation dialog', async () => {
      const ctx = {
        backend: { admin: { removeFromWaitlist: vi.fn() } },
        showAlertMessage: vi.fn(),
        getCourtData: () => ({ waitlist: [] }),
      };

      await handleClearWaitlistOp(ctx);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Clear the waitlist? This will remove all waiting groups.'
      );
    });

    it('removes all groups from waitlist', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
        }),
      };

      await handleClearWaitlistOp(ctx);

      expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledTimes(3);
      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Waitlist cleared (3 groups removed)');
    });

    it('reports partial success', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi
              .fn()
              .mockResolvedValueOnce({ ok: true })
              .mockResolvedValueOnce({ ok: false })
              .mockResolvedValueOnce({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
        }),
      };

      await handleClearWaitlistOp(ctx);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Removed 2 groups, 1 failed');
    });

    it('skips groups without ID', async () => {
      const ctx = {
        backend: {
          admin: {
            removeFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }, { name: 'No ID Group' }, { id: 'entry-3' }],
        }),
      };

      await handleClearWaitlistOp(ctx);

      expect(ctx.backend.admin.removeFromWaitlist).toHaveBeenCalledTimes(2);
      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Removed 2 groups, 1 failed');
    });
  });

  describe('handleCancelBlockOp', () => {
    it('calls cancelBlock with correct params', async () => {
      const ctx = {
        backend: {
          admin: {
            cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleCancelBlockOp(ctx, 'block-456', 5);

      expect(ctx.backend.admin.cancelBlock).toHaveBeenCalledWith({
        blockId: 'block-456',
        deviceId: 'admin-device-001',
      });
    });

    it('shows success message with court number', async () => {
      const ctx = {
        backend: {
          admin: {
            cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleCancelBlockOp(ctx, 'block-456', 5);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 5 unblocked');
    });

    it('shows error message on failure', async () => {
      const ctx = {
        backend: {
          admin: {
            cancelBlock: vi.fn().mockResolvedValue({ ok: false, message: 'Block not found' }),
          },
        },
        showAlertMessage: vi.fn(),
      };

      await handleCancelBlockOp(ctx, 'block-456', 5);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Block not found');
    });
  });

  describe('handleMoveCourtOp', () => {
    it('moves session from one court to another', async () => {
      const ctx = {
        backend: {
          commands: {
            moveCourt: vi.fn().mockResolvedValue({ ok: true }),
          },
          queries: {
            getBoard: vi.fn(),
          },
        },
        getCourtData: () => ({
          courts: [
            { number: 1, id: 'court-1' },
            { number: 2, id: 'court-2' },
          ],
        }),
        showAlertMessage: vi.fn(),
        setCourtToMove: vi.fn(),
      };

      await handleMoveCourtOp(ctx, 1, 2);

      expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith({
        fromCourtId: 'court-1',
        toCourtId: 'court-2',
      });
      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Court 1 moved to Court 2');
      expect(ctx.setCourtToMove).toHaveBeenCalledWith(null);
    });

    it('shows error when source court not found', async () => {
      const ctx = {
        backend: { commands: { moveCourt: vi.fn() }, queries: { getBoard: vi.fn() } },
        getCourtData: () => ({
          courts: [{ number: 1 }, { number: 2, id: 'court-2' }],
        }),
        showAlertMessage: vi.fn(),
        setCourtToMove: vi.fn(),
      };

      await handleMoveCourtOp(ctx, 1, 2);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Source court not found');
      expect(ctx.setCourtToMove).toHaveBeenCalledWith(null);
    });

    it('fetches destination court ID from API when not in local data', async () => {
      const ctx = {
        backend: {
          commands: {
            moveCourt: vi.fn().mockResolvedValue({ ok: true }),
          },
          queries: {
            getBoard: vi.fn().mockResolvedValue({
              courts: [{ number: 2, id: 'api-court-2' }],
            }),
          },
        },
        getCourtData: () => ({
          courts: [{ number: 1, id: 'court-1' }, { number: 2 }],
        }),
        showAlertMessage: vi.fn(),
        setCourtToMove: vi.fn(),
      };

      await handleMoveCourtOp(ctx, 1, 2);

      expect(ctx.backend.queries.getBoard).toHaveBeenCalled();
      expect(ctx.backend.commands.moveCourt).toHaveBeenCalledWith({
        fromCourtId: 'court-1',
        toCourtId: 'api-court-2',
      });
    });

    it('shows error when destination court not found', async () => {
      const ctx = {
        backend: {
          commands: { moveCourt: vi.fn() },
          queries: {
            getBoard: vi.fn().mockResolvedValue({ courts: [] }),
          },
        },
        getCourtData: () => ({
          courts: [{ number: 1, id: 'court-1' }, { number: 2 }],
        }),
        showAlertMessage: vi.fn(),
        setCourtToMove: vi.fn(),
      };

      await handleMoveCourtOp(ctx, 1, 2);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Destination court not found');
    });
  });

  describe('handleReorderWaitlistOp', () => {
    const mockReorderWaitlist = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      // Set up window.Tennis mock
      mockReorderWaitlist.mockClear();
      mockReorderWaitlist.mockResolvedValue(undefined);
      globalThis.window = {
        ...globalThis.window,
        confirm: mockConfirm,
        Tennis: {
          Commands: {
            reorderWaitlist: mockReorderWaitlist,
          },
        },
      };
    });

    it('calls reorderWaitlist API with correct params', async () => {
      const ctx = {
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }, { id: 'entry-2' }, { id: 'entry-3' }],
        }),
        showAlertMessage: vi.fn(),
        setWaitlistMoveFrom: vi.fn(),
      };

      await handleReorderWaitlistOp(ctx, 0, 2);

      expect(mockReorderWaitlist).toHaveBeenCalledWith({
        entryId: 'entry-1',
        newPosition: 2,
      });
      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Group moved to position 3');
    });

    it('resets waitlistMoveFrom after operation', async () => {
      const ctx = {
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }],
        }),
        showAlertMessage: vi.fn(),
        setWaitlistMoveFrom: vi.fn(),
      };

      await handleReorderWaitlistOp(ctx, 0, 1);

      expect(ctx.setWaitlistMoveFrom).toHaveBeenCalledWith(null);
    });

    it('shows error when API call fails', async () => {
      mockReorderWaitlist.mockRejectedValue(new Error('Network error'));

      const ctx = {
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }],
        }),
        showAlertMessage: vi.fn(),
        setWaitlistMoveFrom: vi.fn(),
      };

      await handleReorderWaitlistOp(ctx, 0, 1);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith('Network error');
    });

    it('shows unavailable message when API not available', async () => {
      globalThis.window = {
        ...globalThis.window,
        confirm: mockConfirm,
        Tennis: undefined,
      };

      const ctx = {
        getCourtData: () => ({
          waitlist: [{ id: 'entry-1' }],
        }),
        showAlertMessage: vi.fn(),
        setWaitlistMoveFrom: vi.fn(),
      };

      await handleReorderWaitlistOp(ctx, 0, 1);

      expect(ctx.showAlertMessage).toHaveBeenCalledWith(
        'Waitlist reorder requires API — feature temporarily unavailable'
      );
    });

    it('handles nested group.id structure', async () => {
      const ctx = {
        getCourtData: () => ({
          waitlist: [{ group: { id: 'nested-entry-1' } }],
        }),
        showAlertMessage: vi.fn(),
        setWaitlistMoveFrom: vi.fn(),
      };

      await handleReorderWaitlistOp(ctx, 0, 1);

      expect(mockReorderWaitlist).toHaveBeenCalledWith({
        entryId: 'nested-entry-1',
        newPosition: 1,
      });
    });
  });
});
