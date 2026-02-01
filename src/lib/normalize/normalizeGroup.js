// @ts-check
import { normalizeMember } from './normalizeMember.js';
import { GROUP_TYPES } from '../types/domain.js';

/**
 * Normalize a group from API response to Domain Group
 * Handles: players/participants/members variations
 *
 * @param {Object} raw - Raw group from API
 * @returns {import('../types/domain.js').Group}
 */
export function normalizeGroup(raw) {
  if (!raw) {
    console.warn('[normalizeGroup] Received null/undefined group');
    return { id: 'unknown', players: [], type: 'singles' };
  }

  // Handle players array - could be players, participants, or members
  let rawPlayers = raw.players || raw.participants || raw.members || [];

  // Handle JSONB string
  if (typeof rawPlayers === 'string') {
    try {
      rawPlayers = JSON.parse(rawPlayers);
    } catch (e) {
      console.error('[normalizeGroup] Failed to parse players JSON:', e);
      rawPlayers = [];
    }
  }

  const players = Array.isArray(rawPlayers) ? rawPlayers.map(normalizeMember) : [];

  // Determine group type from player count
  let type = raw.type || raw.group_type || raw.groupType;
  if (!type || !GROUP_TYPES.includes(type)) {
    if (players.length <= 1) type = 'singles';
    else if (players.length <= 2) type = 'doubles';
    else type = 'foursome';
  }

  return {
    id: raw.id || raw.groupId || raw.group_id || 'unknown',
    players,
    type,
  };
}
