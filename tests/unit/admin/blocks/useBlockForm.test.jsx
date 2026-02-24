/**
 * useBlockForm — hook coverage
 *
 * Tests default init, edit pre-fill, field validation (isValid),
 * resetForm, populateFromBlock (edit + duplicate), and change detection.
 *
 * Uses minimal React wrapper pattern (no renderHook dependency).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { useBlockForm } from '../../../../src/admin/blocks/hooks/useBlockForm.js';

// ============================================================
// Test harness
// ============================================================

function createHarness(props = {}) {
  const defaults = {
    defaultView: 'manage',
    initialEditingBlock: null,
    onEditingBlockConsumed: vi.fn(),
    ...props,
  };

  const Wrapper = forwardRef(function Wrapper(_p, ref) {
    const hook = useBlockForm(defaults);
    useImperativeHandle(ref, () => hook);
    return null;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = React.createRef();

  act(() => {
    root.render(<Wrapper ref={ref} />);
  });

  return {
    get hook() {
      return ref.current;
    },
    cleanup() {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

/** Helper: set fields to make a valid form (courts + reason + valid times) */
function makeValid(h) {
  act(() => {
    h.hook.setSelectedCourts([1, 2]);
    h.hook.setBlockReason('Maintenance');
    h.hook.setStartTime('09:00');
    h.hook.setEndTime('11:00');
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// A) Default initialization
// ============================================================

describe('default initialization', () => {
  it('selectedCourts is empty array', () => {
    const h = createHarness();
    expect(h.hook.selectedCourts).toEqual([]);
    h.cleanup();
  });

  it('blockReason is empty string', () => {
    const h = createHarness();
    expect(h.hook.blockReason).toBe('');
    h.cleanup();
  });

  it('startTime and endTime are empty strings', () => {
    const h = createHarness();
    expect(h.hook.startTime).toBe('');
    expect(h.hook.endTime).toBe('');
    h.cleanup();
  });

  it('selectedDate is today', () => {
    const h = createHarness();
    const today = new Date().toDateString();
    expect(h.hook.selectedDate.toDateString()).toBe(today);
    h.cleanup();
  });

  it('recurrence is null', () => {
    const h = createHarness();
    expect(h.hook.recurrence).toBeNull();
    h.cleanup();
  });

  it('editingBlock is null, originalValues is null', () => {
    const h = createHarness();
    expect(h.hook.editingBlock).toBeNull();
    expect(h.hook.originalValues).toBeNull();
    h.cleanup();
  });

  it('activeView matches defaultView prop', () => {
    const h = createHarness({ defaultView: 'create' });
    expect(h.hook.activeView).toBe('create');
    h.cleanup();
  });

  it('isEvent defaults to true', () => {
    const h = createHarness();
    expect(h.hook.isEvent).toBe(true);
    h.cleanup();
  });

  it('eventType defaults to "event"', () => {
    const h = createHarness();
    expect(h.hook.eventType).toBe('event');
    h.cleanup();
  });

  it('eventTitle defaults to empty string', () => {
    const h = createHarness();
    expect(h.hook.eventTitle).toBe('');
    h.cleanup();
  });

  it('isValid is falsy when form is empty', () => {
    const h = createHarness();
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('showTemplates is false, showCustomReason is false, showRecurrence is false', () => {
    const h = createHarness();
    expect(h.hook.showTemplates).toBe(false);
    expect(h.hook.showCustomReason).toBe(false);
    expect(h.hook.showRecurrence).toBe(false);
    h.cleanup();
  });
});

// ============================================================
// B) Edit mode initialization (initialEditingBlock)
// ============================================================

describe('edit mode initialization via initialEditingBlock', () => {
  const BLOCK = {
    courtNumber: 5,
    reason: 'Lesson',
    title: 'Tennis Lesson',
    blockType: 'lesson',
    startTime: '2025-06-15T09:00:00.000Z',
    endTime: '2025-06-15T11:00:00.000Z',
  };

  it('pre-fills selectedCourts from courtNumber', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.selectedCourts).toEqual([5]);
    h.cleanup();
  });

  it('pre-fills blockReason from reason', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.blockReason).toBe('Lesson');
    h.cleanup();
  });

  it('pre-fills eventTitle from title', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.eventTitle).toBe('Tennis Lesson');
    h.cleanup();
  });

  it('pre-fills eventType from blockType', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.eventType).toBe('lesson');
    h.cleanup();
  });

  it('pre-fills start and end times from ISO timestamps', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    // Times are formatted as HH:MM from the Date object
    expect(h.hook.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(h.hook.endTime).toMatch(/^\d{2}:\d{2}$/);
    h.cleanup();
  });

  it('sets editingBlock to the provided block', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.editingBlock).toBe(BLOCK);
    h.cleanup();
  });

  it('stores originalValues for change detection', () => {
    const h = createHarness({ initialEditingBlock: BLOCK });
    expect(h.hook.originalValues).not.toBeNull();
    expect(h.hook.originalValues.courts).toEqual([5]);
    expect(h.hook.originalValues.reason).toBe('Lesson');
    h.cleanup();
  });

  it('calls onEditingBlockConsumed after consuming', () => {
    const onConsumed = vi.fn();
    const h = createHarness({
      initialEditingBlock: BLOCK,
      onEditingBlockConsumed: onConsumed,
    });
    expect(onConsumed).toHaveBeenCalledOnce();
    h.cleanup();
  });

  it('uses startsAt/endsAt aliases when startTime/endTime missing', () => {
    const aliasedBlock = {
      courtNumber: 3,
      reason: 'Event',
      startsAt: '2025-06-15T14:00:00.000Z',
      endsAt: '2025-06-15T16:00:00.000Z',
    };
    const h = createHarness({ initialEditingBlock: aliasedBlock });
    expect(h.hook.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(h.hook.endTime).toMatch(/^\d{2}:\d{2}$/);
    h.cleanup();
  });

  it('handles block with no title → falls back to reason', () => {
    const noTitleBlock = {
      courtNumber: 1,
      reason: 'Maintenance',
      startTime: '2025-06-15T09:00:00.000Z',
      endTime: '2025-06-15T10:00:00.000Z',
    };
    const h = createHarness({ initialEditingBlock: noTitleBlock });
    expect(h.hook.eventTitle).toBe('Maintenance');
    h.cleanup();
  });

  it('handles block with no courtNumber → empty courts array', () => {
    const noCourtBlock = {
      reason: 'Whole-facility',
      startTime: '2025-06-15T09:00:00.000Z',
      endTime: '2025-06-15T10:00:00.000Z',
    };
    const h = createHarness({ initialEditingBlock: noCourtBlock });
    expect(h.hook.selectedCourts).toEqual([]);
    h.cleanup();
  });
});

// ============================================================
// C) Field updates
// ============================================================

describe('field updates', () => {
  it('setBlockReason updates blockReason', () => {
    const h = createHarness();
    act(() => h.hook.setBlockReason('Rain'));
    expect(h.hook.blockReason).toBe('Rain');
    h.cleanup();
  });

  it('setSelectedCourts updates selectedCourts', () => {
    const h = createHarness();
    act(() => h.hook.setSelectedCourts([1, 3, 5]));
    expect(h.hook.selectedCourts).toEqual([1, 3, 5]);
    h.cleanup();
  });

  it('setStartTime / setEndTime update times', () => {
    const h = createHarness();
    act(() => {
      h.hook.setStartTime('08:30');
      h.hook.setEndTime('10:30');
    });
    expect(h.hook.startTime).toBe('08:30');
    expect(h.hook.endTime).toBe('10:30');
    h.cleanup();
  });

  it('setActiveView updates activeView', () => {
    const h = createHarness();
    act(() => h.hook.setActiveView('create'));
    expect(h.hook.activeView).toBe('create');
    h.cleanup();
  });

  it('setRecurrence updates recurrence', () => {
    const h = createHarness();
    const rec = { frequency: 'weekly', count: 4 };
    act(() => h.hook.setRecurrence(rec));
    expect(h.hook.recurrence).toEqual(rec);
    h.cleanup();
  });

  it('setIsEvent / setEventType / setEventTitle update event fields', () => {
    const h = createHarness();
    act(() => {
      h.hook.setIsEvent(false);
      h.hook.setEventType('tournament');
      h.hook.setEventTitle('Club Championship');
    });
    expect(h.hook.isEvent).toBe(false);
    expect(h.hook.eventType).toBe('tournament');
    expect(h.hook.eventTitle).toBe('Club Championship');
    h.cleanup();
  });
});

// ============================================================
// D) Validation (isValid)
// ============================================================

describe('validation (isValid)', () => {
  it('valid when courts + reason + valid time range', () => {
    const h = createHarness();
    makeValid(h);
    expect(h.hook.isValid).toBe(true);
    h.cleanup();
  });

  it('invalid when no courts selected', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([]);
      h.hook.setBlockReason('Rain');
      h.hook.setStartTime('09:00');
      h.hook.setEndTime('11:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when reason is empty', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('');
      h.hook.setStartTime('09:00');
      h.hook.setEndTime('11:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when reason is whitespace-only', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('   ');
      h.hook.setStartTime('09:00');
      h.hook.setEndTime('11:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when startTime is missing', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('Rain');
      h.hook.setStartTime('');
      h.hook.setEndTime('11:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when endTime is missing', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('Rain');
      h.hook.setStartTime('09:00');
      h.hook.setEndTime('');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when end <= start (time range reversed)', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('Rain');
      h.hook.setStartTime('14:00');
      h.hook.setEndTime('10:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('invalid when end == start', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('Rain');
      h.hook.setStartTime('10:00');
      h.hook.setEndTime('10:00');
    });
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('valid when startTime is "now" (special value, skips time comparison)', () => {
    const h = createHarness();
    act(() => {
      h.hook.setSelectedCourts([1]);
      h.hook.setBlockReason('Emergency');
      h.hook.setStartTime('now');
      h.hook.setEndTime('23:59');
    });
    expect(h.hook.isValid).toBe(true);
    h.cleanup();
  });

  it('invalid in edit mode when no changes made', () => {
    const BLOCK = {
      courtNumber: 5,
      reason: 'Lesson',
      title: 'Lesson',
      blockType: 'maintenance',
      startTime: '2025-06-15T09:00:00.000Z',
      endTime: '2025-06-15T11:00:00.000Z',
    };
    const h = createHarness({ initialEditingBlock: BLOCK });
    // Form is pre-filled but unchanged from original → isValid should be false
    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });

  it('valid in edit mode when a field changes from original', () => {
    const BLOCK = {
      courtNumber: 5,
      reason: 'Lesson',
      title: 'Lesson',
      blockType: 'maintenance',
      startTime: '2025-06-15T09:00:00.000Z',
      endTime: '2025-06-15T11:00:00.000Z',
    };
    const h = createHarness({ initialEditingBlock: BLOCK });
    // Change the reason
    act(() => h.hook.setBlockReason('Updated Lesson'));
    expect(h.hook.isValid).toBe(true);
    h.cleanup();
  });
});

// ============================================================
// E) resetForm
// ============================================================

describe('resetForm', () => {
  it('clears all fields to defaults', () => {
    const h = createHarness();
    makeValid(h);
    // Also set some optional fields
    act(() => {
      h.hook.setRecurrence({ freq: 'weekly' });
      h.hook.setEditingBlock({ id: 'block-1' });
      h.hook.setEventTitle('My Event');
      h.hook.setIsEvent(true);
    });

    act(() => h.hook.resetForm());

    expect(h.hook.selectedCourts).toEqual([]);
    expect(h.hook.blockReason).toBe('');
    expect(h.hook.startTime).toBe('');
    expect(h.hook.endTime).toBe('');
    expect(h.hook.recurrence).toBeNull();
    expect(h.hook.editingBlock).toBeNull();
    expect(h.hook.originalValues).toBeNull();
    expect(h.hook.isEvent).toBe(false);
    expect(h.hook.eventType).toBe('event');
    expect(h.hook.eventTitle).toBe('');
    h.cleanup();
  });

  it('makes isValid false after reset', () => {
    const h = createHarness();
    makeValid(h);
    expect(h.hook.isValid).toBe(true);

    act(() => h.hook.resetForm());

    expect(h.hook.isValid).toBeFalsy();
    h.cleanup();
  });
});

// ============================================================
// F) populateFromBlock — edit mode
// ============================================================

describe('populateFromBlock (edit)', () => {
  const BLOCK = {
    courtNumber: 3,
    reason: 'Tournament',
    startTime: '2025-07-01T10:00:00.000Z',
    endTime: '2025-07-01T14:00:00.000Z',
    isEvent: true,
    eventDetails: { title: 'Club Open', type: 'tournament' },
  };

  it('sets editingBlock to the block', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.editingBlock).toBe(BLOCK);
    h.cleanup();
  });

  it('sets selectedCourts to [courtNumber]', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.selectedCourts).toEqual([3]);
    h.cleanup();
  });

  it('sets blockReason from reason', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.blockReason).toBe('Tournament');
    h.cleanup();
  });

  it('parses start/end times to HH:MM', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(h.hook.endTime).toMatch(/^\d{2}:\d{2}$/);
    h.cleanup();
  });

  it('sets activeView to "create"', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.activeView).toBe('create');
    h.cleanup();
  });

  it('populates event fields when block.isEvent is true', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.isEvent).toBe(true);
    expect(h.hook.eventTitle).toBe('Club Open');
    expect(h.hook.eventType).toBe('tournament');
    h.cleanup();
  });

  it('stores originalValues for change detection', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK));
    expect(h.hook.originalValues).not.toBeNull();
    expect(h.hook.originalValues.courts).toEqual([3]);
    expect(h.hook.originalValues.reason).toBe('Tournament');
    expect(h.hook.originalValues.title).toBe('Club Open');
    expect(h.hook.originalValues.eventType).toBe('tournament');
    h.cleanup();
  });
});

// ============================================================
// G) populateFromBlock — duplicate mode
// ============================================================

describe('populateFromBlock (duplicate)', () => {
  const BLOCK = {
    courtNumbers: [1, 2],
    reason: 'Lesson',
    startTime: '2025-07-01T10:00:00.000Z',
    endTime: '2025-07-01T12:00:00.000Z',
    isEvent: true,
    eventDetails: { title: 'Morning Lesson', type: 'lesson' },
  };

  it('does NOT set editingBlock (creates new)', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.editingBlock).toBeNull();
    h.cleanup();
  });

  it('does NOT store originalValues', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.originalValues).toBeNull();
    h.cleanup();
  });

  it('sets selectedCourts from courtNumbers', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.selectedCourts).toEqual([1, 2]);
    h.cleanup();
  });

  it('sets startTime to "now"', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.startTime).toBe('now');
    h.cleanup();
  });

  it('computes endTime from original duration', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    // endTime should be HH:MM format (computed from now + 2hrs)
    expect(h.hook.endTime).toMatch(/^\d{2}:\d{2}$/);
    h.cleanup();
  });

  it('appends " (Copy)" to event title', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.eventTitle).toBe('Morning Lesson (Copy)');
    h.cleanup();
  });

  it('preserves event type', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.isEvent).toBe(true);
    expect(h.hook.eventType).toBe('lesson');
    h.cleanup();
  });

  it('sets activeView to "create"', () => {
    const h = createHarness();
    act(() => h.hook.populateFromBlock(BLOCK, { duplicate: true }));
    expect(h.hook.activeView).toBe('create');
    h.cleanup();
  });

  it('non-event duplicate clears event fields', () => {
    const nonEventBlock = {
      courtNumbers: [1],
      reason: 'WET COURT',
      startTime: '2025-07-01T10:00:00.000Z',
      endTime: '2025-07-01T12:00:00.000Z',
      isEvent: false,
    };
    const h = createHarness();
    act(() => h.hook.populateFromBlock(nonEventBlock, { duplicate: true }));
    expect(h.hook.isEvent).toBe(false);
    expect(h.hook.eventTitle).toBe('');
    expect(h.hook.eventType).toBe('event');
    h.cleanup();
  });
});

// ============================================================
// H) UI toggle setters
// ============================================================

describe('UI toggle setters', () => {
  it('setShowTemplates toggles showTemplates', () => {
    const h = createHarness();
    act(() => h.hook.setShowTemplates(true));
    expect(h.hook.showTemplates).toBe(true);
    act(() => h.hook.setShowTemplates(false));
    expect(h.hook.showTemplates).toBe(false);
    h.cleanup();
  });

  it('setTimePickerMode updates timePickerMode', () => {
    const h = createHarness();
    expect(h.hook.timePickerMode).toBe('visual');
    act(() => h.hook.setTimePickerMode('manual'));
    expect(h.hook.timePickerMode).toBe('manual');
    h.cleanup();
  });

  it('setShowCustomReason toggles showCustomReason', () => {
    const h = createHarness();
    act(() => h.hook.setShowCustomReason(true));
    expect(h.hook.showCustomReason).toBe(true);
    h.cleanup();
  });

  it('setShowRecurrence toggles showRecurrence', () => {
    const h = createHarness();
    act(() => h.hook.setShowRecurrence(true));
    expect(h.hook.showRecurrence).toBe(true);
    h.cleanup();
  });

  it('setSelectedBlock sets selectedBlock', () => {
    const h = createHarness();
    const block = { id: 'block-42' };
    act(() => h.hook.setSelectedBlock(block));
    expect(h.hook.selectedBlock).toBe(block);
    h.cleanup();
  });

  it('setRefreshTrigger updates refreshTrigger', () => {
    const h = createHarness();
    expect(h.hook.refreshTrigger).toBe(0);
    act(() => h.hook.setRefreshTrigger(1));
    expect(h.hook.refreshTrigger).toBe(1);
    h.cleanup();
  });
});
