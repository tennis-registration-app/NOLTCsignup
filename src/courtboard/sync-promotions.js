// Sync Waitlist Promotions for CourtBoard
(function () {
  const Avail = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;
  const U = window.APP_UTILS;

  /**
   * Get Courtboard state from React (via window bridge).
   * Uses the centralized accessor - NO localStorage reads for tennis state.
   */
  function getCourtboardState() {
    return window.CourtboardState ?? { courts: [], courtBlocks: [], waitingGroups: [] };
  }

  function computeFreeCourts({ data, now, blocks }) {
    try {
      if (Avail?.getFreeCourtsInfo) {
        const info = Avail.getFreeCourtsInfo({ data, now, blocks });
        if (info && Array.isArray(info.free)) return info.free;
      }
    } catch {
      // Intentionally ignored (Phase 3.5 lint): domain helper optional, fallback below
    }
    const free = [];
    const activeBlocks = (Array.isArray(blocks) ? blocks : []).filter((b) => {
      return new Date(b.startTime) <= now && now < new Date(b.endTime);
    });
    const courts = data?.courts || [];
    const n = courts.length || 12;
    for (let i = 1; i <= n; i++) {
      const c = courts[i - 1];
      // Check for occupation using Domain format: court.session indicates active session
      const occ = !!(c && (c.isOccupied || c.session));
      const blk = activeBlocks.some((b) => b.courtNumber === i);
      if (!occ && !blk) free.push(i);
    }
    return free;
  }

  function syncWaitlistPromotions() {
    try {
      const now = new Date();
      // Use React state via getCourtboardState() - no localStorage for tennis state
      const state = getCourtboardState();
      const courts = state.courts || [];
      const blocks = state.courtBlocks || [];
      const waitingGroups = state.waitingGroups || [];

      // Build data object for computeFreeCourts
      const data = { courts: courts, waitingGroups: waitingGroups };
      const free = computeFreeCourts({ data, now, blocks });

      const waiting = waitingGroups;
      const k = Math.max(0, Math.min(free.length, waiting.length));
      const up = waiting.slice(0, k);

      const TTL_MIN = 4;
      const expiresAt = new Date(now.getTime() + TTL_MIN * 60 * 1000).toISOString();
      const desired = up.map((g, idx) => {
        const sig = U.waitlistSignature(g);
        const cn = free[idx] ? [free[idx]] : [];
        return {
          id: `${sig}-${Date.now()}`,
          groupSig: sig,
          courtNumbers: cn,
          promotedAt: now.toISOString(),
          expiresAt,
          version: 1,
        };
      });

      const prev = Array.isArray(data.waitlistPromotions) ? data.waitlistPromotions : [];
      const live = prev.filter((p) => new Date(p.expiresAt) > now);
      const bySig = new Map(live.map((p) => [p.groupSig, p]));
      desired.forEach((d) => {
        const e = bySig.get(d.groupSig);
        if (e) {
          e.courtNumbers = d.courtNumbers;
          e.expiresAt = d.expiresAt;
        } else {
          bySig.set(d.groupSig, d);
        }
      });
      const nextPromos = Array.from(bySig.values());

      const same =
        nextPromos.length === prev.length &&
        nextPromos.every(
          (p, i) =>
            prev[i] &&
            prev[i].groupSig === p.groupSig &&
            String(prev[i].courtNumbers) === String(p.courtNumbers)
        );
      if (same) return;

      // Promotions are now computed by backend
      // and read from React state via getCourtboardState(). Events still dispatched
      // for cross-component coordination.
      window.dispatchEvent(new Event('tennisDataUpdate'));
      window.dispatchEvent(new Event('DATA_UPDATED'));
    } catch (e) {
      console.warn('[Board promotions] sync error:', e);
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => setTimeout(syncWaitlistPromotions, 0), {
      once: true,
    });
  else setTimeout(syncWaitlistPromotions, 0);

  window.addEventListener('tennisDataUpdate', () => setTimeout(syncWaitlistPromotions, 0), {
    passive: true,
  });
  window.addEventListener('DATA_UPDATED', () => setTimeout(syncWaitlistPromotions, 0), {
    passive: true,
  });
  window.addEventListener(
    'storage',
    (e) => {
      if (e.key === (Storage?.STORAGE?.DATA || 'tennisClubData'))
        setTimeout(syncWaitlistPromotions, 0);
    },
    { passive: true }
  );
})();
