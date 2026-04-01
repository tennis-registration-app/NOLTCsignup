/**
 * normalizeMember, normalizeAccountMember, normalizeAccountMembers tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  normalizeMember,
  normalizeAccountMember,
  normalizeAccountMembers,
} from '../../../../src/lib/normalize/normalizeMember.js';

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ── normalizeMember ────────────────────────────────────────────
describe('normalizeMember', () => {
  it('returns defaults for null input', () => {
    expect(normalizeMember(null as any)).toEqual({
      memberId: 'unknown',
      displayName: 'Unknown',
      isGuest: false,
    });
  });

  it('returns defaults for undefined input', () => {
    expect(normalizeMember(undefined as any)).toEqual({
      memberId: 'unknown',
      displayName: 'Unknown',
      isGuest: false,
    });
  });

  it('normalizes camelCase fields', () => {
    expect(normalizeMember({ memberId: 'm1', displayName: 'Alice', isGuest: false })).toEqual({
      memberId: 'm1',
      displayName: 'Alice',
      isGuest: false,
    });
  });

  it('normalizes snake_case fields', () => {
    expect(normalizeMember({ member_id: 'm2', display_name: 'Bob', is_guest: true })).toEqual({
      memberId: 'm2',
      displayName: 'Bob',
      isGuest: true,
    });
  });

  it('falls back to id for memberId', () => {
    expect(normalizeMember({ id: 'id-1' }).memberId).toBe('id-1');
  });

  it('falls back to name for displayName', () => {
    expect(normalizeMember({ name: 'Charlie' }).displayName).toBe('Charlie');
  });

  it('defaults isGuest to false', () => {
    expect(normalizeMember({ memberId: 'm1' }).isGuest).toBe(false);
  });

  it('prefers memberId over member_id over id', () => {
    expect(normalizeMember({ memberId: 'a', member_id: 'b', id: 'c' }).memberId).toBe('a');
    expect(normalizeMember({ member_id: 'b', id: 'c' }).memberId).toBe('b');
  });

  it('prefers displayName over display_name over name', () => {
    expect(normalizeMember({ displayName: 'A', display_name: 'B', name: 'C' }).displayName).toBe('A');
    expect(normalizeMember({ display_name: 'B', name: 'C' }).displayName).toBe('B');
  });
});

// ── normalizeAccountMember ─────────────────────────────────────
describe('normalizeAccountMember', () => {
  it('returns null for null input', () => {
    expect(normalizeAccountMember(null as any)).toBeNull();
  });

  it('maps snake_case to camelCase', () => {
    const raw = {
      id: 'uuid-1',
      display_name: 'Alice',
      account_id: 'acc-1',
      is_primary: true,
      member_number: '1001',
    };
    expect(normalizeAccountMember(raw)).toEqual({
      id: 'uuid-1',
      displayName: 'Alice',
      accountId: 'acc-1',
      isPrimary: true,
      memberNumber: '1001',
    });
  });

  it('defaults isPrimary to false when missing', () => {
    expect(normalizeAccountMember({ id: '1' }).isPrimary).toBe(false);
  });
});

// ── normalizeAccountMembers ────────────────────────────────────
describe('normalizeAccountMembers', () => {
  it('returns empty array for null input', () => {
    expect(normalizeAccountMembers(null as any)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeAccountMembers('not array' as any)).toEqual([]);
  });

  it('normalizes each member in array', () => {
    const raw = [
      { id: '1', display_name: 'Alice', account_id: 'a', member_number: '100' },
      { id: '2', display_name: 'Bob', account_id: 'b', member_number: '200' },
    ];
    const result = normalizeAccountMembers(raw);
    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('Alice');
    expect(result[1].displayName).toBe('Bob');
  });

  it('returns empty array for empty input array', () => {
    expect(normalizeAccountMembers([])).toEqual([]);
  });
});
