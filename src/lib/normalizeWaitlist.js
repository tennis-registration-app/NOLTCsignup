/**
 * @deprecated Use src/lib/normalize/normalizeBoard.js instead.
 * This file is kept for backwards compatibility only.
 *
 * Normalize waitlist entries from API to consistent internal shape.
 * Handles variations in field names and JSONB string parsing.
 *
 * @param {Array} waitlist - Raw waitlist from API
 * @returns {Array} Normalized waitlist entries
 */
export function normalizeWaitlist(waitlist) {
  if (!waitlist || !Array.isArray(waitlist)) return [];

  return waitlist.map((entry, idx) => {
    // Handle participants - might be string (JSONB) or array
    let participants =
      entry?.participants || entry?.players || entry?.members || entry?.group?.players || [];

    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        console.error('[normalizeWaitlist] Failed to parse participants:', e);
        participants = [];
      }
    }

    // Ensure participants is an array
    if (!Array.isArray(participants)) {
      participants = [];
    }

    // Extract names with fallback chain
    const names = participants.map(
      (p) => p?.displayName || p?.display_name || p?.name || p?.member_name || 'Unknown'
    );

    // Extract player objects for CTA usage
    const players = participants.map((p, i) => ({
      id: `wl-${entry?.id || idx}-${i}`,
      name: p?.displayName || p?.display_name || p?.name || p?.member_name || 'Unknown',
      memberId: p?.memberId || p?.member_id || p?.id,
      memberNumber:
        p?.memberId || p?.member_id || p?.member_number || String(entry?.position || idx),
      isGuest: p?.isGuest || p?.is_guest || false,
    }));

    return {
      id: entry?.id || `wg_${idx}`,
      position: entry?.position,
      groupType: entry?.group_type || entry?.groupType,
      joinedAt: entry?.joined_at || entry?.joinedAt,
      minutesWaiting: entry?.minutes_waiting || entry?.minutesWaiting,
      names,
      players,
      raw: entry, // Keep raw for debugging
    };
  });
}

export default normalizeWaitlist;
