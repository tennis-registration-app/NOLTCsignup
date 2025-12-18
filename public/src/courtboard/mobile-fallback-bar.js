// Plain-JS fallback bar (emergency restoration)
(function mountFallbackBar(){
  if (!window.IS_MOBILE_VIEW) return;

  const el = document.getElementById('mobile-bottom-bar-fallback');
  if (!el) return;

  // Style & show
  el.hidden = false;
  el.setAttribute('role','toolbar');
  el.className = 'mbb-fallback';

  // Helper functions for safe data reading
  function readCourtBlocksSafe() {
    try {
      // Try multiple data sources
      const storage = window.Tennis?.Storage;
      const blocksKey = 'courtBlocks';
      if (storage?.readJSON) {
        return storage.readJSON(blocksKey) || [];
      }
      // Fallback to localStorage
      const data = localStorage.getItem(blocksKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function selectReservedSafe(blocks, now) {
    try {
      // Use the same logic as selectReservedItemsFromBlocks
      function normalizeBlock(block) {
        if (!block) return null;
        const start = new Date(block.startTime || block.start);
        const end = new Date(block.endTime || block.end);
        const courts = Array.isArray(block.courts) ? block.courts : [block.courtNumber].filter(Boolean);
        const reason = block.reason || block.templateName || 'Reserved';
        if (!start || !end || courts.length === 0) return null;
        return { courts, start, end, reason };
      }

      const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date(now);   endOfToday.setHours(23,59,59,999);

      const normalized = (blocks || []).map(normalizeBlock).filter(Boolean);
      const todayFuture = normalized
        .filter(b => b.end > now && b.start <= endOfToday)
        .map(b => ({ ...b, end: b.end > endOfToday ? endOfToday : b.end }))
        .sort((a,b) => a.start - b.start);

      const byKey = new Map();
      for (const b of todayFuture) {
        const k = `${b.reason}|${b.start.toISOString()}|${b.end.toISOString()}`;
        if (!byKey.has(k)) byKey.set(k, { ...b, courts: new Set(b.courts) });
        else b.courts.forEach(c => byKey.get(k).courts.add(c));
      }

      return Array.from(byKey.values()).map(v => ({
        key: `${v.reason}|${v.start.getTime()}|${v.end.getTime()}`,
        courts: Array.from(v.courts).sort((a,b)=>a-b),
        start: v.start,
        end: v.end,
        reason: v.reason
      }));
    } catch(e) {
      console.warn('Error in selectReservedSafe:', e);
      return [];
    }
  }

  function readWaitlistSafe() {
    try {
      const storage = window.Tennis?.Storage;
      const dataKey = 'tennisClubData';

      // Read main data object
      let data = null;
      if (storage?.readJSON) {
        data = storage.readJSON(dataKey) || {};
      } else {
        const jsonData = localStorage.getItem(dataKey);
        data = jsonData ? JSON.parse(jsonData) : {};
      }

      // Return waitingGroups from main data
      return Array.isArray(data.waitingGroups) ? data.waitingGroups : [];
    } catch(e) {
      console.warn('Error reading waitlist:', e);
      return [];
    }
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
      const blocks = readCourtBlocksSafe();
      openModal('reserved', { reservedData: selectReservedSafe(blocks, new Date()) });
      return;
    }

    if (action === 'waitlist') {
      openModal('waitlist', { waitlistData: readWaitlistSafe() });
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
  const wlBtn   = el.querySelector('button[data-action="waitlist"] .lbl');

  // Function to update Join/Clear button based on mobile registration status
  window.updateJoinButtonForMobile = function updateJoinButtonForMobile() {
    // Only apply in mobile view within iframe
    if (!window.IS_MOBILE_VIEW || window.top === window.self) return;

    const registeredCourt = sessionStorage.getItem('mobile-registered-court');
    let isActuallyOnCourt = false;

    // Only check the specific court that sessionStorage says we're on
    if (registeredCourt) {
      try {
        const data = JSON.parse(localStorage.getItem('tennisClubData') || '{}');
        const court = data.courts && data.courts[registeredCourt - 1];

        // Verify the user is actually on THIS specific court
        isActuallyOnCourt = court && (
          (court.current && court.current.players && court.current.players.length > 0) ||
          (court.players && court.players.length > 0)
        );

        console.debug(`[Mobile Clear Court Check] Court ${registeredCourt}:`, {
          hasData: !!data,
          hasCourts: !!(data.courts),
          court: court,
          isActuallyOnCourt: isActuallyOnCourt
        });
      } catch (e) {
        console.error('Error checking court occupation:', e);
        isActuallyOnCourt = false;
      }
    }

    if (registeredCourt && isActuallyOnCourt) {
      // Change to Clear Court button - blue square like occupied courts, no emoji
      joinBtn.setAttribute('data-action', 'clear-court');
      joinBtn.innerHTML = '<span class="lbl" style="font-size: 0.9em; line-height: 1.2;">Clear<br/>Court</span>';
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
  }

  // Function to check if waitlist join should be allowed
  function updateJoinButtonState() {
    try {
      const storage = window.Tennis?.Storage;
      const dataKey = 'tennisClubData';

      let data = null;
      if (storage?.readJSON) {
        data = storage.readJSON(dataKey) || {};
      } else {
        const jsonData = localStorage.getItem(dataKey);
        data = jsonData ? JSON.parse(jsonData) : {};
      }

      // Check if there are available courts using availability domain
      const Availability = window.Tennis?.Domain?.Availability || window.Tennis?.Domain?.availability;
      if (Availability && Availability.shouldAllowWaitlistJoin) {
        const blocks = readCourtBlocksSafe();
        const wetSet = new Set(); // Assume no wet courts for now

        // Check for existing waitlist
        const waitingGroups = Array.isArray(data.waitingGroups) ? data.waitingGroups : [];
        const hasWaitlist = waitingGroups.length > 0;

        // Original logic: no courts available
        const shouldAllowByNoAvail = Availability.shouldAllowWaitlistJoin({
          data: data,
          now: new Date(),
          blocks: blocks,
          wetSet: wetSet
        });

        // New logic: enable when waitlist exists OR no courts available
        const shouldAllow = hasWaitlist || shouldAllowByNoAvail;

        joinBtn.disabled = !shouldAllow;
        joinBtn.setAttribute('aria-disabled', String(!shouldAllow));
      } else {
        // Fallback: simple check based on occupied courts vs waiting groups
        const occupiedCourts = Array.isArray(data.courts) ? data.courts.filter(c => c !== null).length : 0;
        const waitingGroups = Array.isArray(data.waitingGroups) ? data.waitingGroups.length : 0;
        const totalCourts = 12;

        // Enable join if all courts occupied OR there are waiting groups
        const shouldEnableJoin = occupiedCourts >= totalCourts || waitingGroups > 0;
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
