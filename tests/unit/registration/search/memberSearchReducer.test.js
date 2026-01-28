import {
  memberSearchReducer,
  initialMemberSearchState,
} from '../../../../src/registration/search/memberSearchReducer';

describe('memberSearchReducer', () => {
  // Initial state
  test('returns initial state for unknown action', () => {
    const result = memberSearchReducer(initialMemberSearchState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialMemberSearchState);
  });

  test('initial state has correct defaults', () => {
    expect(initialMemberSearchState.searchInput).toBe('');
    expect(initialMemberSearchState.showSuggestions).toBe(false);
    expect(initialMemberSearchState.addPlayerSearch).toBe('');
    expect(initialMemberSearchState.showAddPlayerSuggestions).toBe(false);
    expect(initialMemberSearchState.apiMembers).toEqual([]);
    expect(initialMemberSearchState.isSearching).toBe(false);
  });

  // Leader search
  test('SEARCH_INPUT_SET updates searchInput', () => {
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'SEARCH_INPUT_SET',
      value: 'john',
    });
    expect(result.searchInput).toBe('john');
  });

  test('SEARCH_INPUT_SET can set to empty string', () => {
    const state = { ...initialMemberSearchState, searchInput: 'john' };
    const result = memberSearchReducer(state, {
      type: 'SEARCH_INPUT_SET',
      value: '',
    });
    expect(result.searchInput).toBe('');
  });

  test('SEARCH_SUGGESTIONS_SHOWN sets showSuggestions true', () => {
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'SEARCH_SUGGESTIONS_SHOWN',
    });
    expect(result.showSuggestions).toBe(true);
  });

  test('SEARCH_SUGGESTIONS_HIDDEN sets showSuggestions false', () => {
    const state = { ...initialMemberSearchState, showSuggestions: true };
    const result = memberSearchReducer(state, { type: 'SEARCH_SUGGESTIONS_HIDDEN' });
    expect(result.showSuggestions).toBe(false);
  });

  // Add-player search
  test('ADD_PLAYER_SEARCH_SET updates addPlayerSearch', () => {
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'ADD_PLAYER_SEARCH_SET',
      value: 'jane',
    });
    expect(result.addPlayerSearch).toBe('jane');
  });

  test('ADD_PLAYER_SEARCH_SET can set to empty string', () => {
    const state = { ...initialMemberSearchState, addPlayerSearch: 'jane' };
    const result = memberSearchReducer(state, {
      type: 'ADD_PLAYER_SEARCH_SET',
      value: '',
    });
    expect(result.addPlayerSearch).toBe('');
  });

  test('ADD_PLAYER_SUGGESTIONS_SHOWN sets showAddPlayerSuggestions true', () => {
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'ADD_PLAYER_SUGGESTIONS_SHOWN',
    });
    expect(result.showAddPlayerSuggestions).toBe(true);
  });

  test('ADD_PLAYER_SUGGESTIONS_HIDDEN sets showAddPlayerSuggestions false', () => {
    const state = { ...initialMemberSearchState, showAddPlayerSuggestions: true };
    const result = memberSearchReducer(state, { type: 'ADD_PLAYER_SUGGESTIONS_HIDDEN' });
    expect(result.showAddPlayerSuggestions).toBe(false);
  });

  // Shared
  test('API_MEMBERS_SET updates apiMembers', () => {
    const members = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'API_MEMBERS_SET',
      value: members,
    });
    expect(result.apiMembers).toEqual(members);
  });

  test('IS_SEARCHING_SET true sets isSearching true', () => {
    const result = memberSearchReducer(initialMemberSearchState, {
      type: 'IS_SEARCHING_SET',
      value: true,
    });
    expect(result.isSearching).toBe(true);
  });

  test('IS_SEARCHING_SET false sets isSearching false', () => {
    const state = { ...initialMemberSearchState, isSearching: true };
    const result = memberSearchReducer(state, { type: 'IS_SEARCHING_SET', value: false });
    expect(result.isSearching).toBe(false);
  });

  // Resets
  test('SEARCH_RESET clears leader search state only', () => {
    const state = {
      ...initialMemberSearchState,
      searchInput: 'john',
      showSuggestions: true,
      addPlayerSearch: 'jane',
      showAddPlayerSuggestions: true,
      apiMembers: [{ id: 1 }],
      isSearching: true,
    };
    const result = memberSearchReducer(state, { type: 'SEARCH_RESET' });

    expect(result.searchInput).toBe('');
    expect(result.showSuggestions).toBe(false);
    // Add-player state preserved
    expect(result.addPlayerSearch).toBe('jane');
    expect(result.showAddPlayerSuggestions).toBe(true);
    // Shared state preserved
    expect(result.apiMembers).toEqual([{ id: 1 }]);
    expect(result.isSearching).toBe(true);
  });

  test('ADD_PLAYER_SEARCH_RESET clears add-player state only', () => {
    const state = {
      ...initialMemberSearchState,
      searchInput: 'john',
      showSuggestions: true,
      addPlayerSearch: 'jane',
      showAddPlayerSuggestions: true,
    };
    const result = memberSearchReducer(state, { type: 'ADD_PLAYER_SEARCH_RESET' });

    // Leader state preserved
    expect(result.searchInput).toBe('john');
    expect(result.showSuggestions).toBe(true);
    // Add-player state cleared
    expect(result.addPlayerSearch).toBe('');
    expect(result.showAddPlayerSuggestions).toBe(false);
  });

  test('ALL_SEARCH_RESET clears all search state but NOT apiMembers', () => {
    const state = {
      searchInput: 'john',
      showSuggestions: true,
      addPlayerSearch: 'jane',
      showAddPlayerSuggestions: true,
      apiMembers: [{ id: 1 }, { id: 2 }],
      isSearching: true,
    };
    const result = memberSearchReducer(state, { type: 'ALL_SEARCH_RESET' });

    expect(result.searchInput).toBe('');
    expect(result.showSuggestions).toBe(false);
    expect(result.addPlayerSearch).toBe('');
    expect(result.showAddPlayerSuggestions).toBe(false);
    expect(result.isSearching).toBe(false);
    // apiMembers intentionally NOT reset
    expect(result.apiMembers).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
