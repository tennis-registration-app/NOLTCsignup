/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMemberSearch } from '../../../../src/registration/search/useMemberSearch';

function makeMember(overrides) {
  return {
    id: overrides.id || 'uuid-' + Math.random(),
    accountId: overrides.accountId || 'acct-1',
    memberNumber: overrides.memberNumber || '1750',
    displayName: overrides.displayName || 'Test Member',
    isPrimary: overrides.isPrimary ?? false,
    unclearedStreak: 0,
    playCount: overrides.playCount ?? 0,
  };
}

function setup(members) {
  const backend = {
    directory: {
      getAllMembers: vi.fn().mockResolvedValue(members),
    },
  };
  const setCurrentScreen = vi.fn();
  const markUserTyping = vi.fn();
  const CONSTANTS = { ADMIN_CODE: '9999', MAX_AUTOCOMPLETE_RESULTS: 20 };

  const { result } = renderHook(() =>
    useMemberSearch({ backend, setCurrentScreen, CONSTANTS, markUserTyping })
  );

  // Wait for members to load (useEffect runs after render)
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), 50);
  });
}

describe('suggestion sorting by play frequency', () => {
  it('sorts higher playCount before lower within same account number', async () => {
    const members = [
      makeMember({ displayName: 'Alice Smith', memberNumber: '1750', playCount: 5 }),
      makeMember({ displayName: 'Bob Smith', memberNumber: '1750', playCount: 20 }),
      makeMember({ displayName: 'Carol Smith', memberNumber: '1750', playCount: 12 }),
    ];

    const result = await setup(members);
    const suggestions = result.current.getAutocompleteSuggestions('1750');

    expect(suggestions.map((s) => s.member.name)).toEqual([
      'Bob Smith',
      'Carol Smith',
      'Alice Smith',
    ]);
  });

  it('sorts members with no play history last within same tier', async () => {
    const members = [
      makeMember({ displayName: 'Dana Smith', memberNumber: '1750', playCount: 0 }),
      makeMember({ displayName: 'Eve Smith', memberNumber: '1750', playCount: 3 }),
      makeMember({ displayName: 'Frank Smith', memberNumber: '1750', playCount: 0 }),
    ];

    const result = await setup(members);
    const suggestions = result.current.getAutocompleteSuggestions('1750');

    // Eve (3) first, then Dana and Frank (0 each, alphabetical)
    expect(suggestions.map((s) => s.member.name)).toEqual([
      'Eve Smith',
      'Dana Smith',
      'Frank Smith',
    ]);
  });

  it('preserves first-name prefix priority over play frequency', async () => {
    const members = [
      makeMember({ displayName: 'Bob Jansen', memberNumber: '2000', playCount: 50 }),
      makeMember({ displayName: 'Jan Williams', memberNumber: '2001', playCount: 1 }),
    ];

    const result = await setup(members);
    const suggestions = result.current.getAutocompleteSuggestions('Jan');

    // Both match: Jan via first-name prefix, Bob via last-name "Jansen".
    // First-name prefix tier wins despite Bob having higher playCount.
    expect(suggestions[0].member.name).toBe('Jan Williams');
    expect(suggestions[1].member.name).toBe('Bob Jansen');
  });

  it('uses play frequency as tiebreaker within first-name prefix matches', async () => {
    const members = [
      makeMember({ displayName: 'Jan Smith', memberNumber: '1750', playCount: 2 }),
      makeMember({ displayName: 'Janet Jones', memberNumber: '1800', playCount: 15 }),
      makeMember({ displayName: 'Jane Doe', memberNumber: '1900', playCount: 8 }),
    ];

    const result = await setup(members);
    const suggestions = result.current.getAutocompleteSuggestions('Jan');

    // All match first-name prefix "Jan", so sort by playCount desc
    expect(suggestions.map((s) => s.member.name)).toEqual([
      'Janet Jones',
      'Jane Doe',
      'Jan Smith',
    ]);
  });
});
