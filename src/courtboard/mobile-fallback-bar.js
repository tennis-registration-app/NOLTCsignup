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

  // Helper functions for safe data reading - now uses getCourtboardState()
  function readCourtBlocksSafe() {
    return getCourtboardState().courtBlocks || [];
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
    if (registeredCourt) {
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

    if (registeredCourt && isActuallyOnCourt) {
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
      updateJoinButtonState();
    }
  };

  // Function to check if waitlist join should be allowed
  function updateJoinButtonState() {
    try {
      // Use React state via getCourtboardState() - no localStorage
      const state = getCourtboardState();
      const courts = state.courts || [];
      const waitingGroups = state.waitingGroups || [];
      const blocks = state.courtBlocks || [];

      // Check if there are available courts using availability domain
      const Availability =
        window.Tennis?.Domain?.Availability || window.Tennis?.Domain?.availability;
      if (Availability && Availability.shouldAllowWaitlistJoin) {
        const wetSet = new Set(); // Assume no wet courts for now
        const hasWaitlist = waitingGroups.length > 0;

        // Build data object for availability check
        const data = { courts: courts };

        // Original logic: no courts available
        const shouldAllowByNoAvail = Availability.shouldAllowWaitlistJoin({
          data: data,
          now: new Date(),
          blocks: blocks,
          wetSet: wetSet,
        });

        // New logic: enable when waitlist exists OR no courts available
        const shouldAllow = hasWaitlist || shouldAllowByNoAvail;

        joinBtn.disabled = !shouldAllow;
        joinBtn.setAttribute('aria-disabled', String(!shouldAllow));
      } else {
        // Fallback: simple check based on occupied courts vs waiting groups
        const occupiedCourts = courts.filter((c) => c && c.isOccupied).length;
        const totalCourts = 12;

        // Enable join if all courts occupied OR there are waiting groups
        const shouldEnableJoin = occupiedCourts >= totalCourts || waitingGroups.length > 0;
        joinBtn.disabled = !shouldEnableJoin;
        joinBtn.setAttribute('aria-disabled', String(!shouldEnableJoin));
      }
    } catch (e) {
      console.warn('Error updating join button state:', e);
    }
  }

  // Listen for app events
  document.addEventListener('app:availability', (evt) => {
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
    updateJoinButtonState();
    updateJoinButtonForMobile();
  });

  // Listen for mobile registration events
  window.addEventListener('message', (evt) => {
    if (evt.data?.type === 'mobile:registrationSuccess') {
      // Try multiple times with increasing delays to ensure data is synchronized
      setTimeout(updateJoinButtonForMobile, 100);
      setTimeout(updateJoinButtonForMobile, 500);
      setTimeout(updateJoinButtonForMobile, 1000);
      setTimeout(updateJoinButtonForMobile, 2000);
    }
  });

  // Initial check
  updateJoinButtonState();
  updateJoinButtonForMobile();

  console.debug('Plain-JS fallback bar mounted');
})();
