/**
 * Apply Blocks Operation
 * Extracted from AdminPanelV2 for maintainability.
 * Pure handler logic - no React hooks or state.
 */

import { logger } from '../../lib/logger';
import type { TennisBackendShape, DomainCourt, TennisConfig, CommandResponse } from '../../types/appTypes';

interface BlockInput {
  title?: string;
  name?: string;
  reason?: string;
  startTime: string;
  endTime: string;
  courts?: number[];
  courtNumber?: number;
  recurrenceGroupId?: string;
}

interface ApplyBlocksCtx {
  courts: DomainCourt[];
  backend: TennisBackendShape;
  showNotification: (message: string, type: string) => void;
  TENNIS_CONFIG: TennisConfig;
  applyBoardResponse?: (result: CommandResponse) => void;
  refreshBoard?: () => void;
}

export async function applyBlocksOp(ctx: ApplyBlocksCtx, blocks: BlockInput[]): Promise<void> {
  const { courts, backend, showNotification, TENNIS_CONFIG } = ctx;

  if (!blocks || !Array.isArray(blocks)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let lastSuccessResult: CommandResponse | null = null;

  for (const block of blocks) {
    const name = block.title || block.name || '';
    const reason = block.reason || '';
    const startTime = new Date(block.startTime);
    const endTime = new Date(block.endTime);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const selectedCourts = Array.isArray(block.courts) ? block.courts : [block.courtNumber as number];

    if (
      !name ||
      !reason ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0 ||
      !Array.isArray(selectedCourts) ||
      selectedCourts.length === 0
    ) {
      showNotification(
        'Please provide name, reason, positive duration, and at least one court.',
        'error'
      );
      failCount++;
      continue;
    }

    const reasonLower = reason.toLowerCase();
    let blockType = 'other';
    if (reasonLower.includes('wet') || reasonLower.includes('rain')) {
      blockType = 'wet';
    } else if (reasonLower.includes('maintenance') || reasonLower.includes('repair')) {
      blockType = 'maintenance';
    } else if (reasonLower.includes('lesson') || reasonLower.includes('class')) {
      blockType = 'lesson';
    } else if (reasonLower.includes('clinic') || reasonLower.includes('camp')) {
      blockType = 'clinic';
    } else if (reasonLower.includes('league') || reasonLower.includes('tournament')) {
      blockType = 'league';
    }

    for (const courtNumber of selectedCourts) {
      const court = courts.find((c) => c.number === courtNumber);
      if (!court) {
        console.error('[Admin] Court ' + String(courtNumber) + ' not found');
        failCount++;
        continue;
      }

      try {
        const createPayload: {
          courtId: string;
          blockType: string;
          title: string;
          startsAt: string;
          endsAt: string;
          deviceId: string;
          deviceType: string;
          recurrenceGroupId?: string;
        } = {
          courtId: court.id,
          blockType: blockType,
          title: name,
          startsAt: block.startTime,
          endsAt: block.endTime,
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
          deviceType: 'admin',
        };
        if (block.recurrenceGroupId) {
          createPayload.recurrenceGroupId = block.recurrenceGroupId;
        }
        const result = await backend.admin.createBlock(createPayload) as CommandResponse & { block?: unknown; board?: unknown };

        if (result.ok) {
          logger.info('Admin', 'Created block via API', result.block);
          successCount++;
          lastSuccessResult = result;
        } else {
          logger.error('Admin', 'Failed to create block', result.message);
          failCount++;
        }
      } catch (error) {
        logger.error('Admin', 'Error creating block', error);
        failCount++;
      }
    }
  }

  if (failCount > 0) {
    showNotification(
      'Applied ' + String(successCount) + ' block(s), ' + String(failCount) + ' failed',
      failCount === 0 ? 'success' : 'warning'
    );
  } else {
    showNotification('Applied ' + String(successCount) + ' block(s) successfully', 'success');
  }

  // Use board from last successful response if available, otherwise fall back to refresh
  type WithBoard = CommandResponse & { block?: unknown; board?: unknown };
  if (successCount > 0 && (lastSuccessResult as WithBoard)?.board) {
    ctx.applyBoardResponse?.(lastSuccessResult!);
  } else if (successCount > 0) {
    ctx.refreshBoard?.();
  }
}
