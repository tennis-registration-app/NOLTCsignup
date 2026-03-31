// @ts-check
import { normalizeMember } from './normalizeMember';
import { GROUP_TYPES } from '../types/domain';

/**
 * Normalize a group from API response to Domain Group
 * Handles: players/participants/members variations
 *
 * @param {Object} raw - Raw group from API
 * @returns {import('../types/domain.js').Group}
 */
export function normalizeGroup(raw: Record<string, unknown>) {
  if (!raw) {
    console.warn('[normalizeGroup] Received null/undefined group');
    return { id: 'unknown', players: [] as {memberId:string;displayName:string;isGuest:boolean}[], type: 'singles' as const };
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

  const players = Array.isArray(rawPlayers) ? (rawPlayers as Record<string, unknown>[]).map(normalizeMember) : [];

  // Determine group type from player count
  let type: "singles" | "doubles" = "singles"; const rawType = String(raw.type || raw.group_type || raw.groupType || '');
  if (!rawType || !GROUP_TYPES.includes(rawType)) {
    if (players.length <= 3) type = 'singles';
    else type = 'doubles';
  } else {
    type = rawType as "singles" | "doubles";
  }

  return {
    id: String(raw.id || raw.groupId || raw.group_id || 'unknown'),
    players,
    type,
  };
}
