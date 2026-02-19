/**
 * Admin Operations for Registration
 * Extracted from TennisRegistration for maintainability.
 * Pure handler logic - no React hooks or state.
 */

import { TENNIS_CONFIG } from '@lib';
import { logger } from '../../lib/logger.js';

export async function handleClearWaitlistOp(ctx) {
  const { backend, showAlertMessage, getCourtData, confirm: confirmFn = globalThis.confirm } = ctx;
  const data = getCourtData();
  const confirmClear = confirmFn('Clear the waitlist? This will remove all waiting groups.');
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

export async function handleCancelBlockOp(ctx, blockId, courtNum) {
  const { backend, showAlertMessage } = ctx;
  const result = await backend.admin.cancelBlock({
    blockId: blockId,
    deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
  });
  if (result.ok) {
    showAlertMessage(`Court ${courtNum} unblocked`);
  } else {
    showAlertMessage(result.message || 'Failed to unblock court');
  }
}

export async function handleAdminClearCourtOp(ctx, courtNum) {
  const { clearCourt, showAlertMessage } = ctx;
  await clearCourt(courtNum);
  showAlertMessage(`Court ${courtNum} cleared`);
}

export async function handleClearAllCourtsOp(ctx) {
  const { backend, showAlertMessage, confirm: confirmFn = globalThis.confirm } = ctx;
  const confirmClear = confirmFn(
    'Clear all courts? This will make all courts immediately available.'
  );
  if (confirmClear) {
    const result = await backend.admin.clearAllCourts({
      deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      reason: 'admin_clear_all',
    });
    if (result.ok) {
      showAlertMessage(
        `All courts cleared successfully (${result.sessionsEnded || 0} sessions ended)`
      );
    } else {
      showAlertMessage(result.message || 'Failed to clear courts');
    }
  }
}

export async function handleReorderWaitlistOp(ctx, fromIndex, toIndex) {
  const { getCourtData, showAlertMessage, setWaitlistMoveFrom } = ctx;
  const data = getCourtData();
  const movedGroup = data.waitlist[fromIndex];
  const entryId = movedGroup?.id || movedGroup?.group?.id;

  if (entryId && window.Tennis?.Commands?.reorderWaitlist) {
    try {
      await window.Tennis.Commands.reorderWaitlist({
        entryId,
        newPosition: toIndex,
      });
      showAlertMessage(`Group moved to position ${toIndex + 1}`);
    } catch (err) {
      showAlertMessage(err.message || 'Failed to move group');
    }
  } else {
    console.warn('[Waitlist Reorder] API not available, action skipped');
    showAlertMessage('Waitlist reorder requires API — feature temporarily unavailable');
  }

  setWaitlistMoveFrom(null);
}

export async function handleMoveCourtOp(ctx, fromCourtNum, toCourtNum) {
  const { backend, getCourtData, showAlertMessage, setCourtToMove } = ctx;
  try {
    const data = getCourtData();
    const fromCourt = data.courts[fromCourtNum - 1];
    const toCourt = data.courts[toCourtNum - 1];

    if (!fromCourt?.id) {
      showAlertMessage('Source court not found');
      setCourtToMove(null);
      return;
    }

    // For empty courts, get ID from API board
    let toCourtId = toCourt?.id;
    if (!toCourtId) {
      const board = await backend.queries.getBoard();
      const targetCourt = board?.courts?.find((c) => c.number === toCourtNum);
      toCourtId = targetCourt?.id;
    }

    if (!toCourtId) {
      showAlertMessage('Destination court not found');
      setCourtToMove(null);
      return;
    }

    const result = await backend.commands.moveCourt({
      fromCourtId: fromCourt.id,
      toCourtId: toCourtId,
    });

    if (result.ok) {
      showAlertMessage(`Court ${fromCourtNum} moved to Court ${toCourtNum}`);
    } else {
      showAlertMessage(result.message || 'Failed to move court');
    }
  } catch (err) {
    console.error('[moveCourt] Error:', err);
    showAlertMessage(err.message || 'Failed to move court');
  }

  setCourtToMove(null);
}

export async function handleBlockCreateOp(ctx) {
  const {
    backend,
    getCourtData,
    showAlertMessage,
    setBlockingInProgress,
    selectedCourtsToBlock,
    blockMessage,
    blockStartTime,
    blockEndTime,
  } = ctx;

  if (selectedCourtsToBlock.length === 0) {
    showAlertMessage('Please select at least one court to block');
    return;
  }
  if (!blockMessage) {
    showAlertMessage('Please enter a block reason');
    return;
  }
  if (!blockEndTime) {
    showAlertMessage('Please select an end time');
    return;
  }

  setBlockingInProgress(true);

  const boardData = getCourtData();
  const currentTimeNow = new Date();

  // Calculate start time
  let startTime;
  if (blockStartTime === 'now') {
    startTime = new Date();
  } else {
    startTime = new Date();
    const [hours, minutes] = blockStartTime.split(':');
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  // Calculate end time based on the selected time
  const [endHours, endMinutes] = blockEndTime.split(':');
  let endTime = new Date(startTime);
  endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

  // If end time is before start time, assume next day
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  logger.debug('Admin', 'Block times calculated', {
    blockStartTimeInput: blockStartTime,
    currentTime: currentTimeNow.toLocaleString(),
    startTime: startTime.toLocaleString(),
    endTime: endTime.toLocaleString(),
  });

  // Map block message to block type
  const blockTypeMap = {
    'WET COURT': 'wet',
    'COURT WORK': 'maintenance',
    LESSON: 'lesson',
  };
  const blockType = blockTypeMap[blockMessage.toUpperCase()] || 'other';

  // Block selected courts via backend API
  let successCount = 0;
  let failedCourts = [];

  for (const courtNum of selectedCourtsToBlock) {
    const court = boardData.courts[courtNum - 1];
    if (!court || !court.id) {
      failedCourts.push(courtNum);
      continue;
    }

    const result = await backend.admin.createBlock({
      courtId: court.id,
      blockType: blockType,
      title: blockMessage,
      startsAt: startTime.toISOString(),
      endsAt: endTime.toISOString(),
      deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
    });

    if (result.ok) {
      successCount++;
    } else {
      failedCourts.push(courtNum);
      console.error(`Failed to block court ${courtNum}:`, result.message);
    }
  }

  if (failedCourts.length === 0) {
    showAlertMessage(`${successCount} court(s) blocked successfully`);
  } else if (successCount > 0) {
    showAlertMessage(`${successCount} court(s) blocked. Failed: courts ${failedCourts.join(', ')}`);
  } else {
    showAlertMessage(`Failed to block courts: ${failedCourts.join(', ')}`);
  }
}
