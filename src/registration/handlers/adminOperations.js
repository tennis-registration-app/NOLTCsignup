/**
 * Admin Operations for Registration
 * Extracted from TennisRegistration for maintainability.
 * Pure handler logic - no React hooks or state.
 */

import { TENNIS_CONFIG } from '@lib';

export async function handleClearWaitlistOp(ctx) {
  const { backend, showAlertMessage, getCourtData } = ctx;
  const data = getCourtData();
  const confirmClear = window.confirm('Clear the waitlist? This will remove all waiting groups.');
  if (confirmClear) {
    let successCount = 0;
    let failCount = 0;

    for (const group of data.waitlist) {
      if (!group.id) {
        failCount++;
        continue;
      }

      const result = await backend.admin.removeFromWaitlist({
        waitlistEntryId: group.id,
        reason: 'admin_clear_all',
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });

      if (result.ok) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount === 0) {
      showAlertMessage(`Waitlist cleared (${successCount} groups removed)`);
    } else if (successCount > 0) {
      showAlertMessage(`Removed ${successCount} groups, ${failCount} failed`);
    } else {
      showAlertMessage('Failed to clear waitlist');
    }
  }
}

export async function handleRemoveFromWaitlistOp(ctx, group) {
  const { backend, showAlertMessage } = ctx;
  if (!group.id) {
    showAlertMessage('Cannot remove: group ID not found');
    return;
  }

  const result = await backend.admin.removeFromWaitlist({
    waitlistEntryId: group.id,
    reason: 'admin_removed',
    deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
  });

  if (result.ok) {
    showAlertMessage('Group removed from waitlist');
  } else {
    showAlertMessage(result.message || 'Failed to remove group');
  }
}
