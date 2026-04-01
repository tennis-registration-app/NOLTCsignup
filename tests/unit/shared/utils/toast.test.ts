/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from '../../../../src/shared/utils/toast';

describe('toast', () => {
  let events: CustomEvent[];
  let handler: (e: Event) => void;

  beforeEach(() => {
    events = [];
    handler = (e) => events.push(e);
    window.addEventListener('UI_TOAST', handler);
  });

  afterEach(() => {
    window.removeEventListener('UI_TOAST', handler);
    events = [];
  });

  it('dispatches UI_TOAST CustomEvent on window', () => {
    toast('Hello');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('UI_TOAST');
  });

  it('sets msg in event detail', () => {
    toast('Court assigned');
    expect(events[0].detail.msg).toBe('Court assigned');
  });

  it('includes type option in detail', () => {
    toast('Saved', { type: 'success' });
    expect(events[0].detail.type).toBe('success');
  });

  it('includes duration option in detail', () => {
    toast('Warning', { duration: 5000 });
    expect(events[0].detail.duration).toBe(5000);
  });

  it('includes both type and duration', () => {
    toast('Error', { type: 'error', duration: 3000 });
    expect(events[0].detail.msg).toBe('Error');
    expect(events[0].detail.type).toBe('error');
    expect(events[0].detail.duration).toBe(3000);
  });

  it('no options - detail has only msg', () => {
    toast('Simple');
    const d = events[0].detail;
    expect(d.msg).toBe('Simple');
    expect(d.type).toBeUndefined();
    expect(d.duration).toBeUndefined();
  });

  it('dispatches separate events for multiple calls', () => {
    toast('One');
    toast('Two');
    toast('Three');
    expect(events).toHaveLength(3);
    expect(events[0].detail.msg).toBe('One');
    expect(events[1].detail.msg).toBe('Two');
    expect(events[2].detail.msg).toBe('Three');
  });

  it('supports info type', () => {
    toast('Info', { type: 'info' });
    expect(events[0].detail.type).toBe('info');
  });

  it('supports warning type', () => {
    toast('Warn', { type: 'warning' });
    expect(events[0].detail.type).toBe('warning');
  });

  it('empty string message dispatches event', () => {
    toast('');
    expect(events).toHaveLength(1);
    expect(events[0].detail.msg).toBe('');
  });
});
