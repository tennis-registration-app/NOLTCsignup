/**
 * Group/Guest Reducer
 * Manages group composition and guest form state.
 *
 * NOTE: guestCounter is NOT in this reducer (kept in App.jsx until handleAddGuest extracted).
 * NOTE: GROUP_RESET does not exist here - use individual resets or handle in App.jsx.
 */

export const initialGroupGuestState = {
  currentGroup: [],
  guestName: '',
  guestSponsor: '',
  showGuestForm: false,
  showGuestNameError: false,
  showSponsorError: false,
};

export function groupGuestReducer(state, action) {
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
