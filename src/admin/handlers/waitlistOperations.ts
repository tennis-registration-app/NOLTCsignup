/**
 * Waitlist Operations
 * Extracted from AdminPanelV2 for maintainability.
 * These are pure handler logic - no React hooks or state.
 */

import type { TennisBackendShape, DomainWaitlistEntry, CommandResponse } from '../../types/appTypes';

type ResponseWithBoard = CommandResponse & { board?: unknown; error?: string };

interface WaitlistOpCtx {
  waitingGroups: DomainWaitlistEntry[];
  backend: TennisBackendShape;
  showNotification: (message: string, type: string) => void;
  TENNIS_CONFIG?: { DEVICES: { ADMIN_ID: string } };
  applyBoardResponse?: (result: CommandResponse) => void;
  refreshBoard?: () => void;
}

export async function removeFromWaitlistOp(ctx: WaitlistOpCtx, index: number): Promise<void> {
  const { waitingGroups, backend, showNotification, TENNIS_CONFIG = { DEVICES: { ADMIN_ID: '' } } } = ctx;

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
    }) as ResponseWithBoard;

    if (!result.ok) {
      throw new Error(result.message || 'Failed to remove from waitlist');
    }

    showNotification('Group removed from waitlist', 'success');
    if (result.board) {
      ctx.applyBoardResponse?.(result);
    } else {
      ctx.refreshBoard?.();
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error removing from waitlist:', err);
    showNotification(err.message || 'Failed to remove group', 'error');
  }
}

export async function moveInWaitlistOp(ctx: WaitlistOpCtx, from: number, to: number): Promise<void> {
  const { waitingGroups, backend, showNotification } = ctx;

  const entry = waitingGroups[from];
  if (!entry) return;

  // Convert from 0-based index to 1-based position
  const newPosition = to + 1;

  const result = await backend.admin.reorderWaitlist({
    entryId: entry.id,
    newPosition,
  }) as ResponseWithBoard;

  if (result.ok) {
    showNotification('Moved to position ' + String(newPosition), 'success');
    if (result.board) {
      ctx.applyBoardResponse?.(result);
    } else {
      ctx.refreshBoard?.();
    }
  } else {
    showNotification(result.error || 'Failed to reorder waitlist', 'error');
  }
}

/**
 * Clear entire waitlist via backend command.
 * Pure passthrough - no toast, no notification.
 */
export async function clearWaitlistOp(backend: TennisBackendShape): Promise<CommandResponse & { cancelledCount?: number }> {
  const res = await backend.commands.clearWaitlist();
  return res;
}