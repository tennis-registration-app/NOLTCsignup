/**
 * Block Admin Reducer
 * Manages block creation UI state.
 *
 * IMPORTANT: blockingInProgress is set true and NEVER reset by legacy.
 * This is preserved behavior - do not "fix" it.
 */

export const initialBlockAdminState = {
  showBlockModal: false,
  blockingInProgress: false,
  selectedCourtsToBlock: [],
  blockMessage: '',
  blockStartTime: 'now',
  blockEndTime: '',
  blockWarningMinutes: 0,
};

export function blockAdminReducer(state, action) {
  switch (action.type) {
    case 'BLOCK_MODAL_OPENED':
      return { ...state, showBlockModal: true };

    case 'BLOCK_MODAL_CLOSED':
      // NOTE: Does NOT reset blockingInProgress (legacy behavior)
      return { ...state, showBlockModal: false };

    case 'BLOCK_COURTS_SELECTED':
      return { ...state, selectedCourtsToBlock: action.courts };

    case 'BLOCK_MESSAGE_SET':
      return { ...state, blockMessage: action.message };

    case 'BLOCK_START_TIME_SET':
      return { ...state, blockStartTime: action.startTime };

    case 'BLOCK_END_TIME_SET':
      return { ...state, blockEndTime: action.endTime };

    case 'BLOCK_WARNING_MINUTES_SET':
      return { ...state, blockWarningMinutes: action.warningMinutes };

    case 'BLOCK_IN_PROGRESS_SET':
      // Direct boolean assignment - preserves exact legacy setter semantics
      return { ...state, blockingInProgress: action.value };

    case 'BLOCK_FORM_RESET':
      // NOTE: Does NOT reset blockingInProgress (legacy behavior)
      return {
        ...state,
        showBlockModal: false,
        selectedCourtsToBlock: [],
        blockMessage: '',
        blockStartTime: 'now',
        blockEndTime: '',
        blockWarningMinutes: 0,
        // blockingInProgress intentionally NOT reset
      };

    default:
      return state;
  }
}
