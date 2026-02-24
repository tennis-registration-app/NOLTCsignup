/**
 * normalizeWaitlist tests
 */

import { describe, it, expect } from 'vitest';
import { normalizeWaitlist } from '../../../src/lib/normalizeWaitlist.js';

describe('normalizeWaitlist', () => {
  it('returns empty array for null input', () => {
    expect(normalizeWaitlist(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(normalizeWaitlist(undefined)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeWaitlist('not array')).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(normalizeWaitlist([])).toEqual([]);
  });

  it('normalizes a basic waitlist entry', () => {
    const raw = [{
      id: 'wl-1',
      position: 1,
      group_type: 'doubles',
      joined_at: '2024-01-15T10:00:00Z',
      minutes_waiting: 15,
      participants: [
        { displayName: 'Alice', memberId: 'm1' },
        { displayName: 'Bob', memberId: 'm2' },
      ],
    }];
    const result = normalizeWaitlist(raw);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wl-1');
    expect(result[0].position).toBe(1);
    expect(result[0].groupType).toBe('doubles');
    expect(result[0].joinedAt).toBe('2024-01-15T10:00:00Z');
    expect(result[0].minutesWaiting).toBe(15);
    expect(result[0].names).toEqual(['Alice', 'Bob']);
    expect(result[0].players).toHaveLength(2);
  });

  it('uses players field as fallback', () => {
    const raw = [{
      id: 'wl-2',
      players: [{ name: 'Charlie' }],
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual(['Charlie']);
  });

  it('uses members field as fallback', () => {
    const raw = [{
      id: 'wl-3',
      members: [{ display_name: 'Dave' }],
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual(['Dave']);
  });

  it('uses group.players as fallback', () => {
    const raw = [{
      id: 'wl-4',
      group: { players: [{ displayName: 'Eve' }] },
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual(['Eve']);
  });

  it('parses JSONB string participants', () => {
    const raw = [{
      id: 'wl-5',
      participants: JSON.stringify([{ displayName: 'Frank', memberId: 'f1' }]),
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual(['Frank']);
    expect(result[0].players[0].memberId).toBe('f1');
  });

  it('handles invalid JSONB string gracefully', () => {
    const raw = [{
      id: 'wl-6',
      participants: 'not json',
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual([]);
    expect(result[0].players).toEqual([]);
  });

  it('handles non-array parsed participants', () => {
    const raw = [{
      id: 'wl-7',
      participants: JSON.stringify({ not: 'an array' }),
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual([]);
    expect(result[0].players).toEqual([]);
  });

  it('extracts display name with fallback chain', () => {
    const raw = [{
      participants: [
        { displayName: 'First' },
        { display_name: 'Second' },
        { name: 'Third' },
        { member_name: 'Fourth' },
        {},
      ],
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].names).toEqual(['First', 'Second', 'Third', 'Fourth', 'Unknown']);
  });

  it('builds player objects with correct fields', () => {
    const raw = [{
      id: 'wl-8',
      participants: [
        { displayName: 'Alice', memberId: 'm1', isGuest: false },
      ],
    }];
    const result = normalizeWaitlist(raw);
    const player = result[0].players[0];
    expect(player.id).toBe('wl-wl-8-0');
    expect(player.name).toBe('Alice');
    expect(player.memberId).toBe('m1');
    expect(player.isGuest).toBe(false);
  });

  it('uses snake_case member_id as fallback', () => {
    const raw = [{
      id: 'wl-9',
      participants: [{ display_name: 'Bob', member_id: 'm2' }],
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].players[0].memberId).toBe('m2');
  });

  it('generates fallback id for entries without id', () => {
    const raw = [{ participants: [{ name: 'Alice' }] }];
    const result = normalizeWaitlist(raw);
    expect(result[0].id).toBe('wg_0');
  });

  it('handles camelCase field alternatives', () => {
    const raw = [{
      id: 'wl-10',
      joinedAt: '2024-01-15T10:00:00Z',
      minutesWaiting: 5,
      groupType: 'singles',
      participants: [],
    }];
    const result = normalizeWaitlist(raw);
    expect(result[0].joinedAt).toBe('2024-01-15T10:00:00Z');
    expect(result[0].minutesWaiting).toBe(5);
    expect(result[0].groupType).toBe('singles');
  });

  it('preserves raw entry for debugging', () => {
    const entry = { id: 'wl-11', participants: [] };
    const result = normalizeWaitlist([entry]);
    expect(result[0].raw).toBe(entry);
  });

  it('handles multiple entries', () => {
    const raw = [
      { id: 'a', participants: [{ name: 'Alice' }] },
      { id: 'b', participants: [{ name: 'Bob' }] },
    ];
    const result = normalizeWaitlist(raw);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});
