import { useCallback } from 'react';

/**
 * Guest Handlers
 * Extracted from useRegistrationHandlers — WP5.9.5.2
 * Verbatim function bodies, no logic changes.
 */
export function useGuestHandlers(deps) {
  const {
    // Guest state
    guestName,
    setGuestName,
    guestSponsor,
    setGuestSponsor,
    showGuestForm,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,
    guestCounter,
    incrementGuestCounter,
    // Group state
    currentGroup,
    setCurrentGroup,
    memberNumber,
    memberDatabase,
    // Add player state
    showAddPlayer,
    setShowAddPlayer,
    setShowAddPlayerSuggestions,
    setAddPlayerSearch,
    // Helpers
    markUserTyping,
    getCourtData,
    guardAddPlayerEarly,
    guardAgainstGroupDuplicate,
    // Constants
    TENNIS_CONFIG,
  } = deps;

  // VERBATIM COPY: validateGuestName from line ~366
  const validateGuestName = useCallback((name) => {
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return false;
    return words.every((word) => word.length >= 2 && /^[a-zA-Z]+$/.test(word));
  }, []);

  // VERBATIM COPY: handleToggleGuestForm from line ~829
  const handleToggleGuestForm = useCallback(
    (prefillName) => {
      if (showGuestForm) {
        // If guest form is already showing, close it
        setShowGuestForm(false);
        setGuestName('');
        setGuestSponsor('');
        setShowGuestNameError(false);
        setShowSponsorError(false);
        setShowAddPlayer(false);
      } else {
        // Open guest form
        setShowGuestForm(true);
        setShowAddPlayer(true);
        setShowAddPlayerSuggestions(false);
        setAddPlayerSearch('');
        // Prefill name if provided (from "Add as guest?" button)
        if (typeof prefillName === 'string') {
          setGuestName(prefillName);
        }
        // Set default sponsor to current user ("My Guest")
        // This works for both single member and multiple members in group
        if (memberNumber) {
          setGuestSponsor(memberNumber);
        } else if (currentGroup.length >= 1 && !currentGroup[0].isGuest) {
          setGuestSponsor(currentGroup[0].memberNumber);
        }
      }
    },
    [
      showGuestForm,
      setShowGuestForm,
      setGuestName,
      setGuestSponsor,
      setShowGuestNameError,
      setShowSponsorError,
      setShowAddPlayer,
      setShowAddPlayerSuggestions,
      setAddPlayerSearch,
      memberNumber,
      currentGroup,
    ]
  );

  // VERBATIM COPY: handleGuestNameChange from line ~873
  const handleGuestNameChange = useCallback(
    (e) => {
      markUserTyping();
      setGuestName(e.target.value);
      setShowGuestNameError(false);
    },
    [markUserTyping, setGuestName, setShowGuestNameError]
  );

  // VERBATIM COPY: handleAddGuest from lines ~882-1010
  const handleAddGuest = useCallback(async () => {
    if (!validateGuestName(guestName)) {
      setShowGuestNameError(true);
      return;
    }

    // Check if sponsor is selected when multiple members exist
    if (currentGroup.filter((p) => !p.isGuest).length > 1 && !guestSponsor) {
      setShowSponsorError(true);
      return;
    }

    // Early duplicate guard for guest
    if (!guardAddPlayerEarly(getCourtData, guestName.trim())) {
      setShowGuestForm(false);
      setShowAddPlayer(false);
      setGuestName('');
      setGuestSponsor('');
      return;
    }

    // Check for duplicate in current group
    if (!guardAgainstGroupDuplicate(guestName.trim(), currentGroup)) {
      window.Tennis?.UI?.toast(`${guestName.trim()} is already in this group`);
      setShowGuestForm(false);
      setShowAddPlayer(false);
      setGuestName('');
      setGuestSponsor('');
      return;
    }

    // Add guest to group
    const guestId = -guestCounter;
    incrementGuestCounter();

    const sponsorMember =
      guestSponsor || currentGroup.filter((p) => !p.isGuest)[0]?.memberNumber || memberNumber;

    // Find the sponsor's details
    const sponsorPlayer =
      currentGroup.find((p) => p.memberNumber === sponsorMember) ||
      memberDatabase[sponsorMember]?.familyMembers[0];

    setCurrentGroup([
      ...currentGroup,
      {
        name: guestName.trim(),
        memberNumber: 'GUEST',
        id: guestId,
        phone: '',
        ranking: null,
        winRate: 0.5,
        isGuest: true,
        sponsor: sponsorMember,
      },
    ]);

    // Track guest charge
    const guestCharge = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      guestName: guestName.trim(),
      sponsorName: sponsorPlayer?.name || 'Unknown',
      sponsorNumber: sponsorMember,
      amount: 15.0,
    };

    console.log('🎾 Creating guest charge:', guestCharge);

    try {
      // Get existing charges from localStorage
      const existingChargesFromStorage = localStorage.getItem(
        TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY
      );
      const existingCharges = existingChargesFromStorage
        ? JSON.parse(existingChargesFromStorage)
        : [];
      console.log('📋 Existing charges before save:', existingCharges.length);

      // Add new charge
      existingCharges.push(guestCharge);
      console.log('📋 Charges after adding new one:', existingCharges.length);

      // Save to localStorage
      localStorage.setItem(
        TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY,
        JSON.stringify(existingCharges)
      );
      console.log('💾 Guest charge saved to localStorage');

      // Dispatch event for real-time updates
      window.dispatchEvent(
        new CustomEvent('tennisDataUpdate', {
          detail: { source: 'guest-charge' },
        })
      );
      console.log('📡 Dispatched update event (source=guest-charge)');
    } catch (error) {
      console.error('❌ Error saving guest charge:', error);
    }

    // Reset form
    setGuestName('');
    setGuestSponsor('');
    setShowGuestForm(false);
    setShowAddPlayer(false);
    setShowGuestNameError(false);
    setShowSponsorError(false);
  }, [
    validateGuestName,
    guestName,
    currentGroup,
    guestSponsor,
    guardAddPlayerEarly,
    getCourtData,
    guardAgainstGroupDuplicate,
    guestCounter,
    incrementGuestCounter,
    memberNumber,
    memberDatabase,
    setCurrentGroup,
    TENNIS_CONFIG,
    setShowGuestNameError,
    setShowSponsorError,
    setShowGuestForm,
    setShowAddPlayer,
    setGuestName,
    setGuestSponsor,
  ]);

  return {
    validateGuestName,
    handleToggleGuestForm,
    handleGuestNameChange,
    handleAddGuest,
  };
}
