/**
 * Waitlist Orchestrator
 * Moved from App.jsx — WP5.5 facade extraction
 *
 * DEPENDENCY CHECKLIST for sendGroupToWaitlistOrchestrated:
 * Reads:
 *   - isJoiningWaitlist
 *   - currentGroup
 *   - mobileFlow
 *
 * Calls (setters):
 *   - setIsJoiningWaitlist
 *   - setWaitlistPosition
 *   - setGpsFailedPrompt
 *
 * Calls (services/helpers):
 *   - backend.commands.joinWaitlistWithPlayers
 *   - getMobileGeolocation
 *   - validateGroupCompat
 *   - isPlayerAlreadyPlaying
 *   - showAlertMessage
 *   - Tennis (global)
 *   - API_CONFIG
 *
 * Returns: void (same as original — may have early returns)
 */

/* global Tennis */

export async function sendGroupToWaitlistOrchestrated(group, deps) {
  const {
    // Read values
    isJoiningWaitlist,
    currentGroup,
    mobileFlow,
    // Setters
    setIsJoiningWaitlist,
    setWaitlistPosition,
    setGpsFailedPrompt,
    // Services/helpers
    backend,
    getMobileGeolocation,
    validateGroupCompat,
    isPlayerAlreadyPlaying,
    showAlertMessage,
    API_CONFIG,
  } = deps;

  // ===== ORIGINAL FUNCTION BODY (VERBATIM) =====
  // Prevent double-submit
  if (isJoiningWaitlist) {
    console.log('⚠️ Waitlist join already in progress, ignoring duplicate request');
    return;
  }

  const traceId = `WL-${Date.now()}`;
  try {
    console.log(`🔴🔴🔴 [${traceId}] sendGroupToWaitlist START`);
    console.log(`🔴 [${traceId}] Raw group argument:`, JSON.stringify(group, null, 2));
    console.log(
      `🔴 [${traceId}] Current currentGroup state:`,
      JSON.stringify(currentGroup, null, 2)
    );

    if (!group || !group.length) {
      console.warn('[waitlist] no players selected');
      return;
    }

    // Build the players array (keep guests for waitlist display)
    const players = group
      .map((p) => {
        const mapped = {
          id: String(p.id || '').trim(),
          name: String(p.name || '').trim(),
          memberNumber: p.memberNumber || p.member_number || p.id,
          ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
          ...(p.sponsor && { sponsor: p.sponsor }),
        };
        console.log(
          `🔴 [${traceId}] Mapping player: ${p.name} (id=${p.id}, memberNumber=${p.memberNumber}) -> ${mapped.name} (id=${mapped.id}, memberNumber=${mapped.memberNumber})`
        );
        return mapped;
      })
      .filter((p) => p && p.id && p.name);

    const guests = group.filter((p) => p.isGuest).length;

    console.log(`🔴 [${traceId}] Final players to send:`, JSON.stringify(players, null, 2));
    console.log(
      '[waitlist] calling addToWaitlist with',
      players.map((p) => p.name),
      'guests:',
      guests
    );

    // Validation check
    const validation = validateGroupCompat(players, guests);
    if (!validation.ok) {
      try {
        Tennis.UI.toast(validation.errors.join(' '), { type: 'error' });
      } catch {
        /* Tennis.UI not available */
      }
      showAlertMessage(validation.errors.join('\n'));
      return;
    }

    // Check if any player is already playing
    for (const player of group) {
      const playerStatus = isPlayerAlreadyPlaying(player.id);
      if (playerStatus.isPlaying && playerStatus.location !== 'current') {
        showAlertMessage(`${player.name} is already registered elsewhere.`);
        return;
      }
    }

    // Determine group type from player count
    const groupType = players.length <= 2 ? 'singles' : 'doubles';

    // Get geolocation for mobile (required by backend for geofence validation)
    const mobileLocation = await getMobileGeolocation();

    const waitlistStartTime = performance.now();
    console.log('[waitlist] [T+0ms] Calling backend.commands.joinWaitlistWithPlayers:', {
      playerCount: players.length,
      groupType,
      players: players.map((p) => `${p.name}(mn=${p.memberNumber})`),
      mobileLocation: mobileLocation ? 'provided' : 'not-mobile',
    });

    setIsJoiningWaitlist(true);
    const result = await backend.commands.joinWaitlistWithPlayers({
      players,
      groupType,
      ...(mobileLocation || {}), // Spread latitude/longitude if available
    });
    const apiDuration = Math.round(performance.now() - waitlistStartTime);
    setIsJoiningWaitlist(false);
    console.log(`[waitlist] [T+${apiDuration}ms] Result:`, result);
    console.log(`[waitlist] [T+${apiDuration}ms] result.data:`, result.data);
    console.log(`[waitlist] [T+${apiDuration}ms] mobileFlow:`, mobileFlow);

    if (result.ok) {
      // Extract waitlist entry info from API response
      const waitlistEntry = result.data?.waitlist;
      const entryId = waitlistEntry?.id;
      const position = waitlistEntry?.position || result.position || 1;
      console.log(
        `[waitlist] [T+${apiDuration}ms] Extracted - entryId:`,
        entryId,
        'position:',
        position
      );

      // Store the position from response for the success screen
      if (position) {
        setWaitlistPosition(position);
        console.log(`[waitlist] [T+${apiDuration}ms] Position:`, position);
      }

      // Store waitlist entry ID in sessionStorage for mobile users
      // This enables auto-assignment when they tap a court
      if (entryId && mobileFlow) {
        sessionStorage.setItem('mobile-waitlist-entry-id', entryId);
        console.log(`[waitlist] [T+${apiDuration}ms] Stored mobile waitlist entry ID:`, entryId);

        // Notify parent (MobileBridge) about waitlist join so it can broadcast state
        try {
          window.parent.postMessage({ type: 'waitlist:joined', entryId }, '*');
          console.log(`[waitlist] [T+${apiDuration}ms] Sent waitlist:joined to parent`);
        } catch (e) {
          console.warn('[waitlist] Failed to notify parent of waitlist join:', e);
        }
      } else {
        console.log(
          `[waitlist] [T+${apiDuration}ms] NOT storing entry ID - entryId:`,
          entryId,
          'mobileFlow:',
          mobileFlow
        );
      }

      // Toast and rely on board subscription for UI refresh
      Tennis?.UI?.toast?.(`Added to waiting list (position ${position})`, {
        type: 'success',
      });
      const successTime = Math.round(performance.now() - waitlistStartTime);
      console.log(`[waitlist] [T+${successTime}ms] joined ok, UI updated`);
    } else {
      console.error(`[waitlist] [T+${apiDuration}ms] Failed:`, result.code, result.message);
      // Handle mobile location errors - offer QR fallback
      if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
        setGpsFailedPrompt(true);
        return;
      }
      Tennis?.UI?.toast?.(result.message || 'Could not join waitlist', { type: 'error' });
    }
  } catch (e) {
    setIsJoiningWaitlist(false);
    console.error('[waitlist] failed:', e);
    Tennis?.UI?.toast?.('Could not join waitlist', { type: 'error' });
  }
  // ===== END ORIGINAL FUNCTION BODY =====
}
