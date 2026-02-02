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
import { memberSearchReducer, initialMemberSearchState } from './memberSearchReducer.js';
import { useDebounce } from '../hooks/useDebounce.js';

export function useMemberSearch({ backend, setCurrentScreen, CONSTANTS, markUserTyping }) {
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
        console.log('[TennisBackend] Loading members for autocomplete...');
        const members = await backend.directory.getAllMembers();
        dispatch({ type: 'API_MEMBERS_SET', value: members });
        console.log('[TennisBackend] Loaded', members.length, 'members');
      } catch (error) {
        console.error('[TennisBackend] Failed to load members:', error);
        // Legacy does NOT set apiMembers to [] on error - it stays as initial []
      }
    };
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // getAutocompleteSuggestions (pure filter)
  // Verbatim copy of legacy logic from App.jsx lines 2189-2253
  // ============================================
  const getAutocompleteSuggestions = useCallback(
    (input) => {
      if (!input || input.length < 1) return [];

      const suggestions = [];
      const lowerInput = input.toLowerCase();

      // If API members haven't loaded yet, return empty
      if (state.apiMembers.length === 0) {
        return [];
      }

      state.apiMembers.forEach((apiMember) => {
        // WP4-4: Use camelCase properties (normalized by TennisDirectory)
        const displayName = apiMember.displayName || apiMember.name || '';
        const memberNumber = apiMember.memberNumber || '';

        // Split the name into parts
        const nameParts = displayName.split(' ');

        // Split input into words for multi-word search
        const inputWords = lowerInput
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0);

        // Check if member number matches (only check first word for member number)
        const memberNumberMatch = memberNumber.startsWith(inputWords[0]);

        // Check if all input words match the start of some name part
        const namePartsLower = nameParts.map((part) => part.toLowerCase());
        const nameMatch = inputWords.every((inputWord) =>
          namePartsLower.some((namePart) => namePart.startsWith(inputWord))
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
            },
            displayText: `${displayName} (#${memberNumber})`,
          });
        }
      });

      // Sort suggestions to prioritize first name matches, then last name matches
      suggestions.sort((a, b) => {
        const aName = a.member.name.toLowerCase();
        const bName = b.member.name.toLowerCase();
        const aFirstName = aName.split(' ')[0];
        const bFirstName = bName.split(' ')[0];

        // Prioritize first name matches
        if (aFirstName.startsWith(lowerInput) && !bFirstName.startsWith(lowerInput)) return -1;
        if (!aFirstName.startsWith(lowerInput) && bFirstName.startsWith(lowerInput)) return 1;

        // Then sort alphabetically
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
    (e) => {
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
    (e) => {
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
    setSearchInput: (value) => dispatch({ type: 'SEARCH_INPUT_SET', value }),
    setShowSuggestions: (show) =>
      dispatch({
        type: show ? 'SEARCH_SUGGESTIONS_SHOWN' : 'SEARCH_SUGGESTIONS_HIDDEN',
      }),
    setAddPlayerSearch: (value) => dispatch({ type: 'ADD_PLAYER_SEARCH_SET', value }),
    setShowAddPlayerSuggestions: (show) =>
      dispatch({
        type: show ? 'ADD_PLAYER_SUGGESTIONS_SHOWN' : 'ADD_PLAYER_SUGGESTIONS_HIDDEN',
      }),
    setApiMembers: (value) => dispatch({ type: 'API_MEMBERS_SET', value }),

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
