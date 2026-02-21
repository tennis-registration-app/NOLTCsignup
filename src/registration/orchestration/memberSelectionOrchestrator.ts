/**
 * Member Selection Orchestrators
 * Moved from App.jsx
 */

import { logger } from '../../lib/logger.js';
import {
  ALREADY_IN_GROUP,
  ALREADY_ON_COURT,
  ALREADY_ON_WAITLIST,
  COURT_READY,
} from '../../shared/constants/toastMessages.js';
import { toast } from '../../shared/utils/toast.js';
import type { RegistrationConstants, TennisBackendShape } from '../../types/appTypes.js';

export interface SuggestionClickDeps {
  // Read values
  currentGroup: any[];
  // Setters
  setSearchInput: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setMemberNumber: (v: string) => void;
  setCurrentMemberId: (v: string) => void;
  setRegistrantStreak: (v: number) => void;
  setStreakAcknowledged: (v: boolean) => void;
  setCurrentGroup: (v: any[]) => void;
  setCurrentScreen: (screen: string, reason: string) => void;
  // Services/helpers
  backend: Pick<TennisBackendShape, 'directory'>;
  fetchFrequentPartners: (memberId: string) => void;
  isPlayerAlreadyPlaying: (id: string) => {
    isPlaying: boolean;
    location?: string;
    courtNumber?: number;
    position?: number;
    playerName?: string;
  };
  guardAddPlayerEarly: (getCourtData: () => any, member: any) => boolean;
  getCourtData: () => any;
  getAvailableCourts: (includeBlocked: boolean) => any[];
  showAlertMessage: (msg: string) => void;
}

export async function handleSuggestionClickOrchestrated(
  suggestion: any,
  deps: SuggestionClickDeps
): Promise<void> {
  const {
    // Read values
    currentGroup,
    // Setters
    setSearchInput,
    setShowSuggestions,
    setMemberNumber,
    setCurrentMemberId,
    setRegistrantStreak,
    setStreakAcknowledged,
    setCurrentGroup,
    setCurrentScreen,
    // Services/helpers
    backend,
    fetchFrequentPartners,
    isPlayerAlreadyPlaying,
    guardAddPlayerEarly,
    getCourtData,
    getAvailableCourts,
    showAlertMessage,
  } = deps;

  // ===== ORIGINAL FUNCTION BODY (VERBATIM) =====
  // Validate member number exists and is valid
  if (!suggestion || !suggestion.memberNumber || !suggestion.member) {
    showAlertMessage('Invalid member selection. Please try again.');
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // Block selection if player is already on a court
  const memberId = suggestion.member?.id;
  if (memberId) {
    const playerStatus = isPlayerAlreadyPlaying(memberId);
    if (playerStatus.isPlaying && playerStatus.location === 'court') {
      const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
      toast(ALREADY_ON_COURT(playerName, playerStatus.courtNumber), {
        type: 'warning',
      });
      setSearchInput('');
      setShowSuggestions(false);
      // FEEDBACK: toast provides user feedback above
      return;
    }
  }

  // API member already has correct id (UUID) and accountId
  const enrichedMember = {
    id: suggestion.member.id, // UUID from API
    name: suggestion.member.name,
    memberNumber: suggestion.memberNumber,
    accountId: suggestion.member.accountId,
    memberId: suggestion.member.id, // Same as id for API members
    unclearedStreak: suggestion.member.unclearedStreak || 0,
    phone: suggestion.member.phone,
    ranking: suggestion.member.ranking,
    winRate: suggestion.member.winRate,
  };

  logger.debug('MemberSelection', '[handleSuggestionClick] suggestion.member', suggestion.member);
  logger.debug('MemberSelection', '[handleSuggestionClick] enrichedMember', enrichedMember);
  logger.debug(
    'MemberSelection',
    '[handleSuggestionClick] unclearedStreak',
    enrichedMember?.unclearedStreak
  );

  // Early duplicate guard - if player is already playing/waiting, stop here
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setSearchInput('');
    setShowSuggestions(false);
    // FEEDBACK: guardAddPlayerEarly shows toast — don't navigate to group screen
    return;
  }

  const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);

  // Check if this player is on waitlist - show helpful message and block
  if (playerStatus.isPlaying && playerStatus.location === 'waiting') {
    const availableCourts = getAvailableCourts(false);
    const hasCourtReady =
      (playerStatus.position === 1 && availableCourts.length > 0) ||
      (playerStatus.position === 2 && availableCourts.length >= 2);

    if (hasCourtReady) {
      // Court is available for this waitlist player - direct them to use the CTA button
      toast(COURT_READY, { type: 'info' });
    } else {
      // Player is on waitlist but no court available yet
      const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
      toast(ALREADY_ON_WAITLIST(playerName, playerStatus.position), {
        type: 'warning',
      });
    }
    setSearchInput('');
    setShowSuggestions(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Don't set member number if player is engaged elsewhere
  // This prevents navigation to group screen

  // Set member number and member ID now that we know player can proceed
  setMemberNumber(suggestion.memberNumber);
  setCurrentMemberId(suggestion.member.id);

  // Pre-fetch frequent partners (fire-and-forget)
  fetchFrequentPartners(suggestion.member.id);

  // Normal flow for new players - we already checked conflicts above
  setSearchInput('');
  setShowSuggestions(false);

  // Add player to current group - include all API data for proper backend lookup
  const newPlayer = {
    name: enrichedMember.name,
    memberNumber: suggestion.memberNumber,
    id: enrichedMember.id,
    memberId: enrichedMember.memberId || enrichedMember.id,
    phone: enrichedMember.phone || '',
    ranking: enrichedMember.ranking || null,
    winRate: enrichedMember.winRate || 0.5,
    // API-specific fields
    accountId: enrichedMember.accountId,
  };
  logger.debug('MemberSelection', 'Adding player to group', newPlayer);

  // Track registrant's uncleared streak (first player added is the registrant)
  // Fetch fresh member data to get current streak (cached apiMembers may be stale)
  if (currentGroup.length === 0) {
    // Set defaults immediately
    setRegistrantStreak(0);
    setStreakAcknowledged(false);

    // Fetch fresh streak in background (fire-and-forget)
    (async () => {
      let currentStreak = 0;
      try {
        // Invalidate cache to ensure fresh data
        backend.directory.invalidateAccount(suggestion.memberNumber);
        const freshMemberData = await backend.directory.getMembersByAccount(
          suggestion.memberNumber
        );
        const freshMember = freshMemberData?.find((m: any) => m.id === suggestion.member.id);
        // Primary: camelCase (normalized). Fallback: snake_case (raw API, pre-normalization safety net)
        currentStreak = freshMember?.unclearedStreak || (freshMember as unknown as Record<string, unknown>)?.uncleared_streak as number || 0;
        logger.debug('MemberSelection', 'Fresh member data', freshMember);
        logger.debug('MemberSelection', 'Registrant streak (fresh)', currentStreak);
      } catch (error) {
        logger.error('MemberSelection', 'Failed to fetch fresh streak, using cached', error);
        currentStreak = enrichedMember.unclearedStreak || 0;
      }
      setRegistrantStreak(currentStreak);
    })();
  }

  setCurrentGroup([...currentGroup, newPlayer]);

  setCurrentScreen('group', 'handleSuggestionClick');
  // ===== END ORIGINAL FUNCTION BODY =====
}

export interface AddPlayerSuggestionClickDeps {
  // Read values
  currentGroup: any[];
  // Setters
  setAddPlayerSearch: (v: string) => void;
  setShowAddPlayer: (v: boolean) => void;
  setShowAddPlayerSuggestions: (v: boolean) => void;
  setCurrentGroup: (v: any[]) => void;
  setHasWaitlistPriority: (v: boolean) => void;
  setAlertMessage: (v: string) => void;
  setShowAlert: (v: boolean) => void;
  // Services/helpers
  guardAddPlayerEarly: (getCourtData: () => any, member: any) => boolean;
  guardAgainstGroupDuplicate: (member: any, group: any[]) => boolean;
  isPlayerAlreadyPlaying: (id: string) => {
    isPlaying: boolean;
    location?: string;
    position?: number;
    playerName?: string;
    courtNumber?: number;
  };
  getAvailableCourts: (includeBlocked: boolean) => any[];
  getCourtData: () => any;
  saveCourtData: (data: any) => void;
  findMemberNumber: (memberId: string) => string;
  showAlertMessage: (msg: string) => void;
  CONSTANTS: RegistrationConstants;
}

export async function handleAddPlayerSuggestionClickOrchestrated(
  suggestion: any,
  deps: AddPlayerSuggestionClickDeps
): Promise<void> {
  const {
    // Read values
    currentGroup,
    // Setters
    setAddPlayerSearch,
    setShowAddPlayer,
    setShowAddPlayerSuggestions,
    setCurrentGroup,
    setHasWaitlistPriority,
    setAlertMessage,
    setShowAlert,
    // Services/helpers
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
    isPlayerAlreadyPlaying,
    getAvailableCourts,
    getCourtData,
    saveCourtData,
    findMemberNumber,
    showAlertMessage,
    CONSTANTS,
  } = deps;

  // ===== ORIGINAL FUNCTION BODY (VERBATIM) =====
  // Validate suggestion
  if (!suggestion || !suggestion.member || !suggestion.member.id) {
    showAlertMessage('Invalid player selection. Please try again.');
    // FEEDBACK: alert provides user feedback above
    return;
  }

  // API member already has correct data
  const enrichedMember = {
    id: suggestion.member.id,
    name: suggestion.member.name,
    memberNumber: suggestion.memberNumber,
    accountId: suggestion.member.accountId,
    memberId: suggestion.member.id,
    phone: suggestion.member.phone,
    ranking: suggestion.member.ranking,
    winRate: suggestion.member.winRate,
  };

  // Early duplicate guard
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    // FEEDBACK: guardAddPlayerEarly shows toast
    return;
  }

  // Check for duplicate in current group
  if (!guardAgainstGroupDuplicate(enrichedMember, currentGroup)) {
    toast(ALREADY_IN_GROUP(enrichedMember.name), { type: 'warning' });
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    // FEEDBACK: toast provides user feedback above
    return;
  }

  // Check if player is already playing or on waitlist
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    // FEEDBACK: guardAddPlayerEarly shows toast
    return;
  }

  const playerStatus = isPlayerAlreadyPlaying(suggestion.member.id);

  if (
    playerStatus.isPlaying &&
    playerStatus.location === 'waiting' &&
    playerStatus.position === 1
  ) {
    const data = getCourtData();
    const availCourts = getAvailableCourts(false);

    if (availCourts.length > 0) {
      const firstWaitlistEntry = data.waitlist[0];
      // Domain: entry.group.players
      const players = firstWaitlistEntry.group?.players || [];
      setCurrentGroup(
        players.map((p: any) => ({
          id: p.memberId,
          name: p.displayName || 'Unknown',
          memberNumber: findMemberNumber(p.memberId),
        }))
      );

      setHasWaitlistPriority(true);

      data.waitlist.shift();
      saveCourtData(data);

      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
      // EARLY-EXIT: waitlist priority transfer complete — group updated
      return;
    }
  }

  if (!playerStatus.isPlaying) {
    // Validate we're not exceeding max players
    if (currentGroup.length >= CONSTANTS.MAX_PLAYERS) {
      showAlertMessage(`Group is full (max ${CONSTANTS.MAX_PLAYERS} players)`);
      setAddPlayerSearch('');
      setShowAddPlayer(false);
      setShowAddPlayerSuggestions(false);
      // FEEDBACK: alert provides user feedback above
      return;
    }

    const newPlayer = {
      name: enrichedMember.name,
      memberNumber: suggestion.memberNumber,
      id: enrichedMember.id,
      memberId: enrichedMember.memberId || enrichedMember.id,
      phone: enrichedMember.phone || '',
      ranking: enrichedMember.ranking || null,
      winRate: enrichedMember.winRate || 0.5,
      accountId: enrichedMember.accountId,
    };
    logger.debug('MemberSelection', 'Adding player to group (add player flow)', newPlayer);
    setCurrentGroup([...currentGroup, newPlayer]);
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
  } else {
    let message = '';
    if (playerStatus.location === 'court') {
      message = `${playerStatus.playerName} is already playing on Court ${playerStatus.courtNumber}`;
    } else if (playerStatus.location === 'waiting') {
      message = `${playerStatus.playerName} is already in a group waiting for a court`;
    } else if (playerStatus.location === 'current') {
      message = `${playerStatus.playerName} is already in your group`;
    }
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), CONSTANTS.ALERT_DISPLAY_MS);
  }
  // ===== END ORIGINAL FUNCTION BODY =====
}
