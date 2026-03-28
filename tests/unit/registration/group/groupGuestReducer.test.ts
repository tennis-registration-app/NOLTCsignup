import {
  groupGuestReducer,
  initialGroupGuestState,
} from '../../../../src/registration/group/groupGuestReducer';

describe('groupGuestReducer', () => {
  // Initial state
  test('returns initial state for unknown action', () => {
    const result = groupGuestReducer(initialGroupGuestState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialGroupGuestState);
  });

  test('initial state has correct defaults', () => {
    expect(initialGroupGuestState.currentGroup).toEqual([]);
    expect(initialGroupGuestState.guestName).toBe('');
    expect(initialGroupGuestState.guestSponsor).toBe('');
    expect(initialGroupGuestState.showGuestForm).toBe(false);
    expect(initialGroupGuestState.showGuestNameError).toBe(false);
    expect(initialGroupGuestState.showSponsorError).toBe(false);
  });

  // Group actions
  test('CURRENT_GROUP_SET updates currentGroup', () => {
    const group = [{ id: 1, name: 'John' }];
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'CURRENT_GROUP_SET',
      value: group,
    });
    expect(result.currentGroup).toEqual(group);
  });

  test('CURRENT_GROUP_PLAYER_REMOVED filters player by index', () => {
    const state = {
      ...initialGroupGuestState,
      currentGroup: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    };
    const result = groupGuestReducer(state, {
      type: 'CURRENT_GROUP_PLAYER_REMOVED',
      index: 0, // Remove first player
    });
    expect(result.currentGroup).toEqual([{ id: 2, name: 'Jane' }]);
  });

  test('CURRENT_GROUP_PLAYER_REMOVED removes middle player by index', () => {
    const state = {
      ...initialGroupGuestState,
      currentGroup: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' },
      ],
    };
    const result = groupGuestReducer(state, {
      type: 'CURRENT_GROUP_PLAYER_REMOVED',
      index: 1, // Remove middle player
    });
    expect(result.currentGroup).toEqual([
      { id: 1, name: 'John' },
      { id: 3, name: 'Bob' },
    ]);
  });

  // Guest form field actions
  test('GUEST_NAME_SET updates guestName', () => {
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'GUEST_NAME_SET',
      value: 'Guest Person',
    });
    expect(result.guestName).toBe('Guest Person');
  });

  test('GUEST_SPONSOR_SET updates guestSponsor', () => {
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'GUEST_SPONSOR_SET',
      value: '12345',
    });
    expect(result.guestSponsor).toBe('12345');
  });

  // Visibility/error actions
  test('SHOW_GUEST_FORM_SET updates showGuestForm', () => {
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'SHOW_GUEST_FORM_SET',
      value: true,
    });
    expect(result.showGuestForm).toBe(true);
  });

  test('SHOW_GUEST_NAME_ERROR_SET updates showGuestNameError', () => {
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'SHOW_GUEST_NAME_ERROR_SET',
      value: true,
    });
    expect(result.showGuestNameError).toBe(true);
  });

  test('SHOW_SPONSOR_ERROR_SET updates showSponsorError', () => {
    const result = groupGuestReducer(initialGroupGuestState, {
      type: 'SHOW_SPONSOR_ERROR_SET',
      value: true,
    });
    expect(result.showSponsorError).toBe(true);
  });

  // Reset actions
  test('GUEST_FORM_RESET clears guest form but NOT currentGroup', () => {
    const state = {
      currentGroup: [{ id: 1, name: 'John' }],
      guestName: 'Guest',
      guestSponsor: '12345',
      showGuestForm: true,
      showGuestNameError: true,
      showSponsorError: true,
    };
    const result = groupGuestReducer(state, { type: 'GUEST_FORM_RESET' });

    // currentGroup preserved
    expect(result.currentGroup).toEqual([{ id: 1, name: 'John' }]);
    // Guest form cleared
    expect(result.guestName).toBe('');
    expect(result.guestSponsor).toBe('');
    expect(result.showGuestForm).toBe(false);
    expect(result.showGuestNameError).toBe(false);
    expect(result.showSponsorError).toBe(false);
  });

  test('GROUP_RESET clears currentGroup and guest form', () => {
    const state = {
      currentGroup: [{ id: 1, name: 'John' }],
      guestName: 'Guest',
      guestSponsor: '12345',
      showGuestForm: true,
      showGuestNameError: true,
      showSponsorError: true,
    };
    const result = groupGuestReducer(state, { type: 'GROUP_RESET' });

    expect(result.currentGroup).toEqual([]);
    expect(result.guestName).toBe('');
    expect(result.guestSponsor).toBe('');
    expect(result.showGuestForm).toBe(false);
    expect(result.showGuestNameError).toBe(false);
    expect(result.showSponsorError).toBe(false);
  });
});
