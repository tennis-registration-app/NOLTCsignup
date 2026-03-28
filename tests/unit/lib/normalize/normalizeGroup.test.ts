/**
 * normalizeGroup tests
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeGroup } from '../../../../src/lib/normalize/normalizeGroup.js';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('normalizeGroup', () => {
  it('returns defaults for null input', () => {
    expect(normalizeGroup(null)).toEqual({
      id: 'unknown',
      players: [],
      type: 'singles',
    });
  });

  it('returns defaults for undefined input', () => {
    expect(normalizeGroup(undefined)).toEqual({
      id: 'unknown',
      players: [],
      type: 'singles',
    });
  });

  it('normalizes players array', () => {
    const raw = {
      id: 'g1',
      players: [{ memberId: 'm1', displayName: 'Alice' }],
    };
    const result = normalizeGroup(raw);
    expect(result.players).toHaveLength(1);
    expect(result.players[0].memberId).toBe('m1');
    expect(result.players[0].displayName).toBe('Alice');
  });

  it('uses participants as fallback for players', () => {
    const raw = {
      id: 'g2',
      participants: [{ name: 'Bob' }],
    };
    const result = normalizeGroup(raw);
    expect(result.players).toHaveLength(1);
    expect(result.players[0].displayName).toBe('Bob');
  });

  it('uses members as fallback for players', () => {
    const raw = {
      id: 'g3',
      members: [{ name: 'Charlie' }],
    };
    const result = normalizeGroup(raw);
    expect(result.players).toHaveLength(1);
  });

  it('parses JSONB string for players', () => {
    const raw = {
      id: 'g4',
      players: JSON.stringify([{ memberId: 'm1', displayName: 'Alice' }]),
    };
    const result = normalizeGroup(raw);
    expect(result.players).toHaveLength(1);
    expect(result.players[0].memberId).toBe('m1');
  });

  it('returns empty players for invalid JSONB string', () => {
    const raw = {
      id: 'g5',
      players: 'not valid json',
    };
    const result = normalizeGroup(raw);
    expect(result.players).toEqual([]);
  });

  it('determines singles type for <= 3 players', () => {
    const raw = {
      id: 'g6',
      players: [{ name: 'A' }, { name: 'B' }],
    };
    expect(normalizeGroup(raw).type).toBe('singles');
  });

  it('determines doubles type for 4+ players', () => {
    const raw = {
      id: 'g7',
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    };
    expect(normalizeGroup(raw).type).toBe('doubles');
  });

  it('uses explicit type when provided', () => {
    const raw = {
      id: 'g8',
      players: [{ name: 'A' }],
      type: 'doubles',
    };
    expect(normalizeGroup(raw).type).toBe('doubles');
  });

  it('uses group_type as fallback', () => {
    const raw = {
      id: 'g9',
      players: [{ name: 'A' }],
      group_type: 'doubles',
    };
    expect(normalizeGroup(raw).type).toBe('doubles');
  });

  it('uses groupType as fallback', () => {
    const raw = {
      id: 'g10',
      players: [],
      groupType: 'singles',
    };
    expect(normalizeGroup(raw).type).toBe('singles');
  });

  it('falls back to id alternatives', () => {
    expect(normalizeGroup({ groupId: 'gid-1' }).id).toBe('gid-1');
    expect(normalizeGroup({ group_id: 'gid-2' }).id).toBe('gid-2');
  });

  it('ignores invalid group type', () => {
    const raw = {
      id: 'g11',
      players: [{ name: 'A' }],
      type: 'invalid_type',
    };
    expect(normalizeGroup(raw).type).toBe('singles');
  });
});
