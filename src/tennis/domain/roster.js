/**
 * Tennis Roster Domain Module
 *
 * Handles player conflict checking, member ID management, and engagement tracking.
 * Ported from shared/domain/roster.js IIFE.
 */

import { STORAGE } from '../../lib/constants.js';
import { readJSON, writeJSON } from '../../lib/storage.js';
import { logger } from '../../lib/logger.js';

// ============================================================
// IIFE #1 - Core roster conflict checking
// ============================================================

/**
 * Normalize a name for comparison
 * @param {string} n - Name to normalize
 * @returns {string} Normalized name
 */
function normName(n) {
  return (n || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Extract player names from various data shapes
 * @param {Object} entry - Entry with players
 * @returns {string[]} Array of normalized names
 */
function extractNamesAnyShape(entry) {
  if (!entry) return [];
  const players = Array.isArray(entry.players)
    ? entry.players
    : Array.isArray(entry.current?.players)
      ? entry.current.players
      : null;

  if (players) {
    return players
      .map((p) => p && (p.name || p.playerName || p.fullName || p.id || p))
      .filter(Boolean)
      .map(normName);
  }
  const single = entry.name || entry.playerName || entry.current?.name || entry.current?.playerName;
  return single ? [normName(single)] : [];
}

/**
 * Build index of players currently on courts
 * @param {Object} data - Tennis data with courts array
 * @returns {Map} Map of normalized name -> { court: number }
 */
function buildActiveIndex(data) {
  const map = new Map();
  (data?.courts || []).forEach((c, idx) => {
    extractNamesAnyShape(c?.current).forEach((k) => {
      if (!map.has(k)) map.set(k, { court: idx + 1 });
    });
  });
  return map;
}

/**
 * Build index of players on waitlist
 * @param {Object} data - Tennis data with waitingGroups array
 * @returns {Map} Map of normalized name -> { position: number }
 */
function buildWaitlistIndex(data) {
  const map = new Map();
  (data?.waitingGroups || []).forEach((g, i) => {
    extractNamesAnyShape(g).forEach((k) => {
      if (!map.has(k)) map.set(k, { position: i + 1 });
    });
  });
  return map;
}

/**
 * Check for player conflicts in courts and waitlist
 * @param {Object} params - Parameters
 * @param {Object} params.data - Tennis data
 * @param {Array} params.groupPlayers - Players to check
 * @returns {Object} { playing: [], waiting: [] }
 */
function checkGroupConflicts({ data, groupPlayers }) {
  const active = buildActiveIndex(data);
  const queued = buildWaitlistIndex(data);
  const names = (Array.isArray(groupPlayers) ? groupPlayers : [])
    .map((p) => p && (p.name || p.playerName || p.fullName || p.id || p))
    .filter(Boolean)
    .map(normName);
  const uniq = Array.from(new Set(names));

  const playing = [];
  const waiting = [];
  uniq.forEach((k) => {
    if (active.has(k)) playing.push({ key: k, name: k, court: active.get(k).court });
    else if (queued.has(k)) waiting.push({ key: k, name: k, position: queued.get(k).position });
  });

  return { playing, waiting };
}

// ============================================================
// IIFE #2 - Member ID helpers
// ============================================================

/**
 * Normalize a name with NFKC and Unicode handling
 * @param {string} name - Name to normalize
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  return String(name || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s'.-]/gu, '');
}

/**
 * Stable, deterministic hash (small) from a string
 * @param {string} str - String to hash
 * @returns {string} Base36 hash
 */
function hash53(str) {
  let h1 = 0xdeadbeef ^ str.length,
    h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const h = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return h.toString(36);
}

/**
 * Create a key for the ID map from a record
 * @param {Object} rec - Record with name and optional clubNumber
 * @returns {string} Map key
 */
function mapKeyFor(rec) {
  const nm = normalizeName(rec?.name || rec?.fullName || '');
  const club = (rec?.clubNumber ?? rec?.memberNumber ?? '').toString().trim();
  return club ? `${nm}#${club}` : nm;
}

/**
 * Read the member ID map from storage
 * @returns {Object} Member ID map
 */
function readIdMap() {
  const raw = readJSON(STORAGE.MEMBER_ID_MAP) || {};
  return typeof raw === 'object' && raw ? raw : {};
}

/**
 * Write the member ID map to storage
 * @param {Object} map - Member ID map
 */
function writeIdMap(map) {
  writeJSON(STORAGE.MEMBER_ID_MAP, map);
}

/**
 * Ensure roster entries have a memberId; persist mapping only
 * @param {Array} roster - Array of roster entries
 * @returns {Object} { roster, assigned, total }
 */
function ensureMemberIds(roster) {
  const list = Array.isArray(roster) ? roster : [];
  const map = readIdMap();
  let assigned = 0;

  for (const rec of list) {
    if (rec && !rec.memberId) {
      const key = mapKeyFor(rec);
      let id = map[key];
      if (!id) {
        // deterministically derive from key so different tabs converge
        id = `m_${hash53(key)}`;
        map[key] = id;
        assigned++;
      }
      rec.memberId = id; // in-memory enrich; source of truth remains the map
    }
  }
  if (assigned > 0) writeIdMap(map);
  return { roster: list, assigned, total: list.length };
}

/**
 * Resolve a memberId for a player-like object against roster+map
 * @param {Object} player - Player object
 * @param {Array} roster - Roster array
 * @returns {string|null} Member ID or null
 */
function resolveMemberId(player, roster) {
  if (!player) return null;
  if (player.memberId) return player.memberId;

  const nm = normalizeName(player.name || player.fullName || '');
  const club = (player.clubNumber ?? player.memberNumber ?? '').toString().trim();
  const map = readIdMap();
  const key = club ? `${nm}#${club}` : nm;
  if (map[key]) return map[key];

  // try unique match by normalized name (+ clubNumber) in roster
  const list = Array.isArray(roster) ? roster : [];
  const matches = list.filter(
    (r) =>
      normalizeName(r?.name || r?.fullName) === nm &&
      (club ? String(r?.clubNumber ?? r?.memberNumber ?? '') === club : true)
  );
  if (matches.length === 1) {
    const rec = matches[0];
    // backfill via map to persist
    const resolvedKey = mapKeyFor(rec);
    if (!rec.memberId) {
      rec.memberId = `m_${hash53(resolvedKey)}`;
    }
    if (!map[resolvedKey]) {
      map[resolvedKey] = rec.memberId;
      writeIdMap(map);
    }
    return rec.memberId;
  }
  return null; // ambiguous or not found
}

/**
 * Enrich any [{name, memberId?}] with memberId where resolvable
 * @param {Array} players - Array of player objects
 * @param {Array} roster - Roster array
 * @returns {Array} Enriched players array
 */
function enrichPlayersWithIds(players, roster) {
  return (Array.isArray(players) ? players : []).map((p) => {
    if (p?.memberId) return p;
    const id = resolveMemberId(p, roster);
    return id ? { ...p, memberId: id } : p;
  });
}

/**
 * Find engagement for a player (on court or waitlist)
 * @param {Object} player - Player object with name and optional memberId
 * @param {Object} state - Tennis state with courts and waitingGroups
 * @returns {Object|null} { type: 'playing', court } or { type: 'waitlist', position } or null
 */
function findEngagementFor(player, state) {
  const nm = normalizeName(player?.name || '');
  const pid = player?.memberId || null;

  if (typeof window !== 'undefined' && window.DEBUG) {
    logger.debug('findEngagementFor', 'Looking for player', {
      name: player?.name,
      memberId: pid,
      normalized: nm,
    });
  }

  // look on courts
  const courts = Array.isArray(state?.courts) ? state.courts : [];
  for (let i = 0; i < courts.length; i++) {
    const cur = courts[i]?.current;
    const arr = Array.isArray(cur?.players) ? cur.players : [];
    for (const pl of arr) {
      const matchById = pid && pl?.memberId && pl.memberId === pid;
      const matchByName = normalizeName(pl?.name || '') === nm;

      if (typeof window !== 'undefined' && window.DEBUG && (matchById || matchByName)) {
        logger.debug('findEngagementFor', `Found match on court ${i + 1}`, {
          player: pl,
          matchById,
          matchByName,
          playerNorm: normalizeName(pl?.name || ''),
          searchNorm: nm,
        });
      }

      if (matchById || matchByName) {
        return { type: 'playing', court: i + 1 };
      }
    }
  }

  // look on waitlist
  const wl = Array.isArray(state?.waitingGroups) ? state.waitingGroups : [];
  for (let w = 0; w < wl.length; w++) {
    const arr = Array.isArray(wl[w]?.players) ? wl[w].players : [];
    for (const pl of arr) {
      const matchById = pid && pl?.memberId && pl.memberId === pid;
      const matchByName = normalizeName(pl?.name || '') === nm;
      if (matchById || matchByName) {
        return { type: 'waitlist', position: w + 1 };
      }
    }
  }
  return null;
}

// ============================================================
// Exports
// ============================================================

export {
  // IIFE #1 - Core conflict checking
  normName,
  extractNamesAnyShape,
  buildActiveIndex,
  buildWaitlistIndex,
  checkGroupConflicts,
  // IIFE #2 - Member ID helpers
  normalizeName,
  hash53,
  mapKeyFor,
  readIdMap,
  writeIdMap,
  ensureMemberIds,
  resolveMemberId,
  enrichPlayersWithIds,
  findEngagementFor,
};

// Explicit contract aliases
export { normalizeName as normalizeNameString };
export { findEngagementFor as findEngagementForDataStoreShape };

// ============================================================
// Legacy Window Attachment
// ============================================================

if (typeof window !== 'undefined') {
  window.Tennis = window.Tennis || {};
  window.Tennis.Domain = window.Tennis.Domain || {};
  window.Tennis.Domain.roster = {
    checkGroupConflicts,
    _internals: { normName, extractNamesAnyShape, buildActiveIndex, buildWaitlistIndex },
    normalizeName,
    ensureMemberIds,
    resolveMemberId,
    enrichPlayersWithIds,
    findEngagementFor,
  };
}
