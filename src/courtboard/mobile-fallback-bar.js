// @ts-nocheck — plain script loaded via <script> tag; cannot use ESM or type annotations
/* eslint-disable no-console -- IIFE loaded via <script> tag; cannot import logger */
// Plain-JS fallback bar (emergency restoration)
(function mountFallbackBar() {
  if (!window.IS_MOBILE_VIEW) return;

  const el = document.getElementById('mobile-bottom-bar-fallback');
  if (!el) return;

  // Style & show
  el.hidden = false;
  el.setAttribute('role', 'toolbar');
  el.className = 'mbb-fallback';

  /**
   * Single source of truth accessor for Courtboard state.
   * All reads in mobile-fallback-bar should use this, NOT localStorage.
   * The state is written by main.jsx useEffect and synced on every React render.
   */
  function getCourtboardState() {
    return window.CourtboardState ?? { courts: [], courtBlocks: [], waitingGroups: [] };
  }

  function selectReservedSafe(blocks, now) {
    try {
      // Use the same logic as selectReservedItemsFromBlocks
      function normalizeBlock(block) {
        if (!block) return null;
        const start = new Date(block.startTime || block.start);
        const end = new Date(block.endTime || block.end);
        const courts = Array.isArray(block.courts)
          ? block.courts
          : [block.courtNumber].filter(Boolean);
        const reason = block.reason || block.templateName || 'Reserved';
        if (!start || !end || courts.length === 0) return null;
        return { courts, start, end, reason };
      }

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const normalized = (blocks || []).map(normalizeBlock).filter(Boolean);
      const todayFuture = normalized
        .filter((b) => b.end > now && b.start <= endOfToday)
        .map((b) => ({ ...b, end: b.end > endOfToday ? endOfToday : b.end }))
        .sort((a, b) => a.start - b.start);

      const byKey = new Map();
      for (const b of todayFuture) {
        const k = `${b.reason}|${b.start.toISOString()}|${b.end.toISOString()}`;
        if (!byKey.has(k)) byKey.set(k, { ...b, courts: new Set(b.courts) });
        else b.courts.forEach((c) => byKey.get(k).courts.add(c));
      }

      return Array.from(byKey.values()).map((v) => ({
        key: `${v.reason}|${v.start.getTime()}|${v.end.getTime()}`,
        courts: Array.from(v.courts).sort((a, b) => a - b),
        start: v.start,
        end: v.end,
        reason: v.reason,
      }));
    } catch (e) {
      console.warn('Error in selectReservedSafe:', e);
      return [];
    }
  }

  function readWaitlistSafe() {
    // Use React state via getCourtboardState() - no localStorage fallback
    return getCourtboardState().waitingGroups || [];
  }

  // Queue mechanism for modal opening
  let modalQueue = [];
  let queueTimer = null;

  function openModal(type, payload) {
    if (window.MobileModal) {
      window.MobileModal.open(type, payload);
    } else {
      modalQueue.push({ type, payload });
      if (!queueTimer) {
        queueTimer = setInterval(() => {
          if (window.MobileModal) {
            clearInterval(queueTimer);
            queueTimer = null;
            modalQueue.forEach(({ type, payload }) => {
              window.MobileModal.open(type, payload);
            });
            modalQueue = [];
          }
        }, 100);
      }
    }
  }

  // Click delegation (no React required)
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    console.debug('[Fallback] Button clicked:', action);

    if (action === 'conditions') {
      openModal('court-conditions');
      return;
    }

    if (action === 'roster') {
      openModal('roster');
      return;
    }

    if (action === 'reserved') {
      try {
        console.log('[Mobile Reserved] ENTER - about to call getCourtboardState');
        const state = getCourtboardState();
        console.log('[Mobile Reserved] state:', state);
        console.log('[Mobile Reserved] window.CourtboardState:', window.CourtboardState);
        console.log('[Mobile Reserved] courtBlocks:', state.courtBlocks);
        console.log('[Mobile Reserved] upcomingBlocks:', state.upcomingBlocks);
        const allBlocks = [...(state.courtBlocks || []), ...(state.upcomingBlocks || [])].filter(
          (b) => !b.isWetCourt
        );
        console.log('[Mobile Reserved] allBlocks after filter:', allBlocks);
        const reservedData = selectReservedSafe(allBlocks, new Date());
        console.log('[Mobile Reserved] reservedData:', reservedData);
        openModal('reserved', { reservedData });
      } catch (err) {
        console.error('[Mobile Reserved] ERROR:', err);
      }
      return;
    }

    if (action === 'waitlist') {
      // Include courts data from React state for consistent calculations
      const state = getCourtboardState();
      const waitlistData = readWaitlistSafe();
      console.log('[Mobile Waitlist] state:', state);
      console.log('[Mobile Waitlist] waitlistData:', waitlistData);
      openModal('waitlist', {
        waitlistData,
        courts: state.courts || [],
        courtBlocks: state.courtBlocks || [],
        upcomingBlocks: state.upcomingBlocks || [],
      });
      return;
    }

    if (action === 'join') {
      if (btn.disabled) return;
      // Open registration screen directly instead of modal
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ type: 'register', courtNumber: null }, '*');
      }
      return;
    }

    if (action === 'clear-court') {
      const registeredCourt = sessionStorage.getItem('mobile-registered-court');
      if (registeredCourt) {
        // Open Clear Court confirmation modal instead of using confirm()
        if (window.MobileModal) {
          window.MobileModal.open('clear-court-confirm', { courtNumber: registeredCourt });
        }
      }
      return;
    }
  });

  // Optional: listen for app events to toggle Join/Waitlist count
  const joinBtn = el.querySelector('button[data-action="join"]');
  const wlBtn = el.querySelector('button[data-action="waitlist"] .lbl');

  // Function to update Join/Clear button based on mobile registration status
  window.updateJoinButtonForMobile = function updateJoinButtonForMobile() {
    // Only apply in mobile view within iframe
    if (!window.IS_MOBILE_VIEW || window.top === window.self) return;

    const registeredCourt = sessionStorage.getItem('mobile-registered-court');
    let isActuallyOnCourt = false;

    // Only check the specific court that sessionStorage says we're on
    // Check for actual valid court number, not "null" string or empty
    if (registeredCourt && registeredCourt !== 'null' && registeredCourt !== '') {
      try {
        // Use React state via getCourtboardState() - no localStorage
        const state = getCourtboardState();
        const courts = state.courts || [];
        const courtIndex = parseInt(registeredCourt, 10) - 1;
        const court = courts[courtIndex];

        // Verify the user is actually on THIS specific court
        // Domain format: session.group.players
        isActuallyOnCourt =
          court &&
          (court.isOccupied ||
            court.session?.group?.players?.length > 0 ||
            court.session?.participants?.length > 0); // API wire format fallback

        console.debug(`[Mobile Clear Court Check] Court ${registeredCourt}:`, {
          hasCourts: courts.length > 0,
          court: court,
          isActuallyOnCourt: isActuallyOnCourt,
        });
      } catch (e) {
        console.error('Error checking court occupation:', e);
        isActuallyOnCourt = false;
      }
    }

    if (
      registeredCourt &&
      registeredCourt !== 'null' &&
      registeredCourt !== '' &&
      isActuallyOnCourt
    ) {
      // Change to Clear Court button - blue square like occupied courts, no emoji
      joinBtn.setAttribute('data-action', 'clear-court');
      joinBtn.innerHTML =
        '<span class="lbl" style="font-size: 0.9em; line-height: 1.2;">Clear<br/>Court</span>';
      joinBtn.disabled = false;
      joinBtn.setAttribute('aria-disabled', 'false');
      joinBtn.style.background = 'rgb(147, 197, 253)'; // same blue as occupied courts
      joinBtn.style.border = '1px solid black';
      joinBtn.style.color = 'black';
      joinBtn.title = `Clear Court ${registeredCourt}`;
    } else {
      // Reset to Join Waitlist button
      joinBtn.setAttribute('data-action', 'join');
      joinBtn.innerHTML = '🎾<span class="lbl">Join Waitlist</span>';
      joinBtn.style.background = '';
      joinBtn.style.border = '';
      joinBtn.style.color = '';
      joinBtn.title = 'Join Waitlist';
      // Let updateJoinButtonState handle the disabled state
      window.updateJoinButtonState();
    }
  };

  // Function to check if waitlist join should be allowed
  // Exposed to window so React can call it after updating CourtboardState
  window.updateJoinButtonState = function updateJoinButtonState() {
    console.log('[JoinButton] updateJoinButtonState called');
    // If user is registered, let updateJoinButtonForMobile handle it (shows Clear Court)
    const registered = sessionStorage.getItem('mobile-registered-court');
    // Check for actual valid court number, not "null" string or empty
    if (registered && registered !== 'null' && registered !== '') {
      console.log('[JoinButton] User registered on court', registered, '- skipping');
      return;
    }

    // If user is already on waitlist, disable the join button
    const waitlistEntryId = sessionStorage.getItem('mobile-waitlist-entry-id');
    if (waitlistEntryId && waitlistEntryId !== 'null' && waitlistEntryId !== '') {
      console.log('[JoinButton] User already on waitlist with entry ID:', waitlistEntryId);
      joinBtn.disabled = true;
      joinBtn.setAttribute('aria-disabled', 'true');
      joinBtn.innerHTML = '⏳<span class="lbl">On Waitlist</span>';
      joinBtn.title = 'You are on the waitlist';
      return;
    }

    try {
      // Use React state via getCourtboardState() - no localStorage
      const state = getCourtboardState();

      // Use pre-calculated freeCourts from CourtboardState if available
      // Otherwise fall back to CourtAvailability helper or 0
      let freeCourts;
      if (state?.freeCourts !== undefined) {
        freeCourts = state.freeCourts;
        console.log('[JoinButton] Using pre-calculated freeCourts:', freeCourts);
      } else if (window.CourtAvailability?.countPlayableCourts) {
        freeCourts = window.CourtAvailability.countPlayableCourts(
          state?.courts || [],
          state?.courtBlocks || [],
          new Date().toISOString()
        );
        console.log('[JoinButton] Calculated freeCourts via CourtAvailability:', freeCourts);
      } else {
        // Fallback - assume no free courts to be safe (button disabled)
        freeCourts = 0;
        console.log('[JoinButton] No availability data - defaulting freeCourts to 0');
      }

      // Enable join only when NO free courts (waitlist existence doesn't affect button state)
      const shouldEnableJoin = freeCourts === 0;

      // Reset button to Join Waitlist state (in case it was showing "On Waitlist")
      joinBtn.innerHTML = '🎾<span class="lbl">Join Waitlist</span>';
      joinBtn.title = 'Join Waitlist';
      joinBtn.disabled = !shouldEnableJoin;
      joinBtn.setAttribute('aria-disabled', String(!shouldEnableJoin));

      console.log(
        '[JoinButton] freeCourts:',
        freeCourts,
        'shouldEnable:',
        shouldEnableJoin,
        'button disabled:',
        !shouldEnableJoin
      );
    } catch (e) {
      console.warn('Error updating join button state:', e);
    }
  };

  // Listen for app events
  document.addEventListener('app:availability', (evt) => {
    // If user is registered, let updateJoinButtonForMobile handle it
    const registered = sessionStorage.getItem('mobile-registered-court');
    if (registered) return;

    const hasAvail = !!evt.detail?.hasAvailable;
    // Join button should be ENABLED when NO courts available (hasAvail = false)
    joinBtn.disabled = hasAvail;
    joinBtn.setAttribute('aria-disabled', String(hasAvail));
  });

  document.addEventListener('app:waitlistCount', (evt) => {
    const n = Number(evt.detail?.count || 0);
    wlBtn.textContent = n ? `Waitlist (${n})` : 'Waitlist';
  });

  // Listen for data updates to update button state
  document.addEventListener('tennisDataUpdate', () => {
    window.updateJoinButtonState();
    window.updateJoinButtonForMobile();
  });

  // Listen for mobile registration events
  window.addEventListener('message', (evt) => {
    if (evt.data?.type === 'mobile:registrationSuccess') {
      // Try multiple times with increasing delays to ensure data is synchronized
      setTimeout(window.updateJoinButtonForMobile, 100);
      setTimeout(window.updateJoinButtonForMobile, 500);
      setTimeout(window.updateJoinButtonForMobile, 1000);
      setTimeout(window.updateJoinButtonForMobile, 2000);
    }
  });

  // Initial check
  window.updateJoinButtonState();
  window.updateJoinButtonForMobile();

  console.debug('Plain-JS fallback bar mounted');
})();
