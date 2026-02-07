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

import { logger } from '../../lib/logger.js';

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
    logger.debug('Waitlist', 'Waitlist join already in progress, ignoring duplicate request');
    // SILENT-GUARD: double-submit prevention — no user feedback needed
    return;
  }

  const traceId = `WL-${Date.now()}`;
  try {
    logger.debug('Waitlist', `[${traceId}] sendGroupToWaitlist START`);
    logger.debug('Waitlist', `[${traceId}] Raw group argument`, JSON.stringify(group, null, 2));
    logger.debug(
      'Waitlist',
      `[${traceId}] Current currentGroup state`,
      JSON.stringify(currentGroup, null, 2)
    );

    if (!group || !group.length) {
      logger.warn('Waitlist', 'no players selected');
      // EARLY-EXIT: empty group — nothing to do
      return;
    }

    // Build the players array (keep guests for waitlist display)
    // UI state uses camelCase - no snake_case fallback needed
    const players = group
      .map((p) => {
        const mapped = {
          id: String(p.id || '').trim(),
          name: String(p.name || '').trim(),
          memberNumber: p.memberNumber || p.id,
          ...(p.isGuest !== undefined && { isGuest: p.isGuest }),
          ...(p.sponsor && { sponsor: p.sponsor }),
        };
        logger.debug(
          'Waitlist',
          `[${traceId}] Mapping player: ${p.name} (id=${p.id}, memberNumber=${p.memberNumber}) -> ${mapped.name} (id=${mapped.id}, memberNumber=${mapped.memberNumber})`
        );
        return mapped;
      })
      .filter((p) => p && p.id && p.name);

    const guests = group.filter((p) => p.isGuest).length;

    logger.debug(
      'Waitlist',
      `[${traceId}] Final players to send`,
      JSON.stringify(players, null, 2)
    );
    logger.debug('Waitlist', 'calling addToWaitlist with', {
      players: players.map((p) => p.name),
      guests,
    });

    // Validation check
    const validation = validateGroupCompat(players, guests);
    if (!validation.ok) {
      try {
        Tennis.UI.toast(validation.errors.join(' '), { type: 'error' });
      } catch {
        /* Tennis.UI not available */
      }
      showAlertMessage(validation.errors.join('\n'));
      // FEEDBACK: toast and alert provide user feedback above
      return;
    }

    // Check if any player is already playing
    for (const player of group) {
      const playerStatus = isPlayerAlreadyPlaying(player.id);
      if (playerStatus.isPlaying && playerStatus.location !== 'current') {
        showAlertMessage(`${player.name} is already registered elsewhere.`);
        // FEEDBACK: alert provides user feedback above
        return;
      }
    }

    // Determine group type from player count
    const groupType = players.length <= 3 ? 'singles' : 'doubles';

    // Get geolocation for mobile (required by backend for geofence validation)
    const mobileLocation = await getMobileGeolocation();

    const waitlistStartTime = performance.now();
    logger.debug('Waitlist', '[T+0ms] Calling backend.commands.joinWaitlistWithPlayers', {
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
    logger.debug('Waitlist', `[T+${apiDuration}ms] Result`, result);
    logger.debug('Waitlist', `[T+${apiDuration}ms] result.data`, result.data);
    logger.debug('Waitlist', `[T+${apiDuration}ms] mobileFlow`, mobileFlow);

    if (result.ok) {
      // Extract waitlist entry info from API response
      const waitlistEntry = result.data?.waitlist;
      const entryId = waitlistEntry?.id;
      const position = waitlistEntry?.position || result.position || 1;
      logger.debug('Waitlist', `[T+${apiDuration}ms] Extracted`, { entryId, position });

      // Store the position from response for the success screen
      if (position) {
        setWaitlistPosition(position);
        logger.debug('Waitlist', `[T+${apiDuration}ms] Position`, position);
      }

      // Store waitlist entry ID in sessionStorage for mobile users
      // This enables auto-assignment when they tap a court
      if (entryId && mobileFlow) {
        sessionStorage.setItem('mobile-waitlist-entry-id', entryId);
        logger.debug('Waitlist', `[T+${apiDuration}ms] Stored mobile waitlist entry ID`, entryId);

        // Notify parent (MobileBridge) about waitlist join so it can broadcast state
        try {
          window.parent.postMessage({ type: 'waitlist:joined', entryId }, '*');
          logger.debug('Waitlist', `[T+${apiDuration}ms] Sent waitlist:joined to parent`);
        } catch (e) {
          logger.warn('Waitlist', 'Failed to notify parent of waitlist join', e);
        }
      } else {
        logger.debug('Waitlist', `[T+${apiDuration}ms] NOT storing entry ID`, {
          entryId,
          mobileFlow,
        });
      }

      // Toast and rely on board subscription for UI refresh
      Tennis?.UI?.toast?.(`Added to waiting list (position ${position})`, {
        type: 'success',
      });
      const successTime = Math.round(performance.now() - waitlistStartTime);
      logger.debug('Waitlist', `[T+${successTime}ms] joined ok, UI updated`);
    } else {
      logger.error('Waitlist', `[T+${apiDuration}ms] Failed`, {
        code: result.code,
        message: result.message,
      });
      // Handle mobile location errors - offer QR fallback
      if (API_CONFIG.IS_MOBILE && result.message?.includes('Location required')) {
        setGpsFailedPrompt(true);
        // FEEDBACK: GPS prompt modal provides user feedback
        return;
      }
      Tennis?.UI?.toast?.(result.message || 'Could not join waitlist', { type: 'error' });
    }
  } catch (e) {
    setIsJoiningWaitlist(false);
    logger.error('Waitlist', 'failed', e);
    Tennis?.UI?.toast?.('Could not join waitlist', { type: 'error' });
  }
  // ===== END ORIGINAL FUNCTION BODY =====
}
