/**
 * Board Data Access Layer
 *
 * This is the ONLY module that should fetch board data.
 * Components must use getBoard() or subscribeToBoardChanges(), never raw API.
 *
 * Data flow:
 * 1. Fetch raw API response
 * 2. Validate API envelope
 * 3. Normalize to Domain
 * 4. Validate Domain
 * 5. Return validated Domain Board
 */

import { normalizeBoard } from '../normalize/index.js';
import { validateBoardResponse } from '../schemas/apiEnvelope.js';
import { validateBoard } from '../schemas/domain.js';
import { logger } from '../logger.js';

// Use existing ApiAdapter for actual HTTP calls
// This will be imported by the consuming code that sets it up
let apiAdapter = null;

/**
 * Set the API adapter instance
 * @param {Object} adapter - ApiAdapter instance
 */
export function setApiAdapter(adapter) {
  apiAdapter = adapter;
}

/**
 * Fetch and normalize board data
 * @returns {Promise<import('../types/domain.js').Board>}
 */
export async function getBoard() {
  if (!apiAdapter) {
    throw new Error('[boardApi] ApiAdapter not configured. Call setApiAdapter() first.');
  }

  logger.debug('BoardApi', 'Fetching board data');

  // 1. Fetch raw API response
  const raw = await apiAdapter.get('/get-board');

  // 2. Validate API envelope
  const envelopeResult = validateBoardResponse(raw);
  if (!envelopeResult.success) {
    logger.error('BoardApi', 'Invalid API envelope', envelopeResult.error);
    // Continue with raw data — normalization may still work
  }

  // 3. Normalize to Domain
  const board = normalizeBoard(raw);

  // 4. Validate Domain (log errors but don't throw — helps identify issues)
  const domainResult = validateBoard(board);
  if (!domainResult.success) {
    logger.warn('BoardApi', 'Domain validation issues (normalization bug?)', domainResult.error);
  }

  logger.debug('BoardApi', 'Board fetched', {
    courts: board.courts.length,
    waitlist: board.waitlist.length,
  });

  return board;
}

/**
 * Transform raw board update to Domain
 * Used by subscription callbacks
 * @param {Object} raw - Raw board data from subscription
 * @returns {import('../types/domain.js').Board}
 */
export function transformBoardUpdate(raw) {
  // Validate envelope
  const envelopeResult = validateBoardResponse(raw);
  if (!envelopeResult.success) {
    logger.warn('BoardApi', 'Invalid subscription envelope', envelopeResult.error);
  }

  // Normalize
  const board = normalizeBoard(raw);

  // Validate domain
  const domainResult = validateBoard(board);
  if (!domainResult.success) {
    logger.warn('BoardApi', 'Subscription domain validation issues', domainResult.error);
  }

  return board;
}
