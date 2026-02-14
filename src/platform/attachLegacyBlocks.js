/**
 * Legacy Blocks Service Adapter
 *
 * Attaches window.Tennis.BlocksService for backward compatibility
 * with non-bundled scripts that depend on the IIFE pattern.
 *
 * Dependencies: attachLegacyStorage (for writeJSON, STORAGE.BLOCKS)
 *               attachLegacyEvents (for emitDom)
 */

import { STORAGE } from '../lib/constants.js';
import { writeJSON } from '../lib/storage.js';
import { emitDom } from './attachLegacyEvents.js';

/**
 * Save blocks to localStorage and emit update events
 * @param {Array} blocks - Array of block objects
 * @returns {Promise<{success: boolean}>} Result object
 */
async function saveBlocks(blocks) {
  const arr = Array.isArray(blocks) ? blocks : [];

  // Persist via writeJSON
  writeJSON(STORAGE.BLOCKS, arr);

  // Emit modern & legacy signals so all listeners wake up
  emitDom('BLOCKS_UPDATED', { key: STORAGE.BLOCKS, blocks: arr });
  emitDom('tennisDataUpdate', { key: STORAGE.BLOCKS, data: arr });

  // Plain Event for DATA_UPDATED (no detail)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('DATA_UPDATED'));
  }

  return { success: true };
}

// Attach to window.Tennis.BlocksService namespace
if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.BlocksService = window.Tennis.BlocksService || {};

  // Only attach if not already defined (idempotent)
  if (typeof window.Tennis.BlocksService.saveBlocks !== 'function') {
    window.Tennis.BlocksService.saveBlocks = saveBlocks;
  }
}

export { saveBlocks };
