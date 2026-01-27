// Mobile Bridge Script for CourtBoard
(function boardMobileBridge() {
  // Mobile-only: only active when embedded
  const MOBILE = window.top !== window.self;

  /**
   * Get Courtboard state from React (via window bridge).
   * Uses the centralized accessor - NO localStorage reads.
   */
  function getCourtboardState() {
    return window.CourtboardState ?? { courts: [], courtBlocks: [], waitingGroups: [] };
  }

  // call this when an available court is tapped
  window.mobileTapToRegister = function (courtNumber) {
    if (!MOBILE) return false; // do nothing on desktop/iPad standalone

    // Check if user is already registered - show toast instead of registration
    const registeredCourt = sessionStorage.getItem('mobile-registered-court');
    if (registeredCourt) {
      // Verify the registration is still valid by checking if the court is actually occupied
      try {
        // Use React state via getCourtboardState() - no localStorage
        const state = getCourtboardState();
        const courts = state.courts || [];
        const courtIndex = parseInt(registeredCourt, 10) - 1;
        const court = courts[courtIndex];

        // Check if court is actually occupied (Domain format: session.group.players)
        const isActuallyOnCourt =
          court &&
          (court.isOccupied ||
            court.session?.group?.players?.length > 0 ||
            court.session?.participants?.length > 0); // API wire format fallback

        if (!isActuallyOnCourt) {
          // Registration is stale - clear it and allow new registration
          console.log('Clearing stale mobile registration for court', registeredCourt);
          sessionStorage.removeItem('mobile-registered-court');
          window.parent.postMessage({ type: 'resetRegistration' }, '*');
          return false; // Allow registration to proceed
        }
      } catch (e) {
        console.error('Error verifying court occupation:', e);
        // If we can't verify, clear the stale registration
        sessionStorage.removeItem('mobile-registered-court');
        window.parent.postMessage({ type: 'resetRegistration' }, '*');
        return false;
      }

      // Only show toast if registration is still valid
      if (window.Tennis?.UI?.toast) {
        window.Tennis.UI.toast(
          `You are currently registered for play on Court ${registeredCourt}`,
          { type: 'warning' }
        );
      }
      return false; // Don't proceed with registration
    }

    // Check if there's a waitlist
    try {
      // Use React state via getCourtboardState() - no localStorage
      const state = getCourtboardState();
      const waitingGroups = state.waitingGroups || [];
      const mobileWaitlistEntryId = sessionStorage.getItem('mobile-waitlist-entry-id');

      if (waitingGroups.length > 0) {
        // Check if this mobile user is first in waitlist
        const firstGroup = waitingGroups[0];
        const isUserFirstInWaitlist =
          mobileWaitlistEntryId && firstGroup?.id === mobileWaitlistEntryId;

        if (isUserFirstInWaitlist) {
          // User is first in waitlist - trigger assign-from-waitlist to this court
          console.log('[Mobile] Assigning first waitlist group to court', courtNumber);
          try {
            window.parent.postMessage(
              {
                type: 'assign-from-waitlist',
                courtNumber: Number(courtNumber),
                waitlistEntryId: mobileWaitlistEntryId,
              },
              '*'
            );
          } catch {
            // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
          }
          return true;
        } else {
          // User is NOT first (or not on waitlist at all) - redirect to join waitlist
          try {
            window.parent.postMessage({ type: 'register', courtNumber: null }, '*');
          } catch {
            // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('Error checking waitlist in mobileTapToRegister:', e);
    }

    // Normal behavior: no waitlist, select the court directly
    try {
      window.parent.postMessage({ type: 'register', courtNumber: Number(courtNumber) }, '*');
    } catch {
      // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
    }
    return true;
  };

  // Optional: highlight after success and handle mobile registration
  window.addEventListener('message', (e) => {
    const d = e?.data;
    if (!d) return;

    if (d.type === 'highlight') {
      const n = Number(d.courtNumber);
      const el = document.querySelector(`[data-court="${n}"]`);
      if (!el) return;
      el.classList.add('court-highlight');
      setTimeout(() => el.classList.remove('court-highlight'), 3000);
    } else if (d.type === 'mobile:registrationSuccess') {
      console.log('CourtBoard received mobile registration success for court:', d.courtNumber);
      // Fire DOM event for mobile bottom bar to listen to
      document.dispatchEvent(
        new CustomEvent('mobile:registrationSuccess', {
          detail: { courtNumber: Number(d.courtNumber) },
        })
      );
    }
  });

  // Tap debouncing to prevent double opens
  let _tapLock = 0;
  document.addEventListener('click', (ev) => {
    if (window.top === window.self) return; // only when embedded

    // Check if this click was on a court card that already has a React onClick handler
    const card = ev.target.closest('[data-court][data-available="true"]');
    if (!card) return;

    // If the court has a React onClick handler (available courts), let React handle it
    const hasReactHandler = card.onclick !== null || card.getAttribute('role') === 'button';
    if (hasReactHandler) return; // Let React onClick handle it

    const now = Date.now();
    if (now - _tapLock < 300) return; // debounce
    _tapLock = now;

    const n = Number(card.getAttribute('data-court'));
    if (!Number.isFinite(n)) return;

    // Use mobileTapToRegister to ensure proper registration checks (toast for already registered users)
    if (window.mobileTapToRegister) {
      const proceeded = window.mobileTapToRegister(n);
      if (proceeded) {
        ev.preventDefault();
      }
    } else {
      // Fallback to direct message if mobileTapToRegister not available
      try {
        window.parent.postMessage({ type: 'register', courtNumber: n }, '*');
      } catch {
        // Intentionally ignored (Phase 3.5 lint): cross-origin postMessage may throw
      }
      ev.preventDefault();
    }
  });
})();
