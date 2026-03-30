/**
 * useRegistrationHelpers
 * Extracted from useRegistrationAppState
 *
 * Owns helper functions used by the registration flow.
 * Verbatim extraction — no logic changes.
 */

// Import Domain engagement helpers
import { findEngagementByMemberId, getEngagementMessage } from "../../../lib/domain/engagement";
import { normalizeName } from "../../../tennis/domain/roster.js";
import { validateGroup as domainValidateGroup } from "../../../tennis/domain/waitlist.js";
import { toast } from "../../../shared/utils/toast.js";
import { logger } from "../../../lib/logger";
import type { MutableRefObject } from "react";
import type { RegistrationUiState, GroupPlayer } from "../../../types/appTypes";

// Debug utilities
const DEBUG = false;

interface UseRegistrationHelpersDeps {
  data: RegistrationUiState["data"];
  setIsUserTyping: (val: boolean) => void;
  successResetTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  typingTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

interface CourtLike {
  session?: unknown;
  isOccupied?: boolean;
  isBlocked?: boolean;
  isAvailable?: boolean;
  isOvertime?: boolean;
  number: number;
}

/**
 * Creates helper functions for registration flow
 */
export function useRegistrationHelpers({
  // UI state
  data,
  setIsUserTyping,
  // Runtime refs
  successResetTimerRef,
  typingTimeoutRef,
}: UseRegistrationHelpersDeps) {
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
    clearTimeout(typingTimeoutRef.current ?? undefined);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 3000);
  };

  // Helper to get courts occupied for clearing
  function getCourtsOccupiedForClearing() {
    const reactData = getCourtData();
    const courts = (reactData.courts || []) as CourtLike[];

    const clearableCourts = courts
      .filter((c) => {
        if (!c) return false; // null-safe: board refresh can produce null entries after a clear
        if (c.session || c.isOccupied) {
          if (c.isBlocked) return false;
          return true;
        }
        return false;
      })
      .map((c) => c.number)
      .sort((a: number, b: number) => a - b);

    return clearableCourts;
  }

  function guardAddPlayerEarly(getBoardData: () => RegistrationUiState["data"], player: GroupPlayer | string) {
    const memberId = (player as GroupPlayer)?.memberId || (player as GroupPlayer)?.id;
    const board = getBoardData() || ({} as RegistrationUiState["data"]);

    if (DEBUG) {
      logger.debug("guardAddPlayerEarly", "Checking player", player);
      logger.debug("guardAddPlayerEarly", "memberId", memberId);
    }

    const engagement = findEngagementByMemberId(board, memberId);

    if (!engagement) return true;

    if (engagement.kind === "waitlist") {
      const courts = Array.isArray((board as { courts?: CourtLike[] })?.courts) ? (board as { courts: CourtLike[] }).courts : [];
      const unoccupiedCount = courts.filter((c) => c.isAvailable).length;
      const overtimeCount = courts.filter((c) => c.isOvertime).length;
      const totalAvailable = unoccupiedCount > 0 ? unoccupiedCount : overtimeCount;
      const maxAllowedPosition = totalAvailable >= 2 ? 2 : 1;

      if ((engagement.waitlistPosition ?? 0) <= maxAllowedPosition) {
        return true;
      }
    }

    if (typeof window !== "undefined") {
      toast(getEngagementMessage(engagement));
    }
    return false;
  }

  function guardAgainstGroupDuplicate(player: GroupPlayer | string, playersArray: (GroupPlayer | string)[]) {
    const nm = normalizeName((player as GroupPlayer)?.name || (player as string) || "");
    const pid = (player as GroupPlayer)?.memberId || null;

    return !playersArray.some((p) => {
      const pPlayer = p as GroupPlayer;
      if (pid && pPlayer?.memberId) {
        return pPlayer.memberId === pid;
      }
      const pName = normalizeName(pPlayer?.name || (p as string) || "");
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
export function validateGroupCompat(players: (GroupPlayer | string | null)[], guests: number | string) {
  const norm = (ok: unknown, errs: unknown) => ({
    ok: !!ok,
    errors: Array.isArray(errs) ? errs : errs ? [errs] : [],
  });

  // 1) Prefer domain-level validator if available
  try {
    if (typeof domainValidateGroup === "function") {
       
      const out = domainValidateGroup({ players, guests } as never) as { ok?: boolean; errors?: string[] };
      if (out && (typeof out.ok === "boolean" || Array.isArray(out.errors))) {
        return norm(out.ok, out.errors);
      }
    }
  } catch {
    // Intentional: error ignored, fall through to local validation rules
  }

  // 2) Local minimal validator (matches club rules)
  // - At least 1 named player or guest
  // - Guests is a non-negative integer
  // - Total size 1-4 (singles/doubles max 4)

  // Count guests by isGuest flag in players array
  const guestRowCount = Array.isArray(players)
    ? players.filter((p) => p && (p as GroupPlayer).isGuest === true).length
    : 0;

  // Parse the separate guests field
  const gVal = Number.isFinite(guests) ? (guests as number) : parseInt((guests as string) || "0", 10);

  // Count non-guest players
  const namedPlayers = Array.isArray(players)
    ? players.filter((p) => p && !(p as GroupPlayer).isGuest && String((p as GroupPlayer)?.name ?? p ?? "").trim())
    : [];
  const namedCount = namedPlayers.length;

  const errs: string[] = [];
  if (namedCount < 1 && Math.max(guestRowCount, gVal) < 1) errs.push("Enter at least one player.");
  if (!Number.isFinite(gVal) || gVal < 0) errs.push("Guests must be 0 or more.");

  // Effective guest count is the MAX of the two representations (not the sum),
  // so we never double-count a guest.
  const effectiveGuestCount = Math.max(guestRowCount, Math.max(0, gVal));

  // Final effective size
  const totalSize = namedCount + effectiveGuestCount;

  if (totalSize < 1) errs.push("Group size must be at least 1.");
  if (totalSize > 4) errs.push("Maximum group size is 4.");

  return norm(errs.length === 0, errs);
}
