/**
 * useGroupGuest Hook
 * Orchestrates group composition and guest form state.
 *
 * NOTE: guestCounter remains in App.jsx (not extracted yet).
 */

import { useReducer, useCallback } from 'react';
import { groupGuestReducer, initialGroupGuestState } from './groupGuestReducer.js';

export function useGroupGuest() {
  const [state, dispatch] = useReducer(groupGuestReducer, initialGroupGuestState);

  // ============================================
  // Setters (for external callers like selection handlers)
  // ============================================
  const setCurrentGroup = useCallback((value) => {
    dispatch({ type: 'CURRENT_GROUP_SET', value });
  }, []);

  const setGuestName = useCallback((value) => {
    dispatch({ type: 'GUEST_NAME_SET', value });
  }, []);

  const setGuestSponsor = useCallback((value) => {
    dispatch({ type: 'GUEST_SPONSOR_SET', value });
  }, []);

  const setShowGuestForm = useCallback((value) => {
    dispatch({ type: 'SHOW_GUEST_FORM_SET', value });
  }, []);

  const setShowGuestNameError = useCallback((value) => {
    dispatch({ type: 'SHOW_GUEST_NAME_ERROR_SET', value });
  }, []);

  const setShowSponsorError = useCallback((value) => {
    dispatch({ type: 'SHOW_SPONSOR_ERROR_SET', value });
  }, []);

  // ============================================
  // Handlers (pure - only mutate group/guest state)
  // ============================================

  // handleRemovePlayer - COPY EXACT LEGACY LOGIC (index-based removal)
  const handleRemovePlayer = useCallback((idx) => {
    dispatch({ type: 'CURRENT_GROUP_PLAYER_REMOVED', index: idx });
  }, []);

  // handleSelectSponsor - COPY EXACT LEGACY LOGIC
  const handleSelectSponsor = useCallback((memberNum) => {
    dispatch({ type: 'GUEST_SPONSOR_SET', value: memberNum });
    dispatch({ type: 'SHOW_SPONSOR_ERROR_SET', value: false });
  }, []);

  // handleCancelGuest - COPY EXACT LEGACY LOGIC (showGuestForm false FIRST)
  const handleCancelGuest = useCallback(() => {
    dispatch({ type: 'SHOW_GUEST_FORM_SET', value: false });
    dispatch({ type: 'GUEST_NAME_SET', value: '' });
    dispatch({ type: 'GUEST_SPONSOR_SET', value: '' });
    dispatch({ type: 'SHOW_GUEST_NAME_ERROR_SET', value: false });
    dispatch({ type: 'SHOW_SPONSOR_ERROR_SET', value: false });
  }, []);

  // ============================================
  // Resets
  // ============================================
  const resetGuestForm = useCallback(() => {
    dispatch({ type: 'GUEST_FORM_RESET' });
  }, []);

  const resetGroup = useCallback(() => {
    dispatch({ type: 'GROUP_RESET' });
  }, []);

  // ============================================
  // Return API
  // ============================================
  return {
    // State
    currentGroup: state.currentGroup,
    guestName: state.guestName,
    guestSponsor: state.guestSponsor,
    showGuestForm: state.showGuestForm,
    showGuestNameError: state.showGuestNameError,
    showSponsorError: state.showSponsorError,

    // Setters (for selection handlers and other external callers)
    setCurrentGroup,
    setGuestName,
    setGuestSponsor,
    setShowGuestForm,
    setShowGuestNameError,
    setShowSponsorError,

    // Handlers
    handleRemovePlayer,
    handleSelectSponsor,
    handleCancelGuest,

    // Resets
    resetGuestForm,
    resetGroup,
  };
}
