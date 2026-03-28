import {
  memberIdentityReducer,
  initialMemberIdentityState,
} from '../../../../src/registration/memberIdentity/memberIdentityReducer';

describe('memberIdentityReducer', () => {
  // Initial state
  test('returns initial state for unknown action', () => {
    const result = memberIdentityReducer(initialMemberIdentityState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialMemberIdentityState);
  });

  test('initial state has correct defaults', () => {
    expect(initialMemberIdentityState.memberNumber).toBe('');
    expect(initialMemberIdentityState.currentMemberId).toBeNull();
    expect(initialMemberIdentityState.frequentPartners).toEqual([]);
    expect(initialMemberIdentityState.frequentPartnersLoading).toBe(false);
  });

  // SET actions
  test('MEMBER_NUMBER_SET updates memberNumber', () => {
    const result = memberIdentityReducer(initialMemberIdentityState, {
      type: 'MEMBER_NUMBER_SET',
      value: '12345',
    });
    expect(result.memberNumber).toBe('12345');
  });

  test('MEMBER_NUMBER_SET can set to empty string', () => {
    const state = { ...initialMemberIdentityState, memberNumber: '12345' };
    const result = memberIdentityReducer(state, {
      type: 'MEMBER_NUMBER_SET',
      value: '',
    });
    expect(result.memberNumber).toBe('');
  });

  test('CURRENT_MEMBER_ID_SET updates currentMemberId', () => {
    const result = memberIdentityReducer(initialMemberIdentityState, {
      type: 'CURRENT_MEMBER_ID_SET',
      value: 'uuid-123',
    });
    expect(result.currentMemberId).toBe('uuid-123');
  });

  test('CURRENT_MEMBER_ID_SET can set to null', () => {
    const state = { ...initialMemberIdentityState, currentMemberId: 'uuid-123' };
    const result = memberIdentityReducer(state, {
      type: 'CURRENT_MEMBER_ID_SET',
      value: null,
    });
    expect(result.currentMemberId).toBeNull();
  });

  test('FREQUENT_PARTNERS_SET updates frequentPartners', () => {
    const partners = [
      { player: { id: 1, name: 'Partner 1' }, count: 5 },
      { player: { id: 2, name: 'Partner 2' }, count: 3 },
    ];
    const result = memberIdentityReducer(initialMemberIdentityState, {
      type: 'FREQUENT_PARTNERS_SET',
      value: partners,
    });
    expect(result.frequentPartners).toEqual(partners);
  });

  test('FREQUENT_PARTNERS_SET can set to empty array', () => {
    const state = {
      ...initialMemberIdentityState,
      frequentPartners: [{ player: { id: 1 }, count: 5 }],
    };
    const result = memberIdentityReducer(state, {
      type: 'FREQUENT_PARTNERS_SET',
      value: [],
    });
    expect(result.frequentPartners).toEqual([]);
  });

  test('FREQUENT_PARTNERS_LOADING_SET updates frequentPartnersLoading to true', () => {
    const result = memberIdentityReducer(initialMemberIdentityState, {
      type: 'FREQUENT_PARTNERS_LOADING_SET',
      value: true,
    });
    expect(result.frequentPartnersLoading).toBe(true);
  });

  test('FREQUENT_PARTNERS_LOADING_SET updates frequentPartnersLoading to false', () => {
    const state = { ...initialMemberIdentityState, frequentPartnersLoading: true };
    const result = memberIdentityReducer(state, {
      type: 'FREQUENT_PARTNERS_LOADING_SET',
      value: false,
    });
    expect(result.frequentPartnersLoading).toBe(false);
  });

  // Reset (CRITICAL: does NOT reset frequentPartners)
  test('MEMBER_IDENTITY_RESET clears member identity but NOT frequent partners', () => {
    const state = {
      memberNumber: '12345',
      currentMemberId: 'uuid-123',
      frequentPartners: [{ player: { id: 1 }, count: 5 }],
      frequentPartnersLoading: true,
    };
    const result = memberIdentityReducer(state, { type: 'MEMBER_IDENTITY_RESET' });

    expect(result.memberNumber).toBe('');
    expect(result.currentMemberId).toBeNull();
    // These are intentionally NOT reset (legacy behavior)
    expect(result.frequentPartners).toEqual([{ player: { id: 1 }, count: 5 }]);
    expect(result.frequentPartnersLoading).toBe(true);
  });

  test('MEMBER_IDENTITY_RESET preserves frequentPartnersLoading false state', () => {
    const state = {
      memberNumber: '12345',
      currentMemberId: 'uuid-123',
      frequentPartners: [],
      frequentPartnersLoading: false,
    };
    const result = memberIdentityReducer(state, { type: 'MEMBER_IDENTITY_RESET' });

    expect(result.memberNumber).toBe('');
    expect(result.currentMemberId).toBeNull();
    expect(result.frequentPartners).toEqual([]);
    expect(result.frequentPartnersLoading).toBe(false);
  });
});
