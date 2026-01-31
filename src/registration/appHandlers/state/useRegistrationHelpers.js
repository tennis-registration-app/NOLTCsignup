/**
 * useRegistrationHelpers
 * Extracted from useRegistrationAppState — WP5.9.6.6c
 *
 * Owns helper functions used by the registration flow.
 * Verbatim extraction — no logic changes.
 */

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from '../../../lib/domain/engagement.js';

// Debug utilities
const DEBUG = false;

/**
 * Creates helper functions for registration flow
 * @param {Object} deps - Dependencies
 */
export function useRegistrationHelpers({
  // UI state
  data,
  setIsUserTyping,
  // Runtime refs
  successResetTimerRef,
  typingTimeoutRef,
}) {
  // Get court data (synchronous for React renders)
  const getCourtData = () => {
    return data;
  };

  // Clear any pending success reset timer
  const clearSuccessResetTimer = () => {
    if (successResetTimerRef.current) {
      clearTimeout(successResetTimerRef.current);
      successResetTimerRef.current = null;
    }
  };

  // Mark user as typing (for timeout handling)
  const markUserTyping = () => {
    setIsUserTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  };

  // Helper to get courts occupied for clearing
  function getCourtsOccupiedForClearing() {
    const reactData = getCourtData();
    const courts = reactData.courts || [];

    const clearableCourts = courts
      .filter((c) => {
        if (c.session || c.isOccupied) {
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map((c) => c.number)
      .sort((a, b) => a - b);

    return clearableCourts;
  }

  // Duplicate guard helpers
  function __normalizeName(n) {
    return (n?.name ?? n?.fullName ?? n?.playerName ?? n ?? '')
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function guardAddPlayerEarly(getBoardData, player) {
    const memberId = player?.memberId || player?.id;
    const board = getBoardData() || {};

    if (DEBUG) {
      console.log('[guardAddPlayerEarly] Checking player:', player);
      console.log('[guardAddPlayerEarly] memberId:', memberId);
    }

    const engagement = findEngagementByMemberId(board, memberId);

    if (!engagement) return true;

    if (engagement.kind === 'waitlist') {
      const courts = Array.isArray(board?.courts) ? board.courts : [];
      const unoccupiedCount = courts.filter((c) => c.isAvailable).length;
      const overtimeCount = courts.filter((c) => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if (engagement.waitlistPosition <= maxAllowedPosition) {
        return true;
      }
    }

    if (typeof window !== 'undefined' && window.Tennis?.UI?.toast) {
      window.Tennis.UI.toast(getEngagementMessage(engagement));
    }
    return false;
  }

  function guardAgainstGroupDuplicate(player, playersArray) {
    const R = typeof window !== 'undefined' ? window.Tennis?.Domain?.roster : null;
    const nm = R?.normalizeName
      ? R.normalizeName(player?.name || player || '')
      : __normalizeName(player);
    const pid = player?.memberId || null;

    return !playersArray.some((p) => {
      if (pid && p?.memberId) {
        return p.memberId === pid;
      }
      const pName = R?.normalizeName ? R.normalizeName(p?.name || p || '') : __normalizeName(p);
      return pName === nm;
    });
  }

  return {
    getCourtData,
    clearSuccessResetTimer,
    markUserTyping,
    getCourtsOccupiedForClearing,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
  };
}

// --- Robust validation wrapper: always returns { ok, errors[] }
export function validateGroupCompat(players, guests) {
  const W =
    typeof window !== 'undefined'
      ? window.Tennis?.Domain?.waitlist || window.Tennis?.Domain?.Waitlist || null
      : null;
  const norm = (ok, errs) => ({
    ok: !!ok,
    errors: Array.isArray(errs) ? errs : errs ? [errs] : [],
  });

  // 1) Prefer domain-level validator if available
  try {
    if (W && typeof W.validateGroup === 'function') {
      const out = W.validateGroup({ players, guests });
      if (out && (typeof out.ok === 'boolean' || Array.isArray(out.errors))) {
        return norm(out.ok, out.errors);
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    // fall through to local rules
  }

  // 2) Local minimal validator (matches club rules)
  // - At least 1 named player or guest
  // - Guests is a non-negative integer
  // - Total size 1–4 (singles/doubles max 4)

  // Count guests by isGuest flag in players array
  const guestRowCount = Array.isArray(players)
    ? players.filter((p) => p && p.isGuest === true).length
    : 0;

  // Parse the separate guests field
  const gVal = Number.isFinite(guests) ? guests : parseInt(guests || 0, 10);

  // Count non-guest players
  const namedPlayers = Array.isArray(players)
    ? players.filter((p) => p && !p.isGuest && String(p?.name ?? p ?? '').trim())
    : [];
  const namedCount = namedPlayers.length;

  const errs = [];
  if (namedCount < 1 && Math.max(guestRowCount, gVal) < 1) errs.push('Enter at least one player.');
  if (!Number.isFinite(gVal) || gVal < 0) errs.push('Guests must be 0 or more.');

  // Effective guest count is the MAX of the two representations (not the sum),
  // so we never double-count a guest.
  const effectiveGuestCount = Math.max(guestRowCount, Math.max(0, gVal));

  // Final effective size
  const totalSize = namedCount + effectiveGuestCount;

  if (totalSize < 1) errs.push('Group size must be at least 1.');
  if (totalSize > 4) errs.push('Maximum group size is 4.');

  return norm(errs.length === 0, errs);
}
