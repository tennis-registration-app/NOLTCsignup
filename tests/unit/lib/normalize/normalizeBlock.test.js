/**
 * normalizeBlock tests
 */

import { describe, it, expect } from 'vitest';
import { normalizeBlock } from '../../../../src/lib/normalize/normalizeBlock.js';

describe('normalizeBlock', () => {
  const serverNow = '2024-06-15T12:00:00Z';

  it('returns null for null input', () => {
    expect(normalizeBlock(null, serverNow)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeBlock(undefined, serverNow)).toBeNull();
  });

  it('normalizes camelCase fields', () => {
    const result = normalizeBlock({
      id: 'b1',
      courtNumber: 3,
      startsAt: '2024-06-15T10:00:00Z',
      endsAt: '2024-06-15T14:00:00Z',
      reason: 'Lesson',
      blockType: 'lesson',
    }, serverNow);
    expect(result.id).toBe('b1');
    expect(result.courtNumber).toBe(3);
    expect(result.startsAt).toBe('2024-06-15T10:00:00Z');
    expect(result.endsAt).toBe('2024-06-15T14:00:00Z');
    expect(result.reason).toBe('Lesson');
    expect(result.blockType).toBe('lesson');
  });

  it('normalizes snake_case fields', () => {
    const result = normalizeBlock({
      block_id: 'b2',
      court_number: 5,
      starts_at: '2024-06-15T10:00:00Z',
      ends_at: '2024-06-15T14:00:00Z',
      block_type: 'maintenance',
    }, serverNow);
    expect(result.id).toBe('b2');
    expect(result.courtNumber).toBe(5);
    expect(result.startsAt).toBe('2024-06-15T10:00:00Z');
    expect(result.blockType).toBe('maintenance');
  });

  it('calculates isActive when within time range', () => {
    const result = normalizeBlock({
      id: 'b3',
      startsAt: '2024-06-15T10:00:00Z',
      endsAt: '2024-06-15T14:00:00Z',
    }, '2024-06-15T12:00:00Z');
    expect(result.isActive).toBe(true);
  });

  it('calculates isActive as false when before start', () => {
    const result = normalizeBlock({
      id: 'b4',
      startsAt: '2024-06-15T14:00:00Z',
      endsAt: '2024-06-15T16:00:00Z',
    }, '2024-06-15T12:00:00Z');
    expect(result.isActive).toBe(false);
  });

  it('calculates isActive as false when after end', () => {
    const result = normalizeBlock({
      id: 'b5',
      startsAt: '2024-06-15T08:00:00Z',
      endsAt: '2024-06-15T10:00:00Z',
    }, '2024-06-15T12:00:00Z');
    expect(result.isActive).toBe(false);
  });

  it('isActive false when missing time fields', () => {
    const result = normalizeBlock({ id: 'b6' }, serverNow);
    expect(result.isActive).toBe(false);
  });

  it('uses blockId fallback for id', () => {
    expect(normalizeBlock({ blockId: 'bid-1' }, serverNow).id).toBe('bid-1');
  });

  it('defaults id to unknown', () => {
    expect(normalizeBlock({}, serverNow).id).toBe('unknown');
  });

  it('uses description as fallback for reason', () => {
    const result = normalizeBlock({ id: 'b7', description: 'Maintenance' }, serverNow);
    expect(result.reason).toBe('Maintenance');
  });

  it('uses startTime/endTime fallbacks', () => {
    const result = normalizeBlock({
      id: 'b8',
      startTime: '2024-06-15T10:00:00Z',
      endTime: '2024-06-15T14:00:00Z',
    }, serverNow);
    expect(result.startsAt).toBe('2024-06-15T10:00:00Z');
    expect(result.endsAt).toBe('2024-06-15T14:00:00Z');
  });

  it('uses type as fallback for blockType', () => {
    const result = normalizeBlock({ id: 'b9', type: 'wet' }, serverNow);
    expect(result.blockType).toBe('wet');
  });
});
