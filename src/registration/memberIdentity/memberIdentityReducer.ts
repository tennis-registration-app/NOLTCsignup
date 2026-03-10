/**
 * Member Identity Reducer
 * Manages member identity state and frequent partners.
 *
 * NOTE: frequentPartnersCacheRef is in the hook (useRef), not reducer.
 * NOTE: fetchFrequentPartners is in the hook.
 * NOTE: useEffect that triggers fetch stays in App.jsx.
 */

export interface MemberIdentityState {
  memberNumber: string;
  currentMemberId: string | null;
  frequentPartners: unknown[];
  frequentPartnersLoading: boolean;
}

type MemberIdentityAction =
  | { type: 'MEMBER_NUMBER_SET'; value: string }
  | { type: 'CURRENT_MEMBER_ID_SET'; value: string | null }
  | { type: 'FREQUENT_PARTNERS_SET'; value: unknown[] }
  | { type: 'FREQUENT_PARTNERS_LOADING_SET'; value: boolean }
  | { type: 'MEMBER_IDENTITY_RESET' };

export const initialMemberIdentityState: MemberIdentityState = {
  memberNumber: '',
  currentMemberId: null,
  frequentPartners: [],
  frequentPartnersLoading: false,
};

export function memberIdentityReducer(state: MemberIdentityState, action: MemberIdentityAction): MemberIdentityState {
  switch (action.type) {
    case 'MEMBER_NUMBER_SET':
      return { ...state, memberNumber: action.value };

    case 'CURRENT_MEMBER_ID_SET':
      return { ...state, currentMemberId: action.value };

    case 'FREQUENT_PARTNERS_SET':
      return { ...state, frequentPartners: action.value };

    case 'FREQUENT_PARTNERS_LOADING_SET':
      return { ...state, frequentPartnersLoading: action.value };

    // Reset member identity (for resetForm and timeout)
    // NOTE: Does NOT reset frequentPartners/frequentPartnersLoading (legacy behavior)
    case 'MEMBER_IDENTITY_RESET':
      return {
        ...state,
        memberNumber: '',
        currentMemberId: null,
        // frequentPartners and frequentPartnersLoading intentionally NOT reset
      };

    default:
      return state;
  }
}
