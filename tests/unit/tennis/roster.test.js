/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeName,
  hash53,
  normName,
  checkGroupConflicts,
  findEngagementFor,
  ensureMemberIds,
  resolveMemberId,
  enrichPlayersWithIds,
  buildActiveIndex,
  buildWaitlistIndex,
} from '../../../src/tennis/domain/roster.js';

describe('roster', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  describe('normalizeName', () => {
    it('trims whitespace', () => {
      expect(normalizeName('  John Doe  ')).toBe('john doe');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeName('John    Doe')).toBe('john doe');
    });

    it('lowercases', () => {
      expect(normalizeName('JOHN DOE')).toBe('john doe');
    });

    it('handles empty string', () => {
      expect(normalizeName('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
    });

    it('handles accented characters', () => {
      expect(normalizeName('José García')).toBe('josé garcía');
    });

    it('normalizes unicode (NFKC)', () => {
      // ﬁ (ligature) should normalize to fi
      expect(normalizeName('ﬁle')).toBe('file');
    });

    it('removes special characters but keeps apostrophes and hyphens', () => {
      expect(normalizeName("O'Brien-Smith")).toBe("o'brien-smith");
      expect(normalizeName('John@Doe!')).toBe('johndoe');
    });
  });

  describe('normName (simpler version)', () => {
    it('trims and lowercases', () => {
      expect(normName('  JOHN DOE  ')).toBe('john doe');
    });

    it('collapses whitespace', () => {
      expect(normName('John    Doe')).toBe('john doe');
    });
  });

  describe('hash53', () => {
    it('returns same hash for same input (deterministic)', () => {
      const hash1 = hash53('test string');
      const hash2 = hash53('test string');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', () => {
      const hash1 = hash53('test string 1');
      const hash2 = hash53('test string 2');
      expect(hash1).not.toBe(hash2);
    });

    it('returns base36 string', () => {
      const hash = hash53('test');
      expect(/^[0-9a-z]+$/.test(hash)).toBe(true);
    });

    it('handles empty string', () => {
      const hash = hash53('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('checkGroupConflicts', () => {
    it('detects player on court', () => {
      const data = {
        courts: [
          { current: { players: [{ name: 'John Doe' }] } },
          { current: { players: [{ name: 'Jane Smith' }] } },
        ],
        waitingGroups: [],
      };

      const result = checkGroupConflicts({
        data,
        groupPlayers: [{ name: 'John Doe' }],
      });

      expect(result.playing).toHaveLength(1);
      expect(result.playing[0].court).toBe(1);
      expect(result.waiting).toHaveLength(0);
    });

    it('detects player on waitlist', () => {
      const data = {
        courts: [],
        waitingGroups: [{ players: [{ name: 'Alice' }] }, { players: [{ name: 'Bob' }] }],
      };

      const result = checkGroupConflicts({
        data,
        groupPlayers: [{ name: 'Bob' }],
      });

      expect(result.playing).toHaveLength(0);
      expect(result.waiting).toHaveLength(1);
      expect(result.waiting[0].position).toBe(2);
    });

    it('detects multiple conflicts', () => {
      const data = {
        courts: [{ current: { players: [{ name: 'John' }] } }],
        waitingGroups: [{ players: [{ name: 'Jane' }] }],
      };

      const result = checkGroupConflicts({
        data,
        groupPlayers: [{ name: 'John' }, { name: 'Jane' }],
      });

      expect(result.playing).toHaveLength(1);
      expect(result.waiting).toHaveLength(1);
    });

    it('returns empty arrays when no conflicts', () => {
      const data = {
        courts: [{ current: { players: [{ name: 'John' }] } }],
        waitingGroups: [],
      };

      const result = checkGroupConflicts({
        data,
        groupPlayers: [{ name: 'Alice' }],
      });

      expect(result.playing).toHaveLength(0);
      expect(result.waiting).toHaveLength(0);
    });
  });

  describe('findEngagementFor', () => {
    it('finds player on court by name', () => {
      const state = {
        courts: [
          { current: { players: [{ name: 'John Doe' }] } },
          { current: { players: [{ name: 'Jane Smith' }] } },
        ],
        waitingGroups: [],
      };

      const result = findEngagementFor({ name: 'John Doe' }, state);

      expect(result).toEqual({ type: 'playing', court: 1 });
    });

    it('finds player on court by memberId', () => {
      const state = {
        courts: [{ current: { players: [{ name: 'John', memberId: 'm_123' }] } }],
        waitingGroups: [],
      };

      const result = findEngagementFor({ name: 'Different Name', memberId: 'm_123' }, state);

      expect(result).toEqual({ type: 'playing', court: 1 });
    });

    it('finds player on waitlist', () => {
      const state = {
        courts: [],
        waitingGroups: [{ players: [{ name: 'Alice' }] }, { players: [{ name: 'Bob' }] }],
      };

      const result = findEngagementFor({ name: 'Bob' }, state);

      expect(result).toEqual({ type: 'waitlist', position: 2 });
    });

    it('returns null when player not found', () => {
      const state = {
        courts: [{ current: { players: [{ name: 'John' }] } }],
        waitingGroups: [{ players: [{ name: 'Jane' }] }],
      };

      const result = findEngagementFor({ name: 'Unknown Player' }, state);

      expect(result).toBeNull();
    });

    it('handles empty state', () => {
      const result = findEngagementFor({ name: 'John' }, {});
      expect(result).toBeNull();
    });

    it('handles null player', () => {
      const result = findEngagementFor(null, { courts: [], waitingGroups: [] });
      expect(result).toBeNull();
    });
  });

  describe('ensureMemberIds', () => {
    it('assigns memberIds to roster entries without them', () => {
      const roster = [{ name: 'John Doe' }, { name: 'Jane Smith' }];

      const result = ensureMemberIds(roster);

      expect(result.assigned).toBe(2);
      expect(result.total).toBe(2);
      expect(roster[0].memberId).toBeDefined();
      expect(roster[1].memberId).toBeDefined();
      expect(roster[0].memberId).toMatch(/^m_/);
    });

    it('is idempotent - does not reassign existing memberIds', () => {
      const roster = [{ name: 'John Doe', memberId: 'existing_id' }];

      const result = ensureMemberIds(roster);

      expect(result.assigned).toBe(0);
      expect(roster[0].memberId).toBe('existing_id');
    });

    it('persists ID map to localStorage', () => {
      const roster = [{ name: 'John Doe' }];

      ensureMemberIds(roster);

      const stored = JSON.parse(localStorage.getItem('tennisMemberIdMap'));
      expect(stored).toBeDefined();
      expect(Object.keys(stored).length).toBe(1);
    });

    it('generates same ID for same name across calls', () => {
      const roster1 = [{ name: 'John Doe' }];
      const roster2 = [{ name: 'John Doe' }];

      ensureMemberIds(roster1);
      localStorage.clear(); // Clear to force re-generation
      ensureMemberIds(roster2);

      // Same name should produce same deterministic hash
      expect(roster1[0].memberId).toBe(roster2[0].memberId);
    });
  });

  describe('resolveMemberId', () => {
    it('returns existing memberId if present', () => {
      const player = { name: 'John', memberId: 'm_existing' };

      const result = resolveMemberId(player, []);

      expect(result).toBe('m_existing');
    });

    it('returns null for unknown player', () => {
      const result = resolveMemberId({ name: 'Unknown' }, []);

      expect(result).toBeNull();
    });

    it('resolves from roster when unique match exists', () => {
      const roster = [{ name: 'John Doe', memberId: 'm_john' }];

      const result = resolveMemberId({ name: 'John Doe' }, roster);

      expect(result).toBe('m_john');
    });

    it('returns null for ambiguous matches', () => {
      const roster = [
        { name: 'John Doe', clubNumber: '123' },
        { name: 'John Doe', clubNumber: '456' },
      ];

      const result = resolveMemberId({ name: 'John Doe' }, roster);

      expect(result).toBeNull();
    });
  });

  describe('enrichPlayersWithIds', () => {
    it('enriches players that can be resolved', () => {
      const players = [{ name: 'John' }];
      const roster = [{ name: 'John', memberId: 'm_john' }];

      const result = enrichPlayersWithIds(players, roster);

      expect(result[0].memberId).toBe('m_john');
    });

    it('preserves existing memberIds', () => {
      const players = [{ name: 'John', memberId: 'm_existing' }];

      const result = enrichPlayersWithIds(players, []);

      expect(result[0].memberId).toBe('m_existing');
    });

    it('leaves unresolvable players unchanged', () => {
      const players = [{ name: 'Unknown' }];

      const result = enrichPlayersWithIds(players, []);

      expect(result[0].memberId).toBeUndefined();
    });
  });

  describe('buildActiveIndex', () => {
    it('builds index from courts', () => {
      const data = {
        courts: [
          { current: { players: [{ name: 'John' }, { name: 'Jane' }] } },
          { current: { players: [{ name: 'Bob' }] } },
        ],
      };

      const index = buildActiveIndex(data);

      expect(index.get('john')).toEqual({ court: 1 });
      expect(index.get('jane')).toEqual({ court: 1 });
      expect(index.get('bob')).toEqual({ court: 2 });
    });

    it('handles empty courts', () => {
      const index = buildActiveIndex({ courts: [] });
      expect(index.size).toBe(0);
    });
  });

  describe('buildWaitlistIndex', () => {
    it('builds index from waitingGroups', () => {
      const data = {
        waitingGroups: [{ players: [{ name: 'Alice' }] }, { players: [{ name: 'Bob' }] }],
      };

      const index = buildWaitlistIndex(data);

      expect(index.get('alice')).toEqual({ position: 1 });
      expect(index.get('bob')).toEqual({ position: 2 });
    });
  });

  describe('window attachment', () => {
    it('attaches to window.Tennis.Domain.roster', async () => {
      // Clear and reimport
      delete window.Tennis;
      vi.resetModules();

      await import('../../../src/tennis/domain/roster.js');

      expect(window.Tennis).toBeDefined();
      expect(window.Tennis.Domain).toBeDefined();
      expect(window.Tennis.Domain.roster).toBeDefined();
      expect(typeof window.Tennis.Domain.roster.checkGroupConflicts).toBe('function');
      expect(typeof window.Tennis.Domain.roster.normalizeName).toBe('function');
      expect(typeof window.Tennis.Domain.roster.findEngagementFor).toBe('function');
      expect(window.Tennis.Domain.roster._internals).toBeDefined();
      expect(typeof window.Tennis.Domain.roster._internals.normName).toBe('function');
    });
  });
});
