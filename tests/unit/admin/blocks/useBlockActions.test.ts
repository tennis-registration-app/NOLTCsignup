/**
 * useBlockActions — pure orchestration function tests
 *
 * Despite the "use" prefix and hooks/ folder, this is a plain function:
 * no useState, useEffect, or useCallback. It takes { form, backend,
 * onApplyBlocks, onNotification } and returns action handlers.
 *
 * We mock form setters as vi.fn(), backend at the boundary,
 * and let real expandRecurrenceDates + getEventTypeFromReason run.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger (used for debug/error logging inside actions)
vi.mock('../../../../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useBlockActions } from '../../../../src/admin/blocks/hooks/useBlockActions.js';

// ============================================================
// Helpers
// ============================================================

/**
 * Build a mock form object matching the shape destructured by useBlockActions.
 * State values are plain values; setters are vi.fn().
 */
function createMockForm(overrides: Record<string, any> = {}) {
  return {
    // State values
    selectedCourts: overrides.selectedCourts ?? [1, 2],
    blockReason: overrides.blockReason ?? 'Maintenance work',
    startTime: overrides.startTime ?? '08:00',
    endTime: overrides.endTime ?? '10:00',
    selectedDate: overrides.selectedDate ?? new Date('2025-06-15T00:00:00'),
    recurrence: overrides.recurrence ?? null,
    isEvent: overrides.isEvent ?? false,
    eventType: overrides.eventType ?? '',
    eventTitle: overrides.eventTitle ?? '',
    editingBlock: overrides.editingBlock ?? null,
    // Setters
    setSelectedCourts: overrides.setSelectedCourts ?? vi.fn(),
    setBlockReason: overrides.setBlockReason ?? vi.fn(),
    setStartTime: overrides.setStartTime ?? vi.fn(),
    setEndTime: overrides.setEndTime ?? vi.fn(),
    setActiveView: overrides.setActiveView ?? vi.fn(),
    setShowTemplates: overrides.setShowTemplates ?? vi.fn(),
    setShowCustomReason: overrides.setShowCustomReason ?? vi.fn(),
    setIsEvent: overrides.setIsEvent ?? vi.fn(),
    setEventType: overrides.setEventType ?? vi.fn(),
    setEventTitle: overrides.setEventTitle ?? vi.fn(),
    setSelectedBlock: overrides.setSelectedBlock ?? vi.fn(),
    setRefreshTrigger: overrides.setRefreshTrigger ?? vi.fn(),
    resetForm: overrides.resetForm ?? vi.fn(),
  };
}

function createMockBackend(overrides: Record<string, any> = {}) {
  return {
    admin: {
      cancelBlock: vi.fn().mockResolvedValue({ ok: true }),
      ...overrides.admin,
    },
  };
}

function setup(opts: Record<string, any> = {}) {
  const form = createMockForm(opts.form);
  const backend = opts.backend !== undefined ? opts.backend : createMockBackend(opts.backendOverrides);
  const onApplyBlocks = opts.onApplyBlocks ?? vi.fn();
  const onNotification = opts.onNotification ?? vi.fn();

  const actions = useBlockActions({ form, backend, onApplyBlocks, onNotification });
  return { actions, form, backend, onApplyBlocks, onNotification };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// A) handleTemplateSelect
// ============================================================

describe('handleTemplateSelect', () => {
  it('sets reason and times from template with explicit start/end', () => {
    const { actions, form } = setup();

    actions.handleTemplateSelect({
      reason: 'Tennis Lesson',
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(form.setBlockReason).toHaveBeenCalledWith('Tennis Lesson');
    expect(form.setStartTime).toHaveBeenCalledWith('09:00');
    expect(form.setEndTime).toHaveBeenCalledWith('10:00');
    expect(form.setShowTemplates).toHaveBeenCalledWith(false);
  });

  it('sets start to current time HH:MM and computes end from duration', () => {
    const { actions, form } = setup();

    actions.handleTemplateSelect({
      reason: 'Quick block',
      duration: 60,
    });

    expect(form.setBlockReason).toHaveBeenCalledWith('Quick block');
    // startTime is current time as HH:MM (not 'now')
    const startArg = form.setStartTime.mock.calls[0][0];
    expect(startArg).toMatch(/^\d{2}:\d{2}$/);
    // endTime is computed from current time + 60 min
    const endArg = form.setEndTime.mock.calls[0][0];
    expect(endArg).toMatch(/^\d{2}:\d{2}$/);
    expect(form.setShowTemplates).toHaveBeenCalledWith(false);
  });
});

// ============================================================
// B) handleRemoveBlock
// ============================================================

describe('handleRemoveBlock', () => {
  it('calls backend.admin.cancelBlock and triggers refresh on success', async () => {
    const { actions, backend, form, onNotification } = setup();

    await actions.handleRemoveBlock('block-uuid-1');

    expect(backend.admin.cancelBlock).toHaveBeenCalledWith({ blockId: 'block-uuid-1' });
    expect(form.setRefreshTrigger).toHaveBeenCalledOnce();
    expect(onNotification).not.toHaveBeenCalled();
  });

  it('notifies error when cancelBlock returns ok:false', async () => {
    const { actions, onNotification } = setup({
      backendOverrides: {
        admin: { cancelBlock: vi.fn().mockResolvedValue({ ok: false, message: 'Not found' }) },
      },
    });

    await actions.handleRemoveBlock('block-1');

    expect(onNotification).toHaveBeenCalledWith(
      expect.stringContaining('Not found'),
      'error'
    );
  });

  it('notifies error when cancelBlock throws', async () => {
    const { actions, onNotification } = setup({
      backendOverrides: {
        admin: { cancelBlock: vi.fn().mockRejectedValue(new Error('Network')) },
      },
    });

    await actions.handleRemoveBlock('block-1');

    expect(onNotification).toHaveBeenCalledWith(
      expect.stringContaining('Network'),
      'error'
    );
  });

  it('notifies error when backend is null', async () => {
    const { actions, onNotification } = setup({ backend: null });

    await actions.handleRemoveBlock('block-1');

    expect(onNotification).toHaveBeenCalledWith('Backend not available', 'error');
  });
});

// ============================================================
// C) handleBlockCourts
// ============================================================

describe('handleBlockCourts', () => {
  it('builds blocks for each court and calls onApplyBlocks', () => {
    const { actions, onApplyBlocks, form } = setup({
      form: {
        selectedCourts: [1, 3],
        blockReason: 'Maintenance work',
        startTime: '08:00',
        endTime: '10:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
        isEvent: false,
        eventTitle: '',
      },
    });

    actions.handleBlockCourts();

    expect(onApplyBlocks).toHaveBeenCalledOnce();
    const blocks = onApplyBlocks.mock.calls[0][0];
    expect(blocks).toHaveLength(2);

    // Verify first block shape
    expect(blocks[0]).toEqual(
      expect.objectContaining({
        courtNumber: 1,
        reason: 'Maintenance work',
        title: 'Maintenance work',
        isEvent: false,
        eventDetails: null,
      })
    );
    expect(blocks[1].courtNumber).toBe(3);

    // Start/end times are ISO strings on the selected date
    const start = new Date(blocks[0].startTime);
    expect(start.getHours()).toBe(8);
    expect(start.getMinutes()).toBe(0);

    const end = new Date(blocks[0].endTime);
    expect(end.getHours()).toBe(10);
    expect(end.getMinutes()).toBe(0);

    // Form should be reset after apply
    expect(form.resetForm).toHaveBeenCalledOnce();
  });

  it('parses HH:MM startTime into correct ISO timestamp on selected date', () => {
    const { actions, onApplyBlocks } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Quick block',
        startTime: '14:30',
        endTime: '23:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
      },
    });

    actions.handleBlockCourts();

    const blocks = onApplyBlocks.mock.calls[0][0];
    const start = new Date(blocks[0].startTime);
    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(30);
  });

  it('adds a day to endTime when it is before startTime (overnight block)', () => {
    const { actions, onApplyBlocks } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Overnight',
        startTime: '22:00',
        endTime: '06:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
      },
    });

    actions.handleBlockCourts();

    const blocks = onApplyBlocks.mock.calls[0][0];
    const start = new Date(blocks[0].startTime);
    const end = new Date(blocks[0].endTime);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(end.getDate()).toBe(start.getDate() + 1);
  });

  it('includes event details when isEvent is true', () => {
    const { actions, onApplyBlocks } = setup({
      form: {
        selectedCourts: [2],
        blockReason: 'Tournament Match',
        startTime: '09:00',
        endTime: '12:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
        isEvent: true,
        eventType: 'tournament',
        eventTitle: 'Club Championship',
      },
    });

    actions.handleBlockCourts();

    const block = onApplyBlocks.mock.calls[0][0][0];
    expect(block.isEvent).toBe(true);
    expect(block.eventDetails).toEqual({
      title: 'Club Championship',
      type: 'tournament',
      courts: [2],
    });
  });

  it('uses eventTitle for block title when provided', () => {
    const { actions, onApplyBlocks } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Tennis lesson',
        startTime: '08:00',
        endTime: '09:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
        isEvent: true,
        eventTitle: 'Beginner Group Lesson',
      },
    });

    actions.handleBlockCourts();

    const block = onApplyBlocks.mock.calls[0][0][0];
    expect(block.title).toBe('Beginner Group Lesson');
  });

  it('removes old block when editing', async () => {
    const cancelBlock = vi.fn().mockResolvedValue({ ok: true });
    const { actions, onApplyBlocks, form } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Updated reason',
        startTime: '08:00',
        endTime: '10:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
        editingBlock: { id: 'old-block-id' },
      },
      backendOverrides: { admin: { cancelBlock } },
    });

    await actions.handleBlockCourts();

    // Should call handleRemoveBlock for old block
    expect(cancelBlock).toHaveBeenCalledWith({ blockId: 'old-block-id' });
    // Should still apply the new blocks
    expect(onApplyBlocks).toHaveBeenCalledOnce();
    expect(form.resetForm).toHaveBeenCalledOnce();
  });

  it('does not apply new blocks when cancel of old block fails during edit', async () => {
    const cancelBlock = vi.fn().mockRejectedValue(new Error('Network error'));
    const onApplyBlocks = vi.fn();
    const { actions } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Updated reason',
        startTime: '08:00',
        endTime: '10:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: null,
        editingBlock: { id: 'old-block-id' },
      },
      backendOverrides: { admin: { cancelBlock } },
      onApplyBlocks,
    });

    await actions.handleBlockCourts();

    // Cancel was attempted
    expect(cancelBlock).toHaveBeenCalledWith({ blockId: 'old-block-id' });
    // New blocks should NOT be applied — cancel failed
    expect(onApplyBlocks).not.toHaveBeenCalled();
  });

  it('expands recurrence dates for multiple occurrences', () => {
    const { actions, onApplyBlocks } = setup({
      form: {
        selectedCourts: [1],
        blockReason: 'Weekly lesson',
        startTime: '09:00',
        endTime: '10:00',
        selectedDate: new Date('2025-06-15T00:00:00'),
        recurrence: {
          pattern: 'weekly',
          frequency: 1,
          endType: 'after',
          occurrences: 3,
        },
      },
    });

    actions.handleBlockCourts();

    const blocks = onApplyBlocks.mock.calls[0][0];
    // 3 occurrences × 1 court = 3 blocks
    expect(blocks).toHaveLength(3);
  });
});

// ============================================================
// D) toggleCourtSelection
// ============================================================

describe('toggleCourtSelection', () => {
  it('calls setSelectedCourts with updater function', () => {
    const { actions, form } = setup();

    actions.toggleCourtSelection(5);

    expect(form.setSelectedCourts).toHaveBeenCalledOnce();
    // The argument should be a function (updater pattern)
    const updater = form.setSelectedCourts.mock.calls[0][0];
    expect(typeof updater).toBe('function');
  });

  it('adds court when not already selected', () => {
    const { actions, form } = setup();

    actions.toggleCourtSelection(5);

    const updater = form.setSelectedCourts.mock.calls[0][0];
    const result = updater([1, 2]);
    expect(result).toEqual([1, 2, 5]);
  });

  it('removes court when already selected', () => {
    const { actions, form } = setup();

    actions.toggleCourtSelection(2);

    const updater = form.setSelectedCourts.mock.calls[0][0];
    const result = updater([1, 2, 3]);
    expect(result).toEqual([1, 3]);
  });
});

// ============================================================
// E) handleEditBlock
// ============================================================

describe('handleEditBlock', () => {
  it('sets selected block for editing', () => {
    const { actions, form } = setup();
    const block = { id: 'block-1', reason: 'Test' };

    actions.handleEditBlock(block);

    expect(form.setSelectedBlock).toHaveBeenCalledWith(block);
  });
});

// ============================================================
// F) handleDuplicateBlock
// ============================================================

describe('handleDuplicateBlock', () => {
  it('resets courts, copies reason, sets start to now, computes end from duration', () => {
    const { actions, form } = setup();
    const block = {
      reason: 'Maintenance work',
      startTime: '2025-06-15T08:00:00.000Z',
      endTime: '2025-06-15T10:00:00.000Z',
    };

    actions.handleDuplicateBlock(block);

    expect(form.setSelectedCourts).toHaveBeenCalledWith([]);
    expect(form.setBlockReason).toHaveBeenCalledWith('Maintenance work');
    // startTime is current time as HH:MM (not 'now')
    const startArg = form.setStartTime.mock.calls[0][0];
    expect(startArg).toMatch(/^\d{2}:\d{2}$/);
    // endTime computed from now + 2hr duration
    const endArg = form.setEndTime.mock.calls[0][0];
    expect(endArg).toMatch(/^\d{2}:\d{2}$/);
    expect(form.setActiveView).toHaveBeenCalledWith('create');
  });
});

// ============================================================
// G) handleQuickReasonSelect
// ============================================================

describe('handleQuickReasonSelect', () => {
  it('sets reason and auto-detects event type for "Tennis Lesson"', () => {
    const { actions, form } = setup();

    actions.handleQuickReasonSelect('Tennis Lesson');

    expect(form.setBlockReason).toHaveBeenCalledWith('Tennis Lesson');
    expect(form.setEventType).toHaveBeenCalledWith('lesson');
    expect(form.setIsEvent).toHaveBeenCalledWith(true);
    expect(form.setEventTitle).toHaveBeenCalledWith('Tennis Lesson');
    expect(form.setShowCustomReason).toHaveBeenCalledWith(false);
  });

  it('sets reason and event type for "Tournament"', () => {
    const { actions, form } = setup();

    actions.handleQuickReasonSelect('Club Tournament');

    expect(form.setBlockReason).toHaveBeenCalledWith('Club Tournament');
    expect(form.setEventType).toHaveBeenCalledWith('tournament');
    expect(form.setIsEvent).toHaveBeenCalledWith(true);
  });

  it('sets isEvent to false for WET COURT reason', () => {
    const { actions, form } = setup();

    actions.handleQuickReasonSelect('WET COURT');

    expect(form.setBlockReason).toHaveBeenCalledWith('WET COURT');
    expect(form.setIsEvent).toHaveBeenCalledWith(false);
    expect(form.setEventTitle).toHaveBeenCalledWith('');
  });

  it('does not overwrite existing eventTitle unless it contains "(Copy)"', () => {
    const { actions, form } = setup({
      form: { eventTitle: 'My Custom Title' },
    });

    actions.handleQuickReasonSelect('Tennis Lesson');

    // eventTitle should NOT be overwritten because it's already set
    expect(form.setEventTitle).not.toHaveBeenCalled();
  });

  it('overwrites eventTitle when it contains "(Copy)"', () => {
    const { actions, form } = setup({
      form: { eventTitle: 'Old Title (Copy)' },
    });

    actions.handleQuickReasonSelect('Tennis Lesson');

    expect(form.setEventTitle).toHaveBeenCalledWith('Tennis Lesson');
  });
});

// ============================================================
// H) handleOtherClick
// ============================================================

describe('handleOtherClick', () => {
  it('enables custom reason mode and clears reason', () => {
    const { actions, form } = setup();

    actions.handleOtherClick();

    expect(form.setShowCustomReason).toHaveBeenCalledWith(true);
    expect(form.setBlockReason).toHaveBeenCalledWith('');
  });
});
