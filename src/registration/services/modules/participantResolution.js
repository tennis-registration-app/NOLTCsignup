import { normalizeServiceError } from '@lib/errors';

/**
 * Participant resolution helper extracted from courtsService and waitlistService.
 *
 * Profiled extraction preserving exact behavior divergences.
 *
 * Each caller passes a profile that controls the specific behavioral differences.
 */

/**
 * Profile for courtsService.assignCourt behavior
 */
export const COURTS_PROFILE = {
  isUuid: (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  onLookupError: 'warn-and-continue',
  nameFallback: 'first-member-if-no-exact',
  includeChargedToAccountId: true,
  finalErrorMessage: () => 'Could not determine account_id for participant',
  memberIdFallback: 'memberUuid-or-playerId',
};

/**
 * Profile for waitlistService.addToWaitlist behavior
 */
export const WAITLIST_PROFILE = {
  isUuid: (id) => id && id.includes && id.includes('-') && id.length > 30,
  onLookupError: 'rethrow',
  nameFallback: 'exact-only',
  includeChargedToAccountId: false,
  finalErrorMessage: (ctx) =>
    `Could not find member in database: ${ctx.name} (${ctx.memberNumber || ctx.id})`,
  memberIdFallback: 'memberId-only',
};

/**
 * Resolve players input into the canonical participants array used by API calls.
 *
 * @param {Array} players - Array of player objects to resolve
 * @param {Object} deps - Dependencies
 * @param {Object} deps.api - API adapter
 * @param {Object} deps.logger - Logger instance
 * @param {Function} deps.normalizeAccountMembers - Normalizer function
 * @param {Object} profile - Behavior profile (COURTS_PROFILE or WAITLIST_PROFILE)
 * @param {Object} [options] - Additional options
 * @param {string} [options.traceId] - Trace ID for logging (waitlist style)
 * @returns {Promise<{ participants: Array, groupType: string }>}
 */
export async function resolveParticipants(players, deps, profile, options = {}) {
  try {
    const { api, logger, normalizeAccountMembers } = deps;
    const traceId = options.traceId || '';
    const logPrefix = traceId ? `[${traceId}] ` : '';

    const participants = await Promise.all(
      players.map(async (player, idx) => {
        logger.debug(
          'ApiService',
          `${logPrefix}Processing player${idx !== undefined ? `[${idx}]` : ''}: name="${player.name}", id="${player.id}", memberNumber="${player.memberNumber}"`
        );

        // Check if this is a guest - handle early for waitlist profile
        if (player.isGuest || player.type === 'guest') {
          const guestResult = {
            type: 'guest',
            guest_name: player.name || player.displayName || player.guest_name || 'Guest',
            account_id: '__NEEDS_ACCOUNT__',
          };
          if (profile.includeChargedToAccountId) {
            guestResult.charged_to_account_id = '__NEEDS_ACCOUNT__';
          }
          return guestResult;
        }

        let memberId = null;
        let accountId = player.accountId || player.billingAccountId || null;

        // Check if player already has a valid UUID
        const playerId = player.id || player.memberId || player.member_id;
        const isUuid = profile.isUuid(playerId);

        if (isUuid) {
          memberId = playerId;
          if (!accountId) {
            accountId = player.accountId;
          }
          logger.debug('ApiService', `${logPrefix}Player ID is already a UUID`, memberId);
        }

        // If we have a memberNumber, use it to look up the member
        const memberNumber = player.memberNumber || player.clubNumber || player.id;
        if (memberNumber && (!accountId || !memberId)) {
          try {
            logger.debug(
              'ApiService',
              `${logPrefix}Looking up by memberNumber: ${memberNumber}, player.name: "${player.name}"`
            );
            const result = await api.getMembersByAccount(String(memberNumber));
            const members = normalizeAccountMembers(result.members);
            logger.debug(
              'ApiService',
              `${logPrefix}Found ${members.length} members for account`,
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
                logger.debug(
                  'ApiService',
                  `${logPrefix}Using only member on account: ${member.displayName}`
                );
              }

              // If multiple members and no match, use primary with warning
              if (!member && members.length > 1) {
                const primaryMember = members.find((m) => m.isPrimary);
                if (primaryMember) {
                  logger.warn(
                    'ApiService',
                    `${logPrefix}Name mismatch! Player "${player.name}" not found. Using primary: "${primaryMember.displayName}"`
                  );
                  member = primaryMember;
                } else if (profile.onLookupError === 'rethrow') {
                  // waitlist profile throws when no primary found
                  logger.error(
                    'ApiService',
                    `${logPrefix}Name mismatch! Player "${player.name}" not found in`,
                    members.map((m) => m.displayName)
                  );
                  throw new Error(
                    `Could not match "${player.name}" to any member on account ${memberNumber}. Available: ${members.map((m) => m.displayName).join(', ')}`
                  );
                }
              }

              if (member) {
                if (!accountId) accountId = member.accountId;
                if (!memberId) memberId = member.id;
                logger.debug(
                  'ApiService',
                  `${logPrefix}Matched: "${player.name}" -> "${member.displayName}" (${member.id})`
                );
              }
            }
          } catch (e) {
            if (profile.onLookupError === 'rethrow') {
              logger.error('ApiService', `${logPrefix}Error looking up member`, e);
              throw e;
            } else {
              logger.warn('ApiService', `${logPrefix}Could not look up member by memberNumber`, e);
            }
          }
        }

        // Fallback: search by name
        if (!memberId || !accountId) {
          const searchName = player.name || player.displayName;
          if (searchName) {
            try {
              logger.debug('ApiService', `${logPrefix}Searching by name: ${searchName}`);
              const result = await api.getMembers(searchName);
              logger.debug('ApiService', `${logPrefix}getMembers result`, JSON.stringify(result));

              if (result.members && result.members.length > 0) {
                const members = normalizeAccountMembers(result.members);
                const normalizedSearch = searchName.toLowerCase().trim();

                let member;
                if (profile.nameFallback === 'first-member-if-no-exact') {
                  // courtsService: exact match or first member
                  member =
                    members.find((m) => m.displayName?.toLowerCase().trim() === normalizedSearch) ||
                    members[0];
                } else {
                  // waitlistService: exact match only
                  member = members.find(
                    (m) => m.displayName?.toLowerCase().trim() === normalizedSearch
                  );
                }

                if (member) {
                  if (!accountId) accountId = member.accountId;
                  if (!memberId) memberId = member.id;
                  logger.debug(
                    'ApiService',
                    `${logPrefix}Found by name: ${member.displayName}, UUID: ${member.id}, account: ${member.accountId}`
                  );
                }
              }
            } catch (e) {
              if (profile.onLookupError === 'rethrow') {
                logger.error('ApiService', `${logPrefix}Error searching by name`, e);
              } else {
                logger.warn('ApiService', `${logPrefix}Could not look up member by name`, e);
              }
            }
          }
        }

        // Final validation for waitlist profile
        if (profile.onLookupError === 'rethrow' && (!memberId || !accountId)) {
          logger.error('ApiService', `${logPrefix}Could not resolve member`, player);
          throw new Error(profile.finalErrorMessage(player));
        }

        // Build member result
        let finalMemberId;
        if (profile.memberIdFallback === 'memberUuid-or-playerId') {
          finalMemberId = memberId || playerId;
        } else {
          finalMemberId = memberId;
        }

        return {
          type: 'member',
          member_id: finalMemberId,
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
        if (profile.includeChargedToAccountId && p.charged_to_account_id === '__NEEDS_ACCOUNT__') {
          p.charged_to_account_id = memberWithAccount.account_id;
        }
      });
    }

    // Final validation for courts profile
    if (profile.onLookupError !== 'rethrow') {
      const missingAccountId = participants.find(
        (p) => !p.account_id || p.account_id === '__NEEDS_ACCOUNT__'
      );
      if (missingAccountId) {
        logger.error('ApiService', 'Participant missing account_id', missingAccountId);
        throw new Error(profile.finalErrorMessage(missingAccountId));
      }
    }

    // Determine group type
    const groupType = participants.length <= 3 ? 'singles' : 'doubles';

    return { participants, groupType };
  } catch (e) {
    throw normalizeServiceError(e, { service: 'participantResolution', op: 'resolveParticipants' });
  }
}
