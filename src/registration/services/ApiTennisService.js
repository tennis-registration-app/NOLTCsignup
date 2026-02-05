/**
 * ApiTennisService - Backend-connected data service for Registration app
 *
 * This service provides the same interface as the localStorage-based service
 * but uses the backend API for all operations.
 */

import { ApiAdapter } from '@lib/ApiAdapter.js';
import { getRealtimeClient } from '@lib/RealtimeClient.js';
import { formatCourtTime } from '@lib/dateUtils.js';
import { logger } from '../../lib/logger.js';
import { normalizeAccountMembers } from '@lib/normalize/normalizeMember.js';
import { createCourtsService } from './modules/courtsService.js';

/**
 * ApiTennisService
 *
 * WP7.1: This service is being refactored to extract legacy transformation
 * logic into src/registration/services/legacy/ modules.
 *
 * Public method surface and return shapes will remain unchanged.
 * Canonical shape documentation will be added after extraction (WP7.1.5).
 */

class ApiTennisService {
  constructor(options = {}) {
    this.api = new ApiAdapter({
      deviceId: options.deviceId || 'a0000000-0000-0000-0000-000000000001',
      deviceType: options.deviceType || 'kiosk',
    });

    this.listeners = new Set();
    this.courtData = null;
    this.waitlistData = null;
    this.membersCache = null;
    this.settings = null;

    // Get realtime client
    this.realtimeClient = getRealtimeClient({ debug: options.debug || false });

    // Wire courts service module (WP5-D1)
    this.courtsService = createCourtsService({
      api: this.api,
      notifyListeners: this._notifyListeners.bind(this),
      transformCourts: this._transformCourts.bind(this),
      getCourtData: () => this.courtData,
      setCourtData: (v) => {
        this.courtData = v;
      },
      logger,
    });

    // Start realtime subscriptions
    this._setupRealtime();
  }

  // ===========================================
  // Realtime Setup
  // ===========================================

  _setupRealtime() {
    this.realtimeClient.onSessionChange(() => {
      this._notifyListeners('sessions');
      this.refreshCourtData();
    });

    this.realtimeClient.onWaitlistChange(() => {
      this._notifyListeners('waitlist');
      this.refreshWaitlist();
    });

    this.realtimeClient.onBlockChange(() => {
      this._notifyListeners('blocks');
      this.refreshCourtData();
    });
  }

  // ===========================================
  // Event Listeners
  // ===========================================

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(changeType) {
    this.listeners.forEach((cb) => {
      try {
        cb({ type: changeType, timestamp: Date.now() });
      } catch (e) {
        logger.error('ApiService', 'Listener error', e);
      }
    });
  }

  // ===========================================
  // Data Loading
  // ===========================================

  async loadInitialData() {
    try {
      const [courtStatus, waitlist, settings, members] = await Promise.all([
        this.api.getCourtStatus(),
        this.api.getWaitlist(),
        this.api.getSettings(),
        this.api.getMembers(),
      ]);

      this.courtData = courtStatus;
      this.waitlistData = waitlist;
      this.settings = settings;
      this.membersCache = members;

      return {
        courts: this._transformCourts(courtStatus.courts),
        waitlist: this._transformWaitlist(waitlist.waitlist),
        settings: settings.settings,
        operatingHours: settings.operating_hours,
        members: members.members,
      };
    } catch (error) {
      logger.error('ApiService', 'Failed to load initial data', error);
      throw error;
    }
  }

  async refreshCourtData() {
    return this.courtsService.refreshCourtData();
  }

  async refreshWaitlist() {
    try {
      this.waitlistData = await this.api.getWaitlist();
      this._notifyListeners('waitlist');
      return this._transformWaitlist(this.waitlistData.waitlist);
    } catch (error) {
      logger.error('ApiService', 'Failed to refresh waitlist', error);
      throw error;
    }
  }

  // ===========================================
  // Data Transformers (API -> Legacy Format)
  // ===========================================

  _transformCourts(apiCourts) {
    if (!apiCourts) return [];

    return apiCourts.map((court) => {
      // Transform session data
      // Note: API returns participants as array of strings (names) or objects
      const session = court.session
        ? {
            id: court.session.id,
            type: court.session.type,
            players: (court.session.participants || []).map((p) => {
              // Handle both string (just name) and object formats
              if (typeof p === 'string') {
                return { id: null, name: p, isGuest: false };
              }
              return {
                id: p.member_id || p.id,
                name: p.display_name || p.guest_name || p.name,
                isGuest: p.type === 'guest',
              };
            }),
            startTime: new Date(court.session.started_at).getTime(),
            endTime: new Date(court.session.scheduled_end_at).getTime(),
            timeRemaining: (court.session.minutes_remaining || 0) * 60 * 1000,
            duration: court.session.duration_minutes,
            // Formatted times in Central Time for display
            startTimeFormatted: formatCourtTime(court.session.started_at),
            endTimeFormatted: formatCourtTime(court.session.scheduled_end_at),
          }
        : null;

      // Transform block data
      const block = court.block
        ? {
            id: court.block.id,
            type: court.block.type,
            title: court.block.title,
            reason: court.block.title,
            startTime: new Date(court.block.starts_at).getTime(),
            endTime: new Date(court.block.ends_at).getTime(),
            // Formatted times in Central Time for display
            startTimeFormatted: formatCourtTime(court.block.starts_at),
            endTimeFormatted: formatCourtTime(court.block.ends_at),
          }
        : null;

      // Determine court availability status
      // - isUnoccupied: No session AND no block - always selectable first
      // - isOvertime: Has session but time expired (timeRemaining <= 0) - selectable when no unoccupied
      // - isActive: Has session with time remaining - never selectable
      // - isBlocked: Has active block - never selectable
      const hasSession = !!court.session;
      const hasBlock = !!court.block;
      const timeRemaining = session?.timeRemaining || 0;

      const isUnoccupied = !hasSession && !hasBlock;
      const isOvertime = hasSession && timeRemaining <= 0;
      const isActive = hasSession && timeRemaining > 0;
      const isBlocked = hasBlock;

      logger.debug('ApiService', `Court ${court.court_number} transform`, {
        hasSession,
        hasBlock,
        apiMinutesRemaining: court.session?.minutes_remaining,
        transformedTimeRemaining: timeRemaining,
        isUnoccupied,
        isOvertime,
        isActive,
        isBlocked,
      });

      // Build legacy-compatible court object
      // Legacy UI expects: court.current.endTime, court.current.players, court.endTime
      return {
        number: court.court_number,
        id: court.court_id,
        name: court.court_name,
        status: court.status,
        // New availability flags
        isUnoccupied, // No session, no block - always selectable first
        isOvertime, // Has session but time expired - conditionally selectable
        isActive, // Has session with time remaining - never selectable
        isBlocked, // Has active block - never selectable
        // Legacy compatibility
        isAvailable: isUnoccupied, // Legacy: true if unoccupied (for backward compat)
        isOccupied: hasSession,
        // New API format
        session,
        block,
        // Legacy format compatibility
        current: session
          ? {
              players: session.players,
              startTime: session.startTime,
              endTime: session.endTime,
              duration: session.duration,
            }
          : null,
        // Also add top-level for some legacy code paths
        players: session?.players || [],
        startTime: session?.startTime || block?.startTime,
        endTime: session?.endTime || block?.endTime,
        blocked: block
          ? {
              startTime: block.startTime,
              endTime: block.endTime,
              reason: block.reason,
            }
          : null,
      };
    });
  }

  _transformWaitlist(apiWaitlist) {
    if (!apiWaitlist) return [];

    return apiWaitlist.map((entry) => ({
      id: entry.id,
      position: entry.position,
      type: entry.group_type,
      players: entry.participants || [],
      joinedAt: new Date(entry.joined_at).getTime(),
      waitTime: (entry.minutes_waiting || 0) * 60 * 1000,
    }));
  }

  // ===========================================
  // Court Operations
  // ===========================================

  async getAvailableCourts() {
    return this.courtsService.getAvailableCourts();
  }

  async getAllCourts() {
    return this.courtsService.getAllCourts();
  }

  async getCourtByNumber(courtNumber) {
    return this.courtsService.getCourtByNumber(courtNumber);
  }

  async assignCourt(courtNumber, playersOrGroup, optionsOrDuration = {}) {
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
    const courts = await this.getAllCourts();
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
            const result = await this.api.getMembersByAccount(String(memberNumber));
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
              const result = await this.api.getMembers(searchName);
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

    const result = await this.api.assignCourt(court.id, sessionType, participants, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh court data
    await this.refreshCourtData();

    return {
      success: true,
      session: result.session,
      court: courtNumber,
    };
  }

  async clearCourt(courtNumber, options = {}) {
    const courts = await this.getAllCourts();
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

    const result = await this.api.endSessionByCourt(court.id, endReason);

    // Refresh court data
    await this.refreshCourtData();

    return {
      success: true,
      session: result.session,
    };
  }

  // ===========================================
  // Ball Purchase Operations
  // ===========================================

  async purchaseBalls(sessionId, accountId, options = {}) {
    logger.debug('ApiService', `Purchasing balls for session: ${sessionId}, account: ${accountId}`);

    const result = await this.api.purchaseBalls(sessionId, accountId, {
      splitBalls: options.split || options.splitBalls || false,
      splitAccountIds: options.splitAccountIds || options.split_account_ids || null,
    });

    return {
      success: result.ok,
      transactions: result.transactions,
      totalCents: result.total_cents,
    };
  }

  // ===========================================
  // Waitlist Operations
  // ===========================================

  async getWaitlist() {
    if (!this.waitlistData) {
      await this.refreshWaitlist();
    }
    return this._transformWaitlist(this.waitlistData.waitlist);
  }

  async addToWaitlist(players, options = {}) {
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
              const result = await this.api.getMembersByAccount(String(memberNumber));
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
              const result = await this.api.getMembers(searchName);
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
      const result = await this.api.joinWaitlist(groupType, participants);
      logger.debug('ApiService', 'API response', JSON.stringify(result, null, 2));

      // Refresh waitlist and log it
      await this.refreshWaitlist();
      logger.debug(
        'ApiService',
        `Waitlist after refresh: ${this.waitlistData?.waitlist?.length} entries`
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

  async removeFromWaitlist(waitlistId) {
    // If passed an index (legacy), we need to look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await this.getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    await this.api.cancelWaitlist(waitlistId);

    // Refresh waitlist
    await this.refreshWaitlist();

    return {
      success: true,
    };
  }

  async assignFromWaitlist(waitlistId, courtNumber, options = {}) {
    // If passed an index (legacy), look up the actual ID
    if (typeof waitlistId === 'number') {
      const waitlist = await this.getWaitlist();
      const entry = waitlist[waitlistId];
      if (!entry) {
        throw new Error(`Waitlist entry at index ${waitlistId} not found`);
      }
      waitlistId = entry.id;
    }

    // Get court ID from court number
    const courts = await this.getAllCourts();
    const court = courts.find((c) => c.number === courtNumber);

    if (!court) {
      throw new Error(`Court ${courtNumber} not found`);
    }

    const result = await this.api.assignFromWaitlist(waitlistId, court.id, {
      addBalls: options.addBalls || options.balls || false,
      splitBalls: options.splitBalls || false,
    });

    // Refresh both
    await Promise.all([this.refreshCourtData(), this.refreshWaitlist()]);

    return {
      success: true,
      session: result.session,
    };
  }

  // ===========================================
  // Member Operations
  // ===========================================

  async searchMembers(query) {
    const result = await this.api.getMembers(query);
    return result.members || [];
  }

  async getMembersByAccount(memberNumber) {
    const result = await this.api.getMembersByAccount(memberNumber);
    return result.members || [];
  }

  async getAllMembers() {
    if (!this.membersCache) {
      const result = await this.api.getMembers();
      this.membersCache = result;
    }
    return this.membersCache.members || [];
  }

  // ===========================================
  // Settings
  // ===========================================

  async getSettings() {
    if (!this.settings) {
      this.settings = await this.api.getSettings();
    }
    return this.settings;
  }

  async refreshSettings() {
    this.settings = await this.api.getSettings(true);
    return this.settings;
  }

  // ===========================================
  // Cleanup
  // ===========================================

  destroy() {
    this.listeners.clear();
    this.realtimeClient.disconnect();
  }
}

// Export singleton factory
let instance = null;

export function getApiTennisService(options = {}) {
  if (!instance) {
    instance = new ApiTennisService(options);
  }
  return instance;
}

export function resetApiTennisService() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

export { ApiTennisService };
export default ApiTennisService;
