/**
 * Court Operations
 * Extracted from AdminPanelV2 for maintainability.
 * These are pure handler logic - no React hooks or state.
 */
const Tennis = window.Tennis;

export async function clearCourtOp(ctx, courtNumber) {
  const { courts, backend, showNotification, TENNIS_CONFIG } = ctx;

  try {
    // Find court UUID from courts state
    const court = courts.find((c) => c.number === courtNumber);
    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Check if court has a block - cancel it instead of ending session
    if (court.block && court.block.id) {
      const result = await backend.admin.cancelBlock({
        blockId: court.block.id,
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });
      if (!result.ok) {
        throw new Error(result.message || 'Failed to cancel block');
      }
      showNotification(`Court ${courtNumber} unblocked`, 'success');
    } else if (court.session) {
      // End the session via backend
      const result = await backend.admin.adminEndSession({
        courtId: court.id,
        reason: 'admin_force_end',
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });
      if (!result.ok) {
        throw new Error(result.message || 'Failed to clear court');
      }
      showNotification(`Court ${courtNumber} cleared`, 'success');
    } else {
      showNotification(`Court ${courtNumber} is already empty`, 'info');
    }

    // Realtime subscription will update the UI automatically
  } catch (error) {
    console.error('Error clearing court:', error);
    showNotification(error.message || 'Failed to clear court', 'error');
  }
}

export async function moveCourtOp(ctx, from, to) {
  const { backend } = ctx;

  const f = Number(from),
    t = Number(to);

  try {
    // Get court IDs from the current board state
    const board = await backend.queries.getBoard();
    const fromCourt = board?.courts?.find((c) => c.number === f);
    const toCourt = board?.courts?.find((c) => c.number === t);

    if (!fromCourt?.id) {
      Tennis?.UI?.toast?.(`Court ${f} not found`, { type: 'error' });
      return { success: false, error: 'Source court not found' };
    }

    if (!toCourt?.id) {
      Tennis?.UI?.toast?.(`Court ${t} not found`, { type: 'error' });
      return { success: false, error: 'Destination court not found' };
    }

    const res = await backend.commands.moveCourt({
      fromCourtId: fromCourt.id,
      toCourtId: toCourt.id,
    });

    if (!res?.ok) {
      Tennis?.UI?.toast?.(res?.message || 'Failed to move court', { type: 'error' });
      return { success: false, error: res?.message };
    }

    Tennis?.UI?.toast?.(`Moved from Court ${f} to Court ${t}`, { type: 'success' });

    // Belt & suspenders: coalescer should refresh, but trigger explicit refresh too.
    window.refreshAdminView?.();

    return { success: true, from: f, to: t };
  } catch (err) {
    console.error('[moveCourt] Error:', err);
    Tennis?.UI?.toast?.(err.message || 'Failed to move court', { type: 'error' });
    return { success: false, error: err.message };
  }
}

export async function clearAllCourtsOp(ctx) {
  const { courts, backend, dataStore, showNotification, confirm, TENNIS_CONFIG } = ctx;

  const confirmMessage =
    'Are you sure you want to clear ALL courts?\n\n' +
    'This will remove:\n' +
    'All current games\n' +
    'All court blocks\n' +
    'All wet court statuses\n\n' +
    'This action cannot be undone!';

  if (await confirm(confirmMessage)) {
    try {
      // Clear all sessions via backend
      const result = await backend.admin.clearAllCourts({
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        reason: 'admin_clear_all',
      });

      if (!result.ok) {
        throw new Error(result.message || 'Failed to clear courts');
      }

      // Also cancel any active blocks
      const activeBlocks = courts.filter((c) => c.block && c.block.id);
      for (const court of activeBlocks) {
        await backend.admin.cancelBlock({
          blockId: court.block.id,
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        });
      }

      // Clear localStorage blocks (for local templates)
      dataStore.set('courtBlocks', [], { immediate: true });

      showNotification(
        `All courts cleared (${result.sessionsEnded || 0} sessions ended)`,
        'success'
      );

      // Realtime subscription will update the UI
    } catch (error) {
      console.error('Error clearing all courts:', error);
      showNotification(error.message || 'Failed to clear courts', 'error');
    }
  }
}
