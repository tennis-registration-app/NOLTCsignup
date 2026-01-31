/**
 * Member Selection Orchestrators
 * Moved from App.jsx — WP5.5 facade extraction
 *
 * DEPENDENCY CHECKLIST for handleSuggestionClickOrchestrated:
 * Reads:
 *   - currentGroup
 *
 * Calls (setters):
 *   - setSearchInput
 *   - setShowSuggestions
 *   - setMemberNumber
 *   - setCurrentMemberId
 *   - setRegistrantStreak
 *   - setStreakAcknowledged
 *   - setCurrentGroup
 *   - setCurrentScreen
 *
 * Calls (services/helpers):
 *   - backend.directory.invalidateAccount
 *   - backend.directory.getMembersByAccount
 *   - fetchFrequentPartners
 *   - isPlayerAlreadyPlaying
 *   - guardAddPlayerEarly
 *   - getCourtData
 *   - getAvailableCourts
 *   - showAlertMessage
 *   - Tennis (global)
 *
 * Returns: void (same as original — may have early returns)
 */

/* global Tennis */

export async function handleSuggestionClickOrchestrated(suggestion, deps) {
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
    return;
  }

  // Block selection if player is already on a court
  const memberId = suggestion.member?.id;
  if (memberId) {
    const playerStatus = isPlayerAlreadyPlaying(memberId);
    if (playerStatus.isPlaying && playerStatus.location === 'court') {
      const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
      Tennis.UI.toast(`${playerName} is already on Court ${playerStatus.courtNumber}`, {
        type: 'error',
      });
      setSearchInput('');
      setShowSuggestions(false);
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
  };

  console.log('[handleSuggestionClick] suggestion.member:', suggestion.member);
  console.log('[handleSuggestionClick] enrichedMember:', enrichedMember);
  console.log('[handleSuggestionClick] unclearedStreak:', enrichedMember?.unclearedStreak);

  // Early duplicate guard - if player is already playing/waiting, stop here
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setSearchInput('');
    setShowSuggestions(false);
    return; // Don't navigate to group screen
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
      Tennis.UI.toast(`A court is ready for you! Tap the green button below.`, { type: 'info' });
    } else {
      // Player is on waitlist but no court available yet
      const playerName = suggestion.member?.displayName || suggestion.member?.name || 'Player';
      Tennis.UI.toast(
        `${playerName} is already on the waitlist (position ${playerStatus.position})`,
        { type: 'error' }
      );
    }
    setSearchInput('');
    setShowSuggestions(false);
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
  console.log('🔵 Adding player to group:', newPlayer);

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
        const freshMember = freshMemberData?.find((m) => m.id === suggestion.member.id);
        currentStreak = freshMember?.unclearedStreak || freshMember?.uncleared_streak || 0;
        console.log('📊 Fresh member data:', freshMember);
        console.log('📊 Registrant streak (fresh):', currentStreak);
      } catch (error) {
        console.error('📊 Failed to fetch fresh streak, using cached:', error);
        currentStreak = enrichedMember.unclearedStreak || 0;
      }
      setRegistrantStreak(currentStreak);
    })();
  }

  setCurrentGroup([...currentGroup, newPlayer]);

  setCurrentScreen('group', 'handleSuggestionClick');
  // ===== END ORIGINAL FUNCTION BODY =====
}

/**
 * DEPENDENCY CHECKLIST for handleAddPlayerSuggestionClickOrchestrated:
 * Reads:
 *   - currentGroup
 *
 * Calls (setters):
 *   - setAddPlayerSearch
 *   - setShowAddPlayer
 *   - setShowAddPlayerSuggestions
 *   - setCurrentGroup
 *   - setHasWaitlistPriority
 *   - setAlertMessage
 *   - setShowAlert
 *
 * Calls (services/helpers):
 *   - guardAddPlayerEarly
 *   - guardAgainstGroupDuplicate
 *   - isPlayerAlreadyPlaying
 *   - getAvailableCourts
 *   - getCourtData
 *   - saveCourtData
 *   - findMemberNumber
 *   - showAlertMessage
 *   - Tennis (global)
 *   - CONSTANTS
 *
 * Returns: void (same as original — may have early returns)
 */

export async function handleAddPlayerSuggestionClickOrchestrated(suggestion, deps) {
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
    return;
  }

  // API member already has correct data
  const enrichedMember = {
    id: suggestion.member.id,
    name: suggestion.member.name,
    memberNumber: suggestion.memberNumber,
    accountId: suggestion.member.accountId,
    memberId: suggestion.member.id,
  };

  // Early duplicate guard
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    return;
  }

  // Check for duplicate in current group
  if (!guardAgainstGroupDuplicate(enrichedMember, currentGroup)) {
    Tennis.UI.toast(`${enrichedMember.name} is already in this group`);
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    return;
  }

  // Check if player is already playing or on waitlist
  if (!guardAddPlayerEarly(getCourtData, enrichedMember)) {
    setAddPlayerSearch('');
    setShowAddPlayer(false);
    setShowAddPlayerSuggestions(false);
    return; // Toast message already shown by guardAddPlayerEarly
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
        players.map((p) => ({
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
    console.log('🔵 Adding player to group (add player flow):', newPlayer);
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
