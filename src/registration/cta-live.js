/**
 * CTA Live Recompute - Waitlist Court Available Buttons
 *
 * Emits 'cta:state' events consumed by React to show "Court Available" CTAs
 * when waitlist groups can claim available courts.
 */
(function(){
  function emitCtaState(detail){
    try { window.dispatchEvent(new CustomEvent('cta:state', { detail })); } catch {}
  }

  /**
   * Compute courts that are SELECTABLE right now.
   * SELECTABLE = not blocked (and not wet) AND (unoccupied OR occupied in overtime).
   * Notes:
   * - We use a single rounded 'now' to avoid flicker.
   * - We treat "wet" blocks as non-selectable.
   * - We accept multiple possible end fields on current session.
   */
  function computeSelectableCourtsNow(dataNow, blocksNow) {
    const Av = window.Tennis?.Domain?.availability || window.Tennis?.Domain?.Availability;

    // Rounded 'now' to avoid micro-flips
    const now = new Date(); now.setMilliseconds(0);

    // Prefer a domain helper if available
    try {
      if (Av?.getSelectableCourtsStrict) {
        const out = Av.getSelectableCourtsStrict({ data: dataNow, now, blocks: blocksNow });
        if (Array.isArray(out)) return out;
        if (out && Array.isArray(out.courts)) return out.courts;
      }
    } catch {}

    // Normalize blocks active "right now"
    const blocks = Array.isArray(blocksNow) ? blocksNow : [];
    const activeBlocks = blocks.filter(b => {
      try { return new Date(b.startTime) <= now && now < new Date(b.endTime); }
      catch { return false; }
    });

    const isWet     = (n) => activeBlocks.some(b => !!b?.isWetCourt && Number(b.courtNumber) === n);
    const isBlocked = (n) => activeBlocks.some(b => !b?.isWetCourt && Number(b.courtNumber) === n);

    // Overtime: current session exists AND its end/expectedEnd/until/endsAt is in the past
    const isOvertime = (court) => {
      try {
        const cur = court?.current;
        if (!cur) return false;
        const t = cur.endTime || cur.expectedEnd || cur.until || cur.endsAt;
        return !!t && (new Date(t) < now);
      } catch { return false; }
    };

    const total = Array.isArray(dataNow?.courts) ? dataNow.courts.length : (window.Tennis?.Config?.COURTS?.COUNT || 12);
    const selectable = [];
    for (let i = 1; i <= total; i++) {
      const c = dataNow?.courts?.[i-1] || null;
      const occupied = !!(c && c.current);
      const overtime = occupied && isOvertime(c);
      // Selectable if NOT wet/blocked and (unoccupied OR overtime)
      if (!isWet(i) && !isBlocked(i) && (!occupied || overtime)) {
        selectable.push(i);
      }
    }
    return selectable;
  }

  window.recomputeCtaLive = function recomputeCtaLive(){
    let free = [];
    let first = null, second = null;
    try {
      const Storage   = window.Tennis?.Storage || window.APP_UTILS;
      const DATA_KEY  = (Storage?.STORAGE?.DATA)   || 'tennisClubData';
      const BLOCK_KEY = (Storage?.STORAGE?.BLOCKS) || 'courtBlocks';

      const dataNow   = Storage?.readDataSafe
        ? Storage.readDataSafe()
        : JSON.parse(localStorage.getItem(DATA_KEY) || 'null');

      const blocksNow = JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]');

      const waitlist  = Array.isArray(dataNow?.waitingGroups) ? dataNow.waitingGroups : [];
      first  = waitlist[0] || null;
      second = waitlist[1] || null;

      // Build lists
      const selectable = computeSelectableCourtsNow(dataNow, blocksNow);

      // Derive "emptyOnly" (unblocked & unoccupied) from selectable
      const emptyOnly = selectable.filter(i => {
        const c = dataNow?.courts?.[i-1] || null;
        return !(c && c.current); // strictly unoccupied
      });

      // Priority rule: if any empty courts exist, only their count gates the CTAs.
      // Otherwise, fall back to the full selectable list (overtime included).
      const gateList = emptyOnly.length > 0 ? emptyOnly : selectable;
      const gateCount = gateList.length;

      const live1 = (gateCount >= 1) && !!first;
      const live2 = (gateCount >= 2) && !!second;

      // Keep the event shape stable: reuse 'freeCourts' key but now it means "selectable"
      emitCtaState({
        freeCourts: selectable,   // SELECTABLE courts (includes overtime)
        liveFirst:  !!live1,
        liveSecond: !!live2,
        firstGroup: first,
        secondGroup: second
      });
    } catch {
      emitCtaState({
        freeCourts: [],
        liveFirst:  false,
        liveSecond: false,
        firstGroup: null,
        secondGroup: null
      });
    }
  };

  // Initial run
  try { window.recomputeCtaLive(); } catch {}

  // Event sources + heartbeat
  (function attachCtaListeners(){
    const onUpdate = () => { try { window.recomputeCtaLive(); } catch {} };

    window.addEventListener('tennisDataUpdate', onUpdate, { passive: true });
    window.addEventListener('DATA_UPDATED',      onUpdate, { passive: true });
    window.addEventListener('visibilitychange',  () => { if (!document.hidden) onUpdate(); }, { passive: true });
    window.addEventListener('focus',             onUpdate, { passive: true });

    // Only react to relevant storage changes
    window.addEventListener('storage', (e) => {
      if (!e) return;
      const S = window.Tennis?.Storage || window.APP_UTILS;
      const DATA_KEY  = (S?.STORAGE?.DATA)   || 'tennisClubData';
      const BLOCK_KEY = (S?.STORAGE?.BLOCKS) || 'courtBlocks';
      if (e.key === DATA_KEY || e.key === BLOCK_KEY) onUpdate();
    }, { passive: true });

    try { window.__ctaLiveTimer && clearInterval(window.__ctaLiveTimer); } catch {}
    window.__ctaLiveTimer = setInterval(onUpdate, 2000);
    window.addEventListener('beforeunload', () => { try { clearInterval(window.__ctaLiveTimer); } catch {} }, { once: true });
  })();
})();
