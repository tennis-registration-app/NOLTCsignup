/**
 * Member Search Reducer
 * Manages search UI state for leader and add-player flows.
 *
 * IMPORTANT: Uses action.value convention everywhere (not action.members).
 * IMPORTANT: ALL_SEARCH_RESET does NOT reset apiMembers (legacy never resets it).
 */

export const initialMemberSearchState = {
  searchInput: '',
  showSuggestions: false,
  addPlayerSearch: '',
  showAddPlayerSuggestions: false,
  apiMembers: [],
  isSearching: false,
};

export function memberSearchReducer(state, action) {
  switch (action.type) {
    // Leader search
    case 'SEARCH_INPUT_SET':
      return { ...state, searchInput: action.value };

    case 'SEARCH_SUGGESTIONS_SHOWN':
      return { ...state, showSuggestions: true };

    case 'SEARCH_SUGGESTIONS_HIDDEN':
      return { ...state, showSuggestions: false };

    // Add-player search
    case 'ADD_PLAYER_SEARCH_SET':
      return { ...state, addPlayerSearch: action.value };

    case 'ADD_PLAYER_SUGGESTIONS_SHOWN':
      return { ...state, showAddPlayerSuggestions: true };

    case 'ADD_PLAYER_SUGGESTIONS_HIDDEN':
      return { ...state, showAddPlayerSuggestions: false };

    // Shared
    case 'API_MEMBERS_SET':
      return { ...state, apiMembers: action.value };

    case 'IS_SEARCHING_SET':
      return { ...state, isSearching: action.value };

    // Resets
    case 'SEARCH_RESET':
      return {
        ...state,
        searchInput: '',
        showSuggestions: false,
        // NOTE: Does NOT reset isSearching (effect will handle)
      };

    case 'ADD_PLAYER_SEARCH_RESET':
      return {
        ...state,
        addPlayerSearch: '',
        showAddPlayerSuggestions: false,
      };

    case 'ALL_SEARCH_RESET':
      // NOTE: Does NOT reset apiMembers (legacy never resets it)
      return {
        ...state,
        searchInput: '',
        showSuggestions: false,
        addPlayerSearch: '',
        showAddPlayerSuggestions: false,
        isSearching: false,
        // apiMembers intentionally NOT reset
      };

    default:
      return state;
  }
}
