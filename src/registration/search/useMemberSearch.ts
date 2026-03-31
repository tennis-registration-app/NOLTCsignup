import React from 'react';
/**
 * useMemberSearch Hook
 * Orchestrates member search state + derived values + handlers.
 *
 * IMPORTANT: loadMembers runs once on mount ([] deps).
 * IMPORTANT: isSearching only tracks leader search (legacy quirk).
 * IMPORTANT: ADMIN_CODE flow: set searchInput first, check, clear if match.
 * IMPORTANT: All handlers call markUserTyping() first.
 */

import { useReducer, useCallback, useEffect } from 'react';
import { memberSearchReducer, initialMemberSearchState } from './memberSearchReducer';
import { useDebounce } from '../hooks/useDebounce.js';
import { logger } from '../../lib/logger';

interface ApiMember {
  displayName?: string;
  name?: string;
  memberNumber?: string;
  id: string;
  accountId: string;
  isPrimary: boolean;
  unclearedStreak?: number;
  playCount?: number;
}

interface UseMemberSearchDeps {
  backend: { directory: { getAllMembers: () => Promise<ApiMember[]> } };
  setCurrentScreen: (screen: string, reason: string) => void;
  CONSTANTS: { ADMIN_CODE: string; MAX_AUTOCOMPLETE_RESULTS: number };
  markUserTyping: () => void;
}

export function useMemberSearch({ backend, setCurrentScreen, CONSTANTS, markUserTyping }: UseMemberSearchDeps) {
  const [state, dispatch] = useReducer(memberSearchReducer, initialMemberSearchState);

  // ============================================
  // Debounce (300ms with numeric bypass)
  // ============================================
  const debouncedSearchInput = useDebounce(state.searchInput, 300);
  const debouncedAddPlayerSearch = useDebounce(state.addPlayerSearch, 300);

  // Numeric input bypasses debounce (exact regex from legacy)
  const shouldDebounceMainSearch = !/^\d+$/.test(state.searchInput);
  const effectiveSearchInput = shouldDebounceMainSearch ? debouncedSearchInput : state.searchInput;

  const shouldDebounceAddPlayer = !/^\d+$/.test(state.addPlayerSearch);
  const effectiveAddPlayerSearch = shouldDebounceAddPlayer
    ? debouncedAddPlayerSearch
    : state.addPlayerSearch;

  // ============================================
  // isSearching effect (leader-only, quirk preserved)
  // ============================================
  useEffect(() => {
    if (
      shouldDebounceMainSearch &&
      state.searchInput !== debouncedSearchInput &&
      state.searchInput.length > 0
    ) {
      dispatch({ type: 'IS_SEARCHING_SET', value: true });
    } else {
      dispatch({ type: 'IS_SEARCHING_SET', value: false });
    }
  }, [state.searchInput, debouncedSearchInput, shouldDebounceMainSearch]);

  // ============================================
  // loadMembers effect (runs once on mount)
  // ============================================
  useEffect(() => {
    const loadMembers = async () => {
      try {
        logger.info('TennisBackend', 'Loading members for autocomplete...');
        const members = await backend.directory.getAllMembers();
        dispatch({ type: 'API_MEMBERS_SET', value: members });
        logger.info('TennisBackend', `Loaded ${members.length} members`);
      } catch (error) {
        logger.error('TennisBackend', 'Failed to load members', error);
        // Legacy does NOT set apiMembers to [] on error - it stays as initial []
      }
    };
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: load members once, backend is stable singleton
  }, []);

  // ============================================
  // getAutocompleteSuggestions (pure filter)
  // Verbatim copy of legacy logic from App.jsx lines 2189-2253
  // ============================================
  const getAutocompleteSuggestions = useCallback(
    (input: string) => {
      if (!input || input.length < 1) return [];

      const suggestions: Array<{ memberNumber: string; member: { id: string; name: string; accountId: string; isPrimary: boolean; unclearedStreak: number; playCount: number }; displayText: string }> = [];
      const lowerInput = input.toLowerCase();

      // If API members haven't loaded yet, return empty
      if (state.apiMembers.length === 0) {
        return [];
      }

      (state.apiMembers as ApiMember[]).forEach((apiMember) => {
        // Use camelCase properties (normalized by TennisDirectory)
        const displayName = apiMember.displayName || apiMember.name || '';
        const memberNumber = apiMember.memberNumber || '';

        // Split the name into parts
        const nameParts = displayName.split(' ');

        // Split input into words for multi-word search
        const inputWords = lowerInput
          .trim()
          .split(/\s+/)
          .filter((word: string) => word.length > 0);

        // Check if member number matches (only check first word for member number)
        const memberNumberMatch = memberNumber.startsWith(inputWords[0]);

        // Check if all input words match the start of some name part
        const namePartsLower = nameParts.map((part: string) => part.toLowerCase());
        const nameMatch = inputWords.every((inputWord: string) =>
          namePartsLower.some((namePart: string) => namePart.startsWith(inputWord))
        );

        if (memberNumberMatch || nameMatch) {
          suggestions.push({
            memberNumber: memberNumber,
            member: {
              id: apiMember.id, // This is the UUID from API
              name: displayName,
              accountId: apiMember.accountId,
              isPrimary: apiMember.isPrimary,
              unclearedStreak: apiMember.unclearedStreak || 0,
              playCount: apiMember.playCount || 0,
            },
            displayText: `${displayName} (#${memberNumber})`,
          });
        }
      });

      // Sort: first-name prefix match first, then by play frequency, then alphabetical
      suggestions.sort((a, b) => {
        const aName = a.member.name.toLowerCase();
        const bName = b.member.name.toLowerCase();
        const aFirstName = aName.split(' ')[0];
        const bFirstName = bName.split(' ')[0];

        // Prioritize first name matches
        const aFirstMatch = aFirstName.startsWith(lowerInput);
        const bFirstMatch = bFirstName.startsWith(lowerInput);
        if (aFirstMatch && !bFirstMatch) return -1;
        if (!aFirstMatch && bFirstMatch) return 1;

        // Within same priority tier, sort by play frequency (most active first)
        const aCount = a.member.playCount || 0;
        const bCount = b.member.playCount || 0;
        if (aCount !== bCount) return bCount - aCount;

        // Fall back to alphabetical
        return aName.localeCompare(bName);
      });

      return suggestions.slice(0, CONSTANTS.MAX_AUTOCOMPLETE_RESULTS);
    },
    [state.apiMembers, CONSTANTS]
  );

  // ============================================
  // Handlers (preserve exact legacy semantics)
  // ============================================

  const handleGroupSearchChange = useCallback(
    (e: { target: { value: string } }) => {
      markUserTyping();
      const value = e.target.value || '';

      // Set searchInput first (legacy behavior)
      dispatch({ type: 'SEARCH_INPUT_SET', value });

      // Check for admin code (immediate, no debounce)
      if (value === CONSTANTS.ADMIN_CODE) {
        setCurrentScreen('admin', 'adminCodeEntered');
        dispatch({ type: 'SEARCH_INPUT_SET', value: '' });
        return;
      }

      // Show suggestions only if non-empty
      dispatch({
        type: value.length > 0 ? 'SEARCH_SUGGESTIONS_SHOWN' : 'SEARCH_SUGGESTIONS_HIDDEN',
      });
    },
    [CONSTANTS, setCurrentScreen, markUserTyping]
  );

  const handleGroupSearchFocus = useCallback(() => {
    markUserTyping();
    if (state.searchInput.length > 0) {
      dispatch({ type: 'SEARCH_SUGGESTIONS_SHOWN' });
    }
  }, [state.searchInput, markUserTyping]);

  const handleAddPlayerSearchChange = useCallback(
    (e: { target: { value: string } }) => {
      markUserTyping();
      const value = e.target.value || '';
      dispatch({ type: 'ADD_PLAYER_SEARCH_SET', value });
      dispatch({
        type: value.length > 0 ? 'ADD_PLAYER_SUGGESTIONS_SHOWN' : 'ADD_PLAYER_SUGGESTIONS_HIDDEN',
      });
    },
    [markUserTyping]
  );

  const handleAddPlayerSearchFocus = useCallback(() => {
    markUserTyping();
    if (state.addPlayerSearch.length > 0) {
      dispatch({ type: 'ADD_PLAYER_SUGGESTIONS_SHOWN' });
    }
  }, [state.addPlayerSearch, markUserTyping]);

  // ============================================
  // Reset functions (exposed but not wired yet)
  // ============================================
  const resetLeaderSearch = useCallback(() => {
    dispatch({ type: 'SEARCH_RESET' });
  }, []);

  const resetAddPlayerSearch = useCallback(() => {
    dispatch({ type: 'ADD_PLAYER_SEARCH_RESET' });
  }, []);

  const resetAllSearch = useCallback(() => {
    dispatch({ type: 'ALL_SEARCH_RESET' });
  }, []);

  // ============================================
  // Return API
  // ============================================
  return {
    // State (for props)
    searchInput: state.searchInput,
    showSuggestions: state.showSuggestions,
    addPlayerSearch: state.addPlayerSearch,
    showAddPlayerSuggestions: state.showAddPlayerSuggestions,
    apiMembers: state.apiMembers,
    isSearching: state.isSearching,

    // Derived (for props)
    effectiveSearchInput,
    effectiveAddPlayerSearch,

    // Setters (for components/legacy code that calls setX directly)
    setSearchInput: (value: string) => dispatch({ type: 'SEARCH_INPUT_SET', value }),
    setShowSuggestions: (show: boolean) =>
      dispatch({
        type: show ? 'SEARCH_SUGGESTIONS_SHOWN' : 'SEARCH_SUGGESTIONS_HIDDEN',
      }),
    setAddPlayerSearch: (value: string) => dispatch({ type: 'ADD_PLAYER_SEARCH_SET', value }),
    setShowAddPlayerSuggestions: (show: boolean) =>
      dispatch({
        type: show ? 'ADD_PLAYER_SUGGESTIONS_SHOWN' : 'ADD_PLAYER_SUGGESTIONS_HIDDEN',
      }),
    setApiMembers: (value: unknown[]) => dispatch({ type: 'API_MEMBERS_SET', value }),

    // Handlers
    handleGroupSearchChange,
    handleGroupSearchFocus,
    handleAddPlayerSearchChange,
    handleAddPlayerSearchFocus,
    getAutocompleteSuggestions,

    // Resets (exposed but not wired into App.jsx yet)
    resetLeaderSearch,
    resetAddPlayerSearch,
    resetAllSearch,
  };
}
