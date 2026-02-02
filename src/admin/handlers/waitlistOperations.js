/**
 * Waitlist Operations
 * Extracted from AdminPanelV2 for maintainability.
 * These are pure handler logic - no React hooks or state.
 */

export async function removeFromWaitlistOp(ctx, index) {
  const { waitingGroups, backend, showNotification, TENNIS_CONFIG } = ctx;

  const group = waitingGroups[index];
  if (!group || !group.id) {
    showNotification('Cannot remove: group ID not found', 'error');
    return;
  }

  try {
    const result = await backend.admin.removeFromWaitlist({
      waitlistEntryId: group.id,
      reason: 'admin_removed',
      deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
    });

    if (!result.ok) {
      throw new Error(result.message || 'Failed to remove from waitlist');
    }

    showNotification('Group removed from waitlist', 'success');
    // Realtime subscription will update the UI
  } catch (error) {
    console.error('Error removing from waitlist:', error);
    showNotification(error.message || 'Failed to remove group', 'error');
  }
}

export async function moveInWaitlistOp(ctx, from, to) {
  const { waitingGroups, backend, showNotification } = ctx;

  const entry = waitingGroups[from];
  if (!entry) return;

  // Convert from 0-based index to 1-based position
  const newPosition = to + 1;

  const result = await backend.admin.reorderWaitlist({
    entryId: entry.id,
    newPosition,
  });

  if (result.ok) {
    showNotification(`Moved to position ${newPosition}`, 'success');
    // Board will refresh via realtime subscription
  } else {
    showNotification(result.error || 'Failed to reorder waitlist', 'error');
  }
}

/**
 * Clear entire waitlist via backend command.
 * Pure passthrough - no toast, no notification.
 *
 * @param {Object} backend - Backend API client
 * @returns {Promise<Object>} API result
 */
export async function clearWaitlistOp(backend) {
  const res = await backend.commands.clearWaitlist();
  return res;
}
