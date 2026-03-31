import type { GroupPlayer } from '../../types/appTypes';
/**
 * Group/Guest Reducer
 * Manages group composition and guest form state.
 *
 * NOTE: guestCounter is NOT in this reducer (kept in App.jsx until handleAddGuest extracted).
 * NOTE: GROUP_RESET does not exist here - use individual resets or handle in App.jsx.
 */

export interface GroupGuestState {
  currentGroup: GroupPlayer[];
  guestName: string;
  guestSponsor: string;
  showGuestForm: boolean;
  showGuestNameError: boolean;
  showSponsorError: boolean;
}

type GroupGuestAction =
  | { type: 'CURRENT_GROUP_SET'; value: GroupPlayer[] }
  | { type: 'CURRENT_GROUP_PLAYER_REMOVED'; index: number }
  | { type: 'GUEST_NAME_SET'; value: string }
  | { type: 'GUEST_SPONSOR_SET'; value: string }
  | { type: 'SHOW_GUEST_FORM_SET'; value: boolean }
  | { type: 'SHOW_GUEST_NAME_ERROR_SET'; value: boolean }
  | { type: 'SHOW_SPONSOR_ERROR_SET'; value: boolean }
  | { type: 'GUEST_FORM_RESET' }
  | { type: 'GROUP_RESET' };

export const initialGroupGuestState: GroupGuestState = {
  currentGroup: [],
  guestName: '',
  guestSponsor: '',
  showGuestForm: false,
  showGuestNameError: false,
  showSponsorError: false,
};

export function groupGuestReducer(state: GroupGuestState, action: GroupGuestAction): GroupGuestState {
  switch (action.type) {
    // Group
    case 'CURRENT_GROUP_SET':
      return { ...state, currentGroup: action.value };

    case 'CURRENT_GROUP_PLAYER_REMOVED':
      return {
        ...state,
        currentGroup: state.currentGroup.filter((_, i) => i !== action.index),
      };

    // Guest form fields
    case 'GUEST_NAME_SET':
      return { ...state, guestName: action.value };

    case 'GUEST_SPONSOR_SET':
      return { ...state, guestSponsor: action.value };

    // Guest form visibility/errors
    case 'SHOW_GUEST_FORM_SET':
      return { ...state, showGuestForm: action.value };

    case 'SHOW_GUEST_NAME_ERROR_SET':
      return { ...state, showGuestNameError: action.value };

    case 'SHOW_SPONSOR_ERROR_SET':
      return { ...state, showSponsorError: action.value };

    // Reset guest form only (NOT currentGroup)
    case 'GUEST_FORM_RESET':
      return {
        ...state,
        guestName: '',
        guestSponsor: '',
        showGuestForm: false,
        showGuestNameError: false,
        showSponsorError: false,
        // currentGroup intentionally NOT reset
      };

    // Reset group + guest form
    case 'GROUP_RESET':
      return {
        ...state,
        currentGroup: [],
        guestName: '',
        guestSponsor: '',
        showGuestForm: false,
        showGuestNameError: false,
        showSponsorError: false,
        // guestCounter NOT in this reducer
      };

    default:
      return state;
  }
}
