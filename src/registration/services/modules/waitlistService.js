import { normalizeAccountMembers } from '@lib/normalize/normalizeMember.js';

/**
 * Waitlist operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D2: Safe read/refresh/remove slice.
 * WP5-D4: Added addToWaitlist and assignFromWaitlist mutations.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.notifyListeners - Notify change listeners
 * @param {Function} deps.transformWaitlist - Transform API waitlist to legacy format
 * @param {Function} deps.getWaitlistData - Get cached waitlist data
 * @param {Function} deps.setWaitlistData - Set cached waitlist data
 * @param {Object} deps.logger - Logger instance
 * @param {Object} [deps.courtsService] - Courts service for assignFromWaitlist
 */
export function createWaitlistService({
  api,
  notifyListeners,
  transformWaitlist,
  getWaitlistData,
  setWaitlistData,
  logger,
  courtsService,
}) {
  async function refreshWaitlist() {
    try {
      const waitlistData = await api.getWaitlist();
      setWaitlistData(waitlistData);
      notifyListeners('waitlist');
      return transformWaitlist(waitlistData.waitlist);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh waitlist', error);
      throw error;
    }
  }

  async function getWaitlist() {
    if (!getWaitlistData()) {
      await refreshWaitlist();
    }
    return transformWaitlist(getWaitlistData().waitlist);
  }

  async function removeFromWaitlist(waitlistId) {
    // If passed an index (legacy), we need to look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    await api.cancelWaitlist(waitlistId);

    // Refresh waitlist
    await refreshWaitlist();

    return {
      success: true,
    };
  }

  async function addToWaitlist(players, options = {}) {
    const traceId = options.traceId || `API-${Date.now()}`;
    logger.debug('ApiService', `[${traceId}] addToWaitlist ENTRY`);
    logger.debug('ApiService', `[${traceId}] Input players`, JSON.stringify(players, null, 2));
    logger.debug(
      'ApiService',
      `[${traceId}] Players summary`,
      players.map((p) => `${p.name}(id=${p.id},mn=${p.memberNumber})`)
    );
    logger.debug('ApiService', `[${traceId}] Options`, options);

    // Transform players to API format (same logic as assignCourt)
    const participants = await Promise.all(
      players.map(async (player, idx) => {
        logger.debug(
          'ApiService',
          `[${traceId}] Processing player[${idx}]: name="${player.name}", id="${player.id}", memberNumber="${player.memberNumber}"`
        );

        let memberId = null;
        let accountId = null;

        // Check if this is a guest
        if (player.isGuest || player.type === 'guest') {
          return {
            type: 'guest',
            guest_name: player.name || player.displayName || player.guest_name || 'Guest',
            account_id: '__NEEDS_ACCOUNT__',
          };
        }

        // Try to get existing IDs if they're UUIDs
        const existingId = player.id || player.memberId;
        const isUUID =
          existingId && existingId.includes && existingId.includes('-') && existingId.length > 30;

        logger.debug('ApiService', `[${traceId}] Player UUID check`, {
          existingId,
          isUUID,
          'player.accountId': player.accountId,
        });

        if (isUUID) {
          memberId = existingId;
          accountId = player.accountId;
          logger.debug(
            'ApiService',
            `[${traceId}] Using UUID directly: memberId=${memberId}, accountId=${accountId}`
          );
        }

        // If we don't have BOTH UUID and accountId, look up by memberNumber
        if (!memberId || !accountId) {
          logger.debug(
            'ApiService',
            `[${traceId}] Missing data, need lookup: memberId=${memberId}, accountId=${accountId}`
          );
          const memberNumber = player.memberNumber || player.id;

          if (memberNumber) {
            try {
              logger.debug(
                'ApiService',
                `[${traceId}] Looking up memberNumber: ${memberNumber}, player.name: "${player.name}"`
              );
              const result = await api.getMembersByAccount(String(memberNumber));
              const members = normalizeAccountMembers(result.members);
              logger.debug(
                'ApiService',
                `[${traceId}] Found ${members.length} members for account`,
                members.map((m) => `${m.displayName}(primary=${m.isPrimary})`)
              );

              const playerNameLower = (player.name || '').toLowerCase().trim();

              // Try exact match first (case-insensitive)
              let member = members.find(
                (m) => m.displayName?.toLowerCase().trim() === playerNameLower
              );

              // Try partial match (player name contains or is contained in displayName)
              if (!member) {
                member = members.find((m) => {
                  const displayLower = (m.displayName || '').toLowerCase().trim();
                  return (
                    displayLower.includes(playerNameLower) || playerNameLower.includes(displayLower)
                  );
                });
              }

              // Try matching by last name only (common case: "Sinner" -> "Jannik Sinner")
              if (!member && playerNameLower) {
                member = members.find((m) => {
                  const displayLower = (m.displayName || '').toLowerCase().trim();
                  const playerLastName = playerNameLower.split(' ').pop();
                  const memberLastName = displayLower.split(' ').pop();
                  return playerLastName === memberLastName;
                });
              }

              // If only one member on account, use it (single-member accounts)
              if (!member && members.length === 1) {
                member = members[0];
                logger.debug(
                  'ApiService',
                  `[${traceId}] Using only member on account: ${member.displayName}`
                );
              }

              // If multiple members and no match, prefer primary member with warning
              if (!member && members.length > 1) {
                const primaryMember = members.find((m) => m.isPrimary);
                if (primaryMember) {
                  logger.warn(
                    'ApiService',
                    `[${traceId}] Name mismatch! Player "${player.name}" not found in account members. Using primary: "${primaryMember.displayName}"`
                  );
                  member = primaryMember;
                } else {
                  logger.error(
                    'ApiService',
                    `[${traceId}] Name mismatch! Player "${player.name}" not found in`,
                    members.map((m) => m.displayName)
                  );
                  throw new Error(
                    `Could not match "${player.name}" to any member on account ${memberNumber}. Available: ${members.map((m) => m.displayName).join(', ')}`
                  );
                }
              }

              if (member) {
                memberId = member.id;
                accountId = member.accountId;
                logger.debug(
                  'ApiService',
                  `[${traceId}] Matched: "${player.name}" -> "${member.displayName}" (${memberId})`
                );
              }
            } catch (e) {
              logger.error('ApiService', 'Error looking up member', e);
              throw e; // Re-throw to prevent wrong member assignment
            }
          }
        }

        // Fallback: search by name
        if (!memberId || !accountId) {
          try {
            const searchName = player.name || player.displayName;
            if (searchName) {
              logger.debug('ApiService', `Searching by name: ${searchName}`);
              const result = await api.getMembers(searchName);
              const members = normalizeAccountMembers(result.members);
              const member = members.find(
                (m) => m.displayName?.toLowerCase() === searchName.toLowerCase()
              );
              if (member) {
                memberId = member.id;
                accountId = member.accountId;
                logger.debug('ApiService', `Found by name: ${searchName} -> ${memberId}`);
              }
            }
          } catch (e) {
            logger.error('ApiService', 'Error searching by name', e);
          }
        }

        if (!memberId || !accountId) {
          logger.error('ApiService', 'Could not resolve member', player);
          throw new Error(
            `Could not find member in database: ${player.name} (${player.memberNumber || player.id})`
          );
        }

        return {
          type: 'member',
          member_id: memberId,
          account_id: accountId,
        };
      })
    );

    // Handle guests needing account
    const memberWithAccount = participants.find((p) => p.type === 'member' && p.account_id);
    if (memberWithAccount) {
      participants.forEach((p) => {
        if (p.account_id === '__NEEDS_ACCOUNT__') {
          p.account_id = memberWithAccount.account_id;
        }
      });
    }

    const groupType =
      options.type || options.groupType || (participants.length <= 2 ? 'singles' : 'doubles');

    logger.debug('ApiService', 'Calling API with', { groupType, participants });

    try {
      const result = await api.joinWaitlist(groupType, participants);
      logger.debug('ApiService', 'API response', JSON.stringify(result, null, 2));

      // Refresh waitlist and log it
      await refreshWaitlist();
      logger.debug(
        'ApiService',
        `Waitlist after refresh: ${getWaitlistData()?.waitlist?.length} entries`
      );

      // Extract position from API response
      const position = result.waitlist?.position || 1;
      logger.debug('ApiService', `Extracted position: ${position}`);

      return {
        success: true,
        waitlist: result.waitlist,
        position: position,
      };
    } catch (error) {
      logger.error('ApiService', 'API error', error);
      throw error;
    }
  }

  async function assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    // If passed an index (legacy), look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    // Get court ID from court number
    const courts = await courtsService.getAllCourts();
    const court = courts.find((c) => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    const result = await api.assignFromWaitlist(waitlistId, court.id, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh both
    await Promise.all([courtsService.refreshCourtData(), refreshWaitlist()]);

    return {
      success: true,
      session: result.session,
    };
  }

  return {
    refreshWaitlist,
    getWaitlist,
    removeFromWaitlist,
    addToWaitlist,
    assignFromWaitlist,
  };
}
