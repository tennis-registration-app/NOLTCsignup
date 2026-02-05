import { normalizeAccountMembers } from '@lib/normalize/normalizeMember.js';

/**
 * Courts operations extracted from ApiTennisService.
 * Cache remains on ApiTennisService instance via accessors.
 *
 * WP5-D1: Safe read/refresh slice.
 * WP5-D5: Added clearCourt mutation.
 * WP5-D6: Added assignCourt mutation.
 *
 * @param {Object} deps
 * @param {Object} deps.api - ApiAdapter instance
 * @param {Function} deps.notifyListeners - Notify change listeners
 * @param {Function} deps.transformCourts - Transform API courts to legacy format
 * @param {Function} deps.getCourtData - Get cached court data
 * @param {Function} deps.setCourtData - Set cached court data
 * @param {Object} deps.logger - Logger instance
 */
export function createCourtsService({
  api,
  notifyListeners,
  transformCourts,
  getCourtData,
  setCourtData,
  logger,
}) {
  async function refreshCourtData() {
    try {
      const courtData = await api.getCourtStatus(true);
      setCourtData(courtData);
      notifyListeners('courts');
      return transformCourts(courtData.courts);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh court data', error);
      throw error;
    }
  }

  async function getAllCourts() {
    if (!getCourtData()) {
      await refreshCourtData();
    }
    return transformCourts(getCourtData().courts);
  }

  async function getAvailableCourts() {
    if (!getCourtData()) {
      await refreshCourtData();
    }
    return transformCourts(getCourtData().courts).filter((c) => c.isAvailable);
  }

  async function getCourtByNumber(courtNumber) {
    const courts = await getAllCourts();
    return courts.find((c) => c.number === courtNumber);
  }

  async function clearCourt(courtNumber, options = {}) {
    const courts = await getAllCourts();
    const court = courts.find((c) => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Map legacy clearReason to valid API end_reason values
    // Valid API values: 'completed', 'cleared_early', 'admin_override'
    const legacyReason = options.clearReason || options.reason || '';
    let endReason = 'completed';

    if (legacyReason) {
      const reasonLower = String(legacyReason).toLowerCase();
      if (
        reasonLower.includes('early') ||
        reasonLower.includes('left') ||
        reasonLower.includes('done') ||
        reasonLower === 'cleared'
      ) {
        endReason = 'cleared_early';
      } else if (reasonLower.includes('observed') || reasonLower.includes('empty')) {
        endReason = 'completed';
      } else if (
        reasonLower.includes('admin') ||
        reasonLower.includes('override') ||
        reasonLower.includes('force')
      ) {
        endReason = 'admin_override';
      }
    }

    logger.debug(
      'ApiService',
      `Clearing court ${courtNumber} with reason: ${endReason} (legacy: ${legacyReason})`
    );

    const result = await api.endSessionByCourt(court.id, endReason);

    // Refresh court data
    await refreshCourtData();

    return {
      success: true,
      session: result.session,
    };
  }

  async function assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
    // Handle legacy format: assignCourt(courtNumber, group, duration)
    // where group = { players: [...], guests: number }
    let players;
    let options = {};

    if (playersOrGroup && playersOrGroup.players && Array.isArray(playersOrGroup.players)) {
      // Legacy format: { players: [...], guests: number }
      players = playersOrGroup.players;

      // Duration passed as third argument
      if (typeof optionsOrDuration === 'number') {
        options = { duration: optionsOrDuration };
      } else {
        options = optionsOrDuration || {};
      }
    } else if (Array.isArray(playersOrGroup)) {
      // New format: array of players directly
      players = playersOrGroup;
      options = optionsOrDuration || {};
    } else {
      throw new Error('Invalid players format');
    }

    // Log player data for debugging
    logger.debug('ApiService', 'Players to assign', JSON.stringify(players, null, 2));

    // Find the court ID from court number
    const courts = await getAllCourts();
    const court = courts.find((c) => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    // Transform players to API format
    const participants = await Promise.all(
      players.map(async (player) => {
        logger.debug('ApiService', 'Processing player', JSON.stringify(player));

        // Try to get accountId and member UUID from various sources
        let accountId = player.accountId || player.billingAccountId;
        let memberUuid = null;

        // Check if player already has a valid UUID (36 chars with dashes)
        const playerId = player.id || player.memberId || player.member_id;
        const isUuid =
          playerId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);

        if (isUuid) {
          memberUuid = playerId;
          logger.debug('ApiService', 'Player ID is already a UUID', memberUuid);
        }

        // If we have a memberNumber, use it to look up the member
        const memberNumber = player.memberNumber || player.clubNumber;
        if (memberNumber && (!accountId || !memberUuid)) {
          try {
            logger.debug(
              'ApiService',
              `Looking up by memberNumber: ${memberNumber}, player.name: "${player.name}"`
            );
            const result = await api.getMembersByAccount(String(memberNumber));
            const members = normalizeAccountMembers(result.members);
            logger.debug(
              'ApiService',
              `Found ${members.length} members for account`,
              members.map((m) => m.displayName)
            );

            if (members.length > 0) {
              const playerNameLower = (player.name || '').toLowerCase().trim();
              let member = null;

              // Try exact match first (case-insensitive)
              member = members.find((m) => m.displayName?.toLowerCase().trim() === playerNameLower);

              // Try partial match (player name contains or is contained in displayName)
              if (!member) {
                member = members.find((m) => {
                  const displayLower = (m.displayName || '').toLowerCase().trim();
                  return (
                    displayLower.includes(playerNameLower) || playerNameLower.includes(displayLower)
                  );
                });
              }

              // Try matching by last name only
              if (!member && playerNameLower) {
                member = members.find((m) => {
                  const displayLower = (m.displayName || '').toLowerCase().trim();
                  const playerLastName = playerNameLower.split(' ').pop();
                  const memberLastName = displayLower.split(' ').pop();
                  return playerLastName === memberLastName;
                });
              }

              // If only one member on account, use it
              if (!member && members.length === 1) {
                member = members[0];
                logger.debug('ApiService', `Using only member on account: ${member.displayName}`);
              }

              // If multiple members and no match, use primary with warning
              if (!member && members.length > 1) {
                const primaryMember = members.find((m) => m.isPrimary);
                if (primaryMember) {
                  logger.warn(
                    'ApiService',
                    `Name mismatch! Player "${player.name}" not found. Using primary: "${primaryMember.displayName}"`
                  );
                  member = primaryMember;
                }
              }

              if (member) {
                if (!accountId) accountId = member.accountId;
                if (!memberUuid) memberUuid = member.id;
                logger.debug(
                  'ApiService',
                  `Matched: "${player.name}" -> "${member.displayName}" (${member.id})`
                );
              }
            }
          } catch (e) {
            logger.warn('ApiService', 'Could not look up member by memberNumber', e);
          }
        }

        // If still no accountId, try searching by name
        if (!accountId || !memberUuid) {
          const searchName = player.name || player.displayName;
          if (searchName) {
            try {
              logger.debug('ApiService', `Searching by name: ${searchName}`);
              const result = await api.getMembers(searchName);
              logger.debug('ApiService', 'getMembers result', JSON.stringify(result));

              if (result.members && result.members.length > 0) {
                // Find exact match by name - normalize for consistent access
                const members = normalizeAccountMembers(result.members);
                const normalizedSearch = searchName.toLowerCase().trim();
                const member =
                  members.find((m) => m.displayName?.toLowerCase().trim() === normalizedSearch) ||
                  members[0];

                if (member) {
                  if (!accountId) accountId = member.accountId;
                  if (!memberUuid) memberUuid = member.id;
                  logger.debug(
                    'ApiService',
                    `Found by name: ${member.displayName}, UUID: ${member.id}, account: ${member.accountId}`
                  );
                }
              }
            } catch (e) {
              logger.warn('ApiService', 'Could not look up member by name', e);
            }
          }
        }

        if (player.isGuest || player.type === 'guest') {
          // For guests, we need an account to charge - use the first member's account
          // This will be set after we process all participants
          return {
            type: 'guest',
            guest_name: player.name || player.displayName || player.guest_name || 'Guest',
            account_id: accountId || '__NEEDS_ACCOUNT__',
            charged_to_account_id: accountId || '__NEEDS_ACCOUNT__',
          };
        } else {
          return {
            type: 'member',
            member_id: memberUuid || playerId, // Use looked-up UUID or fall back to original
            account_id: accountId,
          };
        }
      })
    );

    // Find a valid account_id from members for any guests that need it
    const memberWithAccount = participants.find((p) => p.type === 'member' && p.account_id);
    if (memberWithAccount) {
      participants.forEach((p) => {
        if (p.account_id === '__NEEDS_ACCOUNT__') {
          p.account_id = memberWithAccount.account_id;
        }
        if (p.charged_to_account_id === '__NEEDS_ACCOUNT__') {
          p.charged_to_account_id = memberWithAccount.account_id;
        }
      });
    }

    // Final validation
    const missingAccountId = participants.find(
      (p) => !p.account_id || p.account_id === '__NEEDS_ACCOUNT__'
    );
    if (missingAccountId) {
      logger.error('ApiService', 'Participant missing account_id', missingAccountId);
      throw new Error('Could not determine account_id for participant');
    }

    logger.debug('ApiService', 'Transformed participants', JSON.stringify(participants, null, 2));

    // Determine session type
    const sessionType =
      options.type || options.sessionType || (participants.length <= 2 ? 'singles' : 'doubles');

    const result = await api.assignCourt(court.id, sessionType, participants, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh court data
    await refreshCourtData();

    return {
      success: true,
      session: result.session,
      court: courtNumber,
    };
  }

  return {
    refreshCourtData,
    getAllCourts,
    getAvailableCourts,
    getCourtByNumber,
    clearCourt,
    assignCourt,
  };
}
