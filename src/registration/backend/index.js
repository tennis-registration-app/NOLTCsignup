/**
 * @fileoverview TennisBackend - Main facade for all backend operations
 *
 * Usage:
 *   import { createBackend, DenialCodes } from './backend';
 *
 *   const backend = createBackend();
 *   const board = await backend.queries.getBoard();
 *   const result = await backend.commands.assignCourt({ ... });
 *   const members = await backend.directory.searchMembers('Smith');
 *
 * IMPORTANT: All UI code must use this interface exclusively.
 * Legacy compatibility is handled internally in TennisCommands/wire.js.
 */

import { ApiAdapter } from '../../lib/ApiAdapter.js';
import { TennisQueries } from './TennisQueries.js';
import { TennisCommands } from './TennisCommands.js';
import { TennisDirectory } from './TennisDirectory.js';
import { AdminCommands } from './admin/AdminCommands.js';
export { DenialCodes } from './types.js';

/**
 * TennisBackend - Main facade for all backend operations
 */
class TennisBackend {
  constructor(apiAdapter) {
    this.queries = new TennisQueries(apiAdapter);
    this.directory = new TennisDirectory(apiAdapter);
    this.commands = new TennisCommands(apiAdapter, this.directory);
    this.admin = new AdminCommands(apiAdapter);
  }
}

let instance = null;

/**
 * Create or get the singleton TennisBackend instance
 * @returns {TennisBackend}
 */
export function createBackend() {
  if (!instance) {
    const adapter = new ApiAdapter();
    instance = new TennisBackend(adapter);
  }
  return instance;
}

/**
 * Reset the backend instance (for testing)
 */
export function resetBackend() {
  instance = null;
}

export default createBackend;
