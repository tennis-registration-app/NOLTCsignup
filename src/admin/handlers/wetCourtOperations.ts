/**
 * Wet Court Backend Operations
 * Pure backend calls extracted verbatim from admin/App.jsx handlers.
 * NO state updates, NO Events.emitDom, NO refresh signals.
 */

import type { TennisBackendShape, CommandResponse } from '../../types/appTypes';

interface WetCourtOpCtx {
  backend: TennisBackendShape;
  getDeviceId: () => string;
  courtId?: string;
}

type WetCourtResult = CommandResponse & {
  courtsMarked?: number;
  endsAt?: string;
  courtNumbers?: number[];
  blocksCleared?: number;
  board?: unknown;
};

/**
 * Activate wet courts (mark all courts as wet)
 * Extracted from: handleEmergencyWetCourt
 */
export async function activateWetCourtsOp(ctx: WetCourtOpCtx): Promise<WetCourtResult> {
  const { backend, getDeviceId } = ctx;

  const result = await backend.admin.markWetCourts({
    deviceId: getDeviceId(),
    durationMinutes: 720, // 12 hours
    reason: 'WET COURT',
    idempotencyKey: 'wet-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2),
  });

  return result;
}

/**
 * Clear all wet court blocks
 * Extracted from: removeAllWetCourtBlocks
 */
export async function clearAllWetCourtsOp(ctx: WetCourtOpCtx): Promise<WetCourtResult> {
  const { backend, getDeviceId } = ctx;

  const result = await backend.admin.clearWetCourts({
    deviceId: getDeviceId(),
  });

  return result;
}

/**
 * Clear a single wet court
 * Extracted from: clearWetCourt
 */
export async function clearWetCourtOp(ctx: WetCourtOpCtx): Promise<WetCourtResult> {
  const { backend, getDeviceId, courtId } = ctx;

  const result = await backend.admin.clearWetCourts({
    deviceId: getDeviceId(),
    courtIds: courtId ? [courtId] : undefined,
  });

  return result;
}
