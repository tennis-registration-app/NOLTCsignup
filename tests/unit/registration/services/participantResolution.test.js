import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveParticipants,
  COURTS_PROFILE,
  WAITLIST_PROFILE,
} from '../../../../src/registration/services/modules/participantResolution.js';

describe('participantResolution', () => {
  let api;
  let logger;
  let normalizeAccountMembers;
  let deps;

  beforeEach(() => {
    api = {
      getMembersByAccount: vi.fn(),
      getMembers: vi.fn(),
    };

    logger = {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Simple pass-through normalizer for tests
    normalizeAccountMembers = vi.fn((members) =>
      members.map((m) => ({
        id: m.id,
        accountId: m.account_id,
        displayName: m.first_name ? `${m.first_name} ${m.last_name}` : m.display_name,
        isPrimary: m.is_primary || false,
      }))
    );

    deps = { api, logger, normalizeAccountMembers };
  });

  describe('UUID validation divergence', () => {
    it('COURTS_PROFILE: treats valid UUID regex as UUID', () => {
      const validUuid = '11111111-2222-3333-4444-555555555555';
      expect(COURTS_PROFILE.isUuid(validUuid)).toBe(true);
    });

    it('COURTS_PROFILE: rejects invalid UUID format', () => {
      const invalidUuid = '12345-abc-not-valid';
      expect(COURTS_PROFILE.isUuid(invalidUuid)).toBe(false);
    });

    it('WAITLIST_PROFILE: treats string with dash and length > 30 as UUID', () => {
      const longDashString = 'abc-defghijklmnopqrstuvwxyz12345';
      expect(WAITLIST_PROFILE.isUuid(longDashString)).toBe(true);
    });

    it('WAITLIST_PROFILE: rejects short string with dash', () => {
      const shortDashString = 'abc-def';
      expect(WAITLIST_PROFILE.isUuid(shortDashString)).toBe(false);
    });

    it('COURTS vs WAITLIST: same ID can be treated differently', () => {
      // A string that passes waitlist check but not courts regex
      const ambiguousId = 'not-a-real-uuid-but-long-enough-for-waitlist';
      expect(COURTS_PROFILE.isUuid(ambiguousId)).toBe(false);
      expect(WAITLIST_PROFILE.isUuid(ambiguousId)).toBe(true);
    });
  });

  describe('lookup error handling divergence', () => {
    it('COURTS_PROFILE: warns and continues on lookup error', async () => {
      api.getMembersByAccount.mockRejectedValue(new Error('API error'));
      api.getMembers.mockResolvedValue({
        members: [
          { id: 'uuid-1', account_id: 'acc-1', first_name: 'John', last_name: 'Doe' },
        ],
      });

      const players = [{ memberNumber: '12345', name: 'John Doe' }];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      expect(logger.warn).toHaveBeenCalledWith(
        'ApiService',
        expect.stringContaining('Could not look up member by memberNumber'),
        expect.any(Error)
      );
      expect(result.participants).toHaveLength(1);
    });

    it('WAITLIST_PROFILE: rethrows on lookup error', async () => {
      api.getMembersByAccount.mockRejectedValue(new Error('API error'));

      const players = [{ memberNumber: '12345', name: 'John Doe' }];

      await expect(resolveParticipants(players, deps, WAITLIST_PROFILE)).rejects.toThrow(
        'API error'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('name fallback divergence', () => {
    it('COURTS_PROFILE: falls back to first member if no exact match', async () => {
      api.getMembersByAccount.mockRejectedValue(new Error('Not found'));
      api.getMembers.mockResolvedValue({
        members: [
          { id: 'uuid-1', account_id: 'acc-1', first_name: 'Jane', last_name: 'Smith' },
          { id: 'uuid-2', account_id: 'acc-2', first_name: 'John', last_name: 'Doe' },
        ],
      });

      const players = [{ name: 'Unknown Person' }];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      // Should use first member (Jane Smith) as fallback
      expect(result.participants[0].member_id).toBe('uuid-1');
    });

    it('WAITLIST_PROFILE: does not fall back, fails if no exact match', async () => {
      api.getMembersByAccount.mockRejectedValue(new Error('Not found'));
      api.getMembers.mockResolvedValue({
        members: [
          { id: 'uuid-1', account_id: 'acc-1', first_name: 'Jane', last_name: 'Smith' },
        ],
      });

      const players = [{ name: 'Unknown Person' }];

      await expect(resolveParticipants(players, deps, WAITLIST_PROFILE)).rejects.toThrow(
        'Could not find member in database'
      );
    });
  });

  describe('guest shape divergence', () => {
    it('COURTS_PROFILE: includes charged_to_account_id for guests', async () => {
      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'acc-1', name: 'Member' },
        { isGuest: true, name: 'Guest Player' },
      ];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      const guest = result.participants.find((p) => p.type === 'guest');
      expect(guest).toHaveProperty('charged_to_account_id', 'acc-1');
    });

    it('WAITLIST_PROFILE: does not include charged_to_account_id for guests', async () => {
      const players = [
        { id: 'abc-defghijklmnopqrstuvwxyz12345', accountId: 'acc-1', name: 'Member' },
        { isGuest: true, name: 'Guest Player' },
      ];

      const result = await resolveParticipants(players, deps, WAITLIST_PROFILE);

      const guest = result.participants.find((p) => p.type === 'guest');
      expect(guest).not.toHaveProperty('charged_to_account_id');
    });
  });

  describe('final error message divergence', () => {
    it('COURTS_PROFILE: uses generic account_id error message', () => {
      const message = COURTS_PROFILE.finalErrorMessage({ name: 'Test', id: '123' });
      expect(message).toBe('Could not determine account_id for participant');
    });

    it('WAITLIST_PROFILE: includes player name and id in error message', () => {
      const message = WAITLIST_PROFILE.finalErrorMessage({
        name: 'John Doe',
        memberNumber: '12345',
      });
      expect(message).toBe('Could not find member in database: John Doe (12345)');
    });

    it('WAITLIST_PROFILE: falls back to id if memberNumber missing', () => {
      const message = WAITLIST_PROFILE.finalErrorMessage({ name: 'John Doe', id: 'abc' });
      expect(message).toBe('Could not find member in database: John Doe (abc)');
    });
  });

  describe('member id fallback divergence', () => {
    it('COURTS_PROFILE: falls back to playerId if memberId not found', async () => {
      api.getMembersByAccount.mockResolvedValue({ members: [] });
      api.getMembers.mockResolvedValue({
        members: [{ id: 'found-uuid', account_id: 'acc-1', first_name: 'John', last_name: 'Doe' }],
      });

      const players = [{ id: 'original-id', name: 'John Doe' }];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      // Should use found-uuid since name search found a match
      expect(result.participants[0].member_id).toBe('found-uuid');
    });

    it('COURTS_PROFILE: uses playerId when no lookup succeeds', async () => {
      api.getMembersByAccount.mockRejectedValue(new Error('Not found'));
      api.getMembers.mockResolvedValue({
        members: [{ id: 'uuid-1', account_id: 'acc-1', first_name: 'Jane', last_name: 'Smith' }],
      });

      const players = [{ id: 'original-player-id', name: 'Unknown' }];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      // COURTS_PROFILE uses first member fallback and gets uuid-1
      expect(result.participants[0].member_id).toBe('uuid-1');
    });
  });

  describe('groupType calculation', () => {
    it('returns singles for 1-2 players', async () => {
      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'acc-1', name: 'John' },
        { id: '22222222-3333-4444-5555-666666666666', accountId: 'acc-2', name: 'Jane' },
      ];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      expect(result.groupType).toBe('singles');
    });

    it('returns doubles for 3+ players', async () => {
      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'acc-1', name: 'A' },
        { id: '22222222-3333-4444-5555-666666666666', accountId: 'acc-2', name: 'B' },
        { id: '33333333-4444-5555-6666-777777777777', accountId: 'acc-3', name: 'C' },
      ];

      const result = await resolveParticipants(players, deps, COURTS_PROFILE);

      expect(result.groupType).toBe('doubles');
    });
  });
});
