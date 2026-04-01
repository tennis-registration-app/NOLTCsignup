/**
 * useMemberSearch — hook coverage
 *
 * Tests: initial state, loadMembers effect (success/error),
 * getAutocompleteSuggestions (empty input, no members, name match,
 * member-number match, multi-word match, result cap, displayText shape),
 * handleGroupSearchChange (admin-code, suggestions toggle),
 * handleGroupSearchFocus, handleAddPlayerSearchChange/Focus,
 * effectiveSearchInput numeric bypass, reset functions.
 *
 * Uses React 18 createRoot harness (same pattern as useMemberIdentity.test.ts).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../../../src/lib/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useMemberSearch } from '../../../../src/registration/search/useMemberSearch';

// Helpers

function makeMember(overrides = {}) {
  return {
    id: 'uuid-1',
    accountId: 'acct-1',
    memberNumber: '1000',
    displayName: 'Test Member',
    isPrimary: false,
    unclearedStreak: 0,
    playCount: 0,
    ...overrides,
  };
}

function makeBackend(members = [], opts = {}) {
  return {
    directory: {
      getAllMembers: opts.throws
        ? vi.fn().mockRejectedValue(new Error('Network error'))
        : vi.fn().mockResolvedValue(members),
    },
  };
}

const CONSTANTS = { ADMIN_CODE: '9999', MAX_AUTOCOMPLETE_RESULTS: 5 };

function createHarness(backend) {
  const setCurrentScreen = vi.fn();
  const markUserTyping = vi.fn();

  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useMemberSearch({ backend, setCurrentScreen, CONSTANTS, markUserTyping });
    useImperativeHandle(ref, () => hook);
    return null;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef<ReturnType<typeof useMemberSearch>>() as { current: ReturnType<typeof useMemberSearch> };

  act(() => { root.render(React.createElement(Wrapper, { ref })); });

  return {
    get hook() { return ref.current; },
    setCurrentScreen,
    markUserTyping,
    cleanup() {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

// A) Initial state

describe('useMemberSearch — initial state', () => {
  it('starts with empty searchInput and no suggestions shown', () => {
    const h = createHarness(makeBackend());
    expect(h.hook.searchInput).toBe('');
    expect(h.hook.showSuggestions).toBe(false);
    h.cleanup();
  });

  it('starts with empty addPlayerSearch', () => {
    const h = createHarness(makeBackend());
    expect(h.hook.addPlayerSearch).toBe('');
    expect(h.hook.showAddPlayerSuggestions).toBe(false);
    h.cleanup();
  });

  it('starts with empty apiMembers and isSearching false', () => {
    const h = createHarness(makeBackend());
    expect(h.hook.apiMembers).toEqual([]);
    expect(h.hook.isSearching).toBe(false);
    h.cleanup();
  });
});

// B) loadMembers effect

describe('useMemberSearch — loadMembers effect', () => {
  it('loads members from backend on mount', async () => {
    const members = [makeMember({ displayName: 'Alice', memberNumber: '1001' })];
    const backend = makeBackend(members);
    const h = createHarness(backend);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(backend.directory.getAllMembers).toHaveBeenCalledTimes(1);
    expect(h.hook.apiMembers).toHaveLength(1);
    h.cleanup();
  });

  it('keeps apiMembers as empty array when backend throws', async () => {
    const h = createHarness(makeBackend([], { throws: true }));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(h.hook.apiMembers).toEqual([]);
    h.cleanup();
  });
});

// C) getAutocompleteSuggestions

describe('useMemberSearch — getAutocompleteSuggestions', () => {
  async function setupWithMembers(members) {
    const backend = makeBackend(members);
    const h = createHarness(backend);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    return h;
  }

  it('returns empty array for empty input', async () => {
    const h = await setupWithMembers([makeMember()]);
    expect(h.hook.getAutocompleteSuggestions('')).toEqual([]);
    h.cleanup();
  });

  it('returns empty array when no members have loaded', () => {
    const backend = makeBackend([makeMember()]);
    const h = createHarness(backend);
    expect(h.hook.getAutocompleteSuggestions('Test')).toEqual([]);
    h.cleanup();
  });

  it('matches by member number prefix', async () => {
    const members = [
      makeMember({ displayName: 'Alice', memberNumber: '1001', id: 'id-a' }),
      makeMember({ displayName: 'Bob', memberNumber: '2001', id: 'id-b' }),
    ];
    const h = await setupWithMembers(members);
    const results = h.hook.getAutocompleteSuggestions('100');
    expect(results).toHaveLength(1);
    expect(results[0].memberNumber).toBe('1001');
    h.cleanup();
  });

  it('matches by first name prefix (case-insensitive)', async () => {
    const members = [
      makeMember({ displayName: 'Alice Smith', memberNumber: '1001', id: 'id-a' }),
      makeMember({ displayName: 'Bob Jones', memberNumber: '2001', id: 'id-b' }),
    ];
    const h = await setupWithMembers(members);
    const results = h.hook.getAutocompleteSuggestions('ali');
    expect(results).toHaveLength(1);
    expect(results[0].member.name).toBe('Alice Smith');
    h.cleanup();
  });

  it('matches by last name prefix', async () => {
    const members = [
      makeMember({ displayName: 'Alice Smith', memberNumber: '1001', id: 'id-a' }),
      makeMember({ displayName: 'Bob Jones', memberNumber: '2001', id: 'id-b' }),
    ];
    const h = await setupWithMembers(members);
    const results = h.hook.getAutocompleteSuggestions('jon');
    expect(results).toHaveLength(1);
    expect(results[0].member.name).toBe('Bob Jones');
    h.cleanup();
  });

  it('requires all input words to match some name part', async () => {
    const members = [
      makeMember({ displayName: 'Alice Smith', memberNumber: '1001', id: 'id-a' }),
      makeMember({ displayName: 'Alice Jones', memberNumber: '1002', id: 'id-b' }),
    ];
    const h = await setupWithMembers(members);
    const results = h.hook.getAutocompleteSuggestions('ali smi');
    expect(results).toHaveLength(1);
    expect(results[0].member.name).toBe('Alice Smith');
    h.cleanup();
  });

  it('returns empty for input that matches nothing', async () => {
    const h = await setupWithMembers([makeMember({ displayName: 'Alice Smith' })]);
    expect(h.hook.getAutocompleteSuggestions('zzz')).toEqual([]);
    h.cleanup();
  });

  it('caps results at MAX_AUTOCOMPLETE_RESULTS (5)', async () => {
    const members = Array.from({ length: 8 }, (_, i) =>
      makeMember({ displayName: 'Alice ' + i, memberNumber: '100' + i, id: 'id-' + i })
    );
    const h = await setupWithMembers(members);
    const results = h.hook.getAutocompleteSuggestions('ali');
    expect(results).toHaveLength(5);
    h.cleanup();
  });

  it('produces correct displayText shape', async () => {
    const h = await setupWithMembers([makeMember({ displayName: 'Alice Smith', memberNumber: '1234', id: 'id-a' })]);
    const results = h.hook.getAutocompleteSuggestions('Alice');
    expect(results[0].displayText).toBe('Alice Smith (#1234)');
    h.cleanup();
  });

  it('falls back to name field when displayName is absent', async () => {
    const member = { id: 'id-x', accountId: 'acct-1', memberNumber: '5000', name: 'Bob Fallback', isPrimary: false, unclearedStreak: 0, playCount: 0 };
    const backend = makeBackend([member]);
    const h = createHarness(backend);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const results = h.hook.getAutocompleteSuggestions('Bob');
    expect(results[0].member.name).toBe('Bob Fallback');
    h.cleanup();
  });
});

// D) handleGroupSearchChange

describe('useMemberSearch — handleGroupSearchChange', () => {
  it('updates searchInput', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'alice' } }));
    expect(h.hook.searchInput).toBe('alice');
    h.cleanup();
  });

  it('calls markUserTyping', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'alice' } }));
    expect(h.markUserTyping).toHaveBeenCalled();
    h.cleanup();
  });

  it('shows suggestions for non-empty input', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'a' } }));
    expect(h.hook.showSuggestions).toBe(true);
    h.cleanup();
  });

  it('hides suggestions when input becomes empty', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'a' } }));
    act(() => h.hook.handleGroupSearchChange({ target: { value: '' } }));
    expect(h.hook.showSuggestions).toBe(false);
    h.cleanup();
  });

  it('navigates to admin screen and clears input when admin code is entered', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: '9999' } }));
    expect(h.setCurrentScreen).toHaveBeenCalledWith('admin', 'adminCodeEntered');
    expect(h.hook.searchInput).toBe('');
    h.cleanup();
  });
});

// E) handleGroupSearchFocus

describe('useMemberSearch — handleGroupSearchFocus', () => {
  it('calls markUserTyping', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchFocus());
    expect(h.markUserTyping).toHaveBeenCalled();
    h.cleanup();
  });

  it('shows suggestions if searchInput is non-empty', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.setSearchInput('alice'));
    act(() => h.hook.handleGroupSearchFocus());
    expect(h.hook.showSuggestions).toBe(true);
    h.cleanup();
  });

  it('does not show suggestions if searchInput is empty', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchFocus());
    expect(h.hook.showSuggestions).toBe(false);
    h.cleanup();
  });
});

// F) handleAddPlayerSearchChange / Focus

describe('useMemberSearch — handleAddPlayerSearchChange', () => {
  it('updates addPlayerSearch', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: 'bob' } }));
    expect(h.hook.addPlayerSearch).toBe('bob');
    h.cleanup();
  });

  it('shows add-player suggestions for non-empty input', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: 'b' } }));
    expect(h.hook.showAddPlayerSuggestions).toBe(true);
    h.cleanup();
  });

  it('hides add-player suggestions for empty input', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: 'b' } }));
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: '' } }));
    expect(h.hook.showAddPlayerSuggestions).toBe(false);
    h.cleanup();
  });
});

describe('useMemberSearch — handleAddPlayerSearchFocus', () => {
  it('shows add-player suggestions when addPlayerSearch is non-empty', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.setAddPlayerSearch('bob'));
    act(() => h.hook.handleAddPlayerSearchFocus());
    expect(h.hook.showAddPlayerSuggestions).toBe(true);
    h.cleanup();
  });

  it('does not show suggestions when addPlayerSearch is empty', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleAddPlayerSearchFocus());
    expect(h.hook.showAddPlayerSuggestions).toBe(false);
    h.cleanup();
  });
});

// G) Numeric debounce bypass

describe('useMemberSearch — effectiveSearchInput numeric bypass', () => {
  it('reflects numeric input immediately without waiting for debounce', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.setSearchInput('1234'));
    expect(h.hook.effectiveSearchInput).toBe('1234');
    h.cleanup();
  });
});

// H) Reset functions

describe('useMemberSearch — reset functions', () => {
  it('resetLeaderSearch clears searchInput and showSuggestions', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'alice' } }));
    act(() => h.hook.resetLeaderSearch());
    expect(h.hook.searchInput).toBe('');
    expect(h.hook.showSuggestions).toBe(false);
    h.cleanup();
  });

  it('resetAddPlayerSearch clears addPlayerSearch and showAddPlayerSuggestions', () => {
    const h = createHarness(makeBackend());
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: 'bob' } }));
    act(() => h.hook.resetAddPlayerSearch());
    expect(h.hook.addPlayerSearch).toBe('');
    expect(h.hook.showAddPlayerSuggestions).toBe(false);
    h.cleanup();
  });

  it('resetAllSearch clears all search state but preserves apiMembers', async () => {
    const members = [makeMember({ displayName: 'Alice', memberNumber: '1001', id: 'id-a' })];
    const backend = makeBackend(members);
    const h = createHarness(backend);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    act(() => h.hook.handleGroupSearchChange({ target: { value: 'ali' } }));
    act(() => h.hook.handleAddPlayerSearchChange({ target: { value: 'bob' } }));
    act(() => h.hook.resetAllSearch());
    expect(h.hook.searchInput).toBe('');
    expect(h.hook.showSuggestions).toBe(false);
    expect(h.hook.addPlayerSearch).toBe('');
    expect(h.hook.showAddPlayerSuggestions).toBe(false);
    expect(h.hook.isSearching).toBe(false);
    expect(h.hook.apiMembers).toHaveLength(1);
    h.cleanup();
  });
});
