/**
 * Block Admin Reducer
 * Manages block creation UI state.
 *
 * IMPORTANT: blockingInProgress is set true and NEVER reset by legacy.
 * This is preserved behavior - do not "fix" it.
 */

export interface BlockAdminState {
  showBlockModal: boolean;
  blockingInProgress: boolean;
  selectedCourtsToBlock: number[];
  blockMessage: string;
  blockStartTime: string;
  blockEndTime: string;
  blockWarningMinutes: number;
}

type BlockAdminAction =
  | { type: 'BLOCK_MODAL_OPENED' }
  | { type: 'BLOCK_MODAL_CLOSED' }
  | { type: 'BLOCK_COURTS_SELECTED'; courts: number[] }
  | { type: 'BLOCK_MESSAGE_SET'; message: string }
  | { type: 'BLOCK_START_TIME_SET'; startTime: string }
  | { type: 'BLOCK_END_TIME_SET'; endTime: string }
  | { type: 'BLOCK_WARNING_MINUTES_SET'; warningMinutes: number }
  | { type: 'BLOCK_IN_PROGRESS_SET'; value: boolean }
  | { type: 'BLOCK_FORM_RESET' };

export const initialBlockAdminState: BlockAdminState = {
  showBlockModal: false,
  blockingInProgress: false,
  selectedCourtsToBlock: [],
  blockMessage: '',
  blockStartTime: 'now',
  blockEndTime: '',
  blockWarningMinutes: 0,
};

export function blockAdminReducer(state: BlockAdminState, action: BlockAdminAction): BlockAdminState {
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
