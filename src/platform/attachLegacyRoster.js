/**
 * Legacy Roster Adapter
 *
 * Imports the roster module which self-attaches to window.Tennis.Domain.roster
 * for backward compatibility with non-bundled scripts.
 *
 * Dependencies: attachLegacyStorage (for STORAGE.MEMBER_ID_MAP, readJSON, writeJSON)
 */

import '../tennis/domain/roster.js';
