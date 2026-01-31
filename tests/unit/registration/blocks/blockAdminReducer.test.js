import {
  blockAdminReducer,
  initialBlockAdminState,
} from '../../../../src/registration/blocks/blockAdminReducer';

describe('blockAdminReducer', () => {
  // Initial state
  test('returns initial state for unknown action', () => {
    const result = blockAdminReducer(initialBlockAdminState, { type: 'UNKNOWN' });
    expect(result).toEqual(initialBlockAdminState);
  });

  // Modal actions
  test('BLOCK_MODAL_OPENED sets showBlockModal true', () => {
    const result = blockAdminReducer(initialBlockAdminState, { type: 'BLOCK_MODAL_OPENED' });
    expect(result.showBlockModal).toBe(true);
  });

  test('BLOCK_MODAL_CLOSED sets showBlockModal false', () => {
    const state = { ...initialBlockAdminState, showBlockModal: true };
    const result = blockAdminReducer(state, { type: 'BLOCK_MODAL_CLOSED' });
    expect(result.showBlockModal).toBe(false);
  });

  test('BLOCK_MODAL_CLOSED does NOT reset blockingInProgress', () => {
    const state = { ...initialBlockAdminState, showBlockModal: true, blockingInProgress: true };
    const result = blockAdminReducer(state, { type: 'BLOCK_MODAL_CLOSED' });
    expect(result.blockingInProgress).toBe(true); // Preserved!
  });

  // Form field actions
  test('BLOCK_COURTS_SELECTED updates selectedCourtsToBlock', () => {
    const courts = [1, 2, 3];
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_COURTS_SELECTED',
      courts,
    });
    expect(result.selectedCourtsToBlock).toEqual(courts);
  });

  test('BLOCK_MESSAGE_SET updates blockMessage', () => {
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_MESSAGE_SET',
      message: 'Test',
    });
    expect(result.blockMessage).toBe('Test');
  });

  test('BLOCK_START_TIME_SET updates blockStartTime', () => {
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_START_TIME_SET',
      startTime: '10:00',
    });
    expect(result.blockStartTime).toBe('10:00');
  });

  test('BLOCK_END_TIME_SET updates blockEndTime', () => {
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_END_TIME_SET',
      endTime: '12:00',
    });
    expect(result.blockEndTime).toBe('12:00');
  });

  test('BLOCK_WARNING_MINUTES_SET updates blockWarningMinutes', () => {
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_WARNING_MINUTES_SET',
      warningMinutes: 15,
    });
    expect(result.blockWarningMinutes).toBe(15);
  });

  // Progress bridge (critical - direct boolean)
  test('BLOCK_IN_PROGRESS_SET true sets blockingInProgress true', () => {
    const result = blockAdminReducer(initialBlockAdminState, {
      type: 'BLOCK_IN_PROGRESS_SET',
      value: true,
    });
    expect(result.blockingInProgress).toBe(true);
  });

  test('BLOCK_IN_PROGRESS_SET false sets blockingInProgress false', () => {
    const state = { ...initialBlockAdminState, blockingInProgress: true };
    const result = blockAdminReducer(state, { type: 'BLOCK_IN_PROGRESS_SET', value: false });
    expect(result.blockingInProgress).toBe(false);
  });

  // Reset (critical - does NOT reset blockingInProgress)
  test('BLOCK_FORM_RESET resets form fields but NOT blockingInProgress', () => {
    const state = {
      showBlockModal: true,
      blockingInProgress: true, // This must NOT be reset
      selectedCourtsToBlock: [1, 2],
      blockMessage: 'Test',
      blockStartTime: '10:00',
      blockEndTime: '12:00',
      blockWarningMinutes: 15,
    };
    const result = blockAdminReducer(state, { type: 'BLOCK_FORM_RESET' });

    expect(result.showBlockModal).toBe(false);
    expect(result.blockingInProgress).toBe(true); // Preserved!
    expect(result.selectedCourtsToBlock).toEqual([]);
    expect(result.blockMessage).toBe('');
    expect(result.blockStartTime).toBe('now');
    expect(result.blockEndTime).toBe('');
    expect(result.blockWarningMinutes).toBe(0);
  });
});
