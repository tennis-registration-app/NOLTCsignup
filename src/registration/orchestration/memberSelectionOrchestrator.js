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

// Placeholder for handleAddPlayerSuggestionClick (Commit 6)
// export async function handleAddPlayerSuggestionClickOrchestrated(suggestion, deps) { ... }
