/**
 * Court Operations
 * Extracted from AdminPanelV2 for maintainability.
 * These are pure handler logic - no React hooks or state.
 */

import type { TennisBackendShape, DomainCourt, DataStoreShape, TennisConfig, CommandResponse } from '../../types/appTypes';

interface CourtOpCtx {
  courts?: DomainCourt[];
  backend: TennisBackendShape;
  showNotification: (message: string, type: string) => void;
  TENNIS_CONFIG?: TennisConfig;
  applyBoardResponse?: (result: CommandResponse) => void;
  refreshBoard?: () => void;
  dataStore?: DataStoreShape;
  confirm?: (message: string) => Promise<boolean>;
}

type ClearCourtResult = { success: boolean; error?: string };

export async function clearCourtOp(ctx: CourtOpCtx, courtNumber: number): Promise<ClearCourtResult> {
  const { courts = [], backend, showNotification, TENNIS_CONFIG = { DEVICES: { ADMIN_ID: "" } } as TennisConfig } = ctx;

  try {
    const court = courts.find((c) => c.number === courtNumber);
    if (!court) {
      throw new Error('Court ' + String(courtNumber) + ' not found');
    }

    let cleared = false;
    let failed = false;
    let lastResult: CommandResponse | null = null;

    if (court.block && court.block.id) {
      const blockResult = await backend.admin.cancelBlock({
        blockId: court.block.id,
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });
      if (blockResult.ok) {
        showNotification('Court ' + String(courtNumber) + ' unblocked', 'success');
        cleared = true;
        lastResult = blockResult;
      } else {
        showNotification(blockResult.message || 'Failed to unblock court ' + String(courtNumber), 'error');
        failed = true;
      }
    }

    if (court.session) {
      const sessionResult = await backend.admin.adminEndSession({
        courtId: court.id,
        reason: 'admin_force_end',
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
      });
      if (sessionResult.ok) {
        showNotification('Court ' + String(courtNumber) + ' cleared', 'success');
        cleared = true;
        lastResult = sessionResult;
      } else {
        showNotification(sessionResult.message || 'Failed to clear court ' + String(courtNumber), 'error');
        failed = true;
      }
    }

    if (!cleared) {
      showNotification('Court ' + String(courtNumber) + ' is already empty', 'info');
    }

    type WithBoard = CommandResponse & { board?: unknown };
    if (cleared && (lastResult as WithBoard)?.board) {
      ctx.applyBoardResponse?.(lastResult!);
    } else if (cleared) {
      ctx.refreshBoard?.();
    }

    return { success: cleared && !failed };
  } catch (error) {
    const err = error as Error;
    console.error('Error clearing court:', err);
    showNotification(err.message || 'Failed to clear court', 'error');
    return { success: false, error: err.message };
  }
}

type MoveCourtResult = { success: boolean; from?: number; to?: number; error?: string };

export async function moveCourtOp(ctx: CourtOpCtx, from: number | string, to: number | string): Promise<MoveCourtResult> {
  const { backend, showNotification } = ctx;

  const f = Number(from);
  const t = Number(to);

  try {
    const board = await backend.queries.getBoard();
    const fromCourt = board?.courts?.find((c) => c.number === f);
    const toCourt = board?.courts?.find((c) => c.number === t);

    if (!fromCourt?.id) {
      showNotification('Court ' + String(f) + ' not found', 'error');
      return { success: false, error: 'Source court not found' };
    }

    if (!toCourt?.id) {
      showNotification('Court ' + String(t) + ' not found', 'error');
      return { success: false, error: 'Destination court not found' };
    }

    const res = await backend.commands.moveCourt({
      fromCourtId: fromCourt.id,
      toCourtId: toCourt.id,
    });

    if (!res?.ok) {
      showNotification(res?.message || 'Failed to move court', 'error');
      return { success: false, error: res?.message };
    }

    showNotification('Moved from Court ' + String(f) + ' to Court ' + String(t), 'success');
    // Use board from response if available, otherwise fall back to refresh
    type MovWithBoard = CommandResponse & { board?: unknown };
    if ((res as MovWithBoard).board) {
      ctx.applyBoardResponse?.(res);
    } else {
      ctx.refreshBoard?.();
    }

    return { success: true, from: f, to: t };
  } catch (err) {
    const e = err as Error;
    console.error('[moveCourt] Error:', e);
    showNotification(e.message || 'Failed to move court', 'error');
    return { success: false, error: e.message };
  }
}

export async function clearAllCourtsOp(ctx: CourtOpCtx): Promise<void> {
  const { courts = [], backend, dataStore, showNotification, confirm, TENNIS_CONFIG = { DEVICES: { ADMIN_ID: "" } } as TennisConfig } = ctx;

  const confirmMessage = ["Are you sure you want to clear ALL courts?", "", "This will remove:", "All current games", "All court blocks", "All wet court statuses", "", "This action cannot be undone!"].join("\n");

  if (await confirm?.(confirmMessage)) {
    try {
      const result = (await backend.admin.clearAllCourts({
        deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        reason: 'admin_clear_all',
      })) as CommandResponse & { sessionsEnded?: number };

      if (!result.ok) {
        throw new Error(result.message || 'Failed to clear courts');
      }

      let lastBlockResult: CommandResponse | null = null;
      const activeBlocks = courts.filter((c) => c.block && c.block.id);
      for (const court of activeBlocks) {
        lastBlockResult = await backend.admin.cancelBlock({
          blockId: court.block!.id,
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
        });
      }

      dataStore?.set('courtBlocks', [], { immediate: true });

      showNotification(
        'All courts cleared (' + String(result.sessionsEnded || 0) + ' sessions ended)',
        'success'
      );

      // Use board from last response if available, otherwise fall back to refresh
      type WithBoard = CommandResponse & { board?: unknown; sessionsEnded?: number };
      const boardSource: WithBoard = (lastBlockResult as WithBoard)?.board ? (lastBlockResult as WithBoard) : (result as WithBoard);
      if ((boardSource as WithBoard).board) {
        ctx.applyBoardResponse?.(boardSource);
      } else {
        ctx.refreshBoard?.();
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error clearing all courts:', err);
      showNotification(err.message || 'Failed to clear courts', 'error');
    }
  }
}
