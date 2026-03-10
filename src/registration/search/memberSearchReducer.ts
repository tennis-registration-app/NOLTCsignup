/**
 * Member Search Reducer
 * Manages search UI state for leader and add-player flows.
 *
 * IMPORTANT: Uses action.value convention everywhere (not action.members).
 * IMPORTANT: ALL_SEARCH_RESET does NOT reset apiMembers (legacy never resets it).
 */

export interface MemberSearchState {
  searchInput: string;
  showSuggestions: boolean;
  addPlayerSearch: string;
  showAddPlayerSuggestions: boolean;
  apiMembers: unknown[];
  isSearching: boolean;
}

type MemberSearchAction =
  | { type: 'SEARCH_INPUT_SET'; value: string }
  | { type: 'SEARCH_SUGGESTIONS_SHOWN' }
  | { type: 'SEARCH_SUGGESTIONS_HIDDEN' }
  | { type: 'ADD_PLAYER_SEARCH_SET'; value: string }
  | { type: 'ADD_PLAYER_SUGGESTIONS_SHOWN' }
  | { type: 'ADD_PLAYER_SUGGESTIONS_HIDDEN' }
  | { type: 'API_MEMBERS_SET'; value: unknown[] }
  | { type: 'IS_SEARCHING_SET'; value: boolean }
  | { type: 'SEARCH_RESET' }
  | { type: 'ADD_PLAYER_SEARCH_RESET' }
  | { type: 'ALL_SEARCH_RESET' };

export const initialMemberSearchState: MemberSearchState = {
  searchInput: '',
  showSuggestions: false,
  addPlayerSearch: '',
  showAddPlayerSuggestions: false,
  apiMembers: [],
  isSearching: false,
};

export function memberSearchReducer(state: MemberSearchState, action: MemberSearchAction): MemberSearchState {
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
