import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMembersService } from '../../../../src/registration/services/modules/membersService.js';

describe('membersService', () => {
  let api;
  let membersCache;
  let service;

  const mockMembersResponse = {
    members: [
      { id: 'm1', display_name: 'John Doe' },
      { id: 'm2', display_name: 'Jane Smith' },
    ],
  };

  beforeEach(() => {
    membersCache = null;

    api = {
      getMembers: vi.fn().mockResolvedValue(mockMembersResponse),
      getMembersByAccount: vi.fn().mockResolvedValue(mockMembersResponse),
    };

    service = createMembersService({
      api,
      getMembersCache: () => membersCache,
      setMembersCache: (v) => {
        membersCache = v;
      },
    });
  });

  describe('searchMembers', () => {
    it('calls api.getMembers with query', async () => {
      await service.searchMembers('Smith');

      expect(api.getMembers).toHaveBeenCalledWith('Smith');
    });

    it('returns members array from response', async () => {
      const result = await service.searchMembers('test');

      expect(result).toEqual(mockMembersResponse.members);
    });

    it('returns empty array when response has no members', async () => {
      api.getMembers.mockResolvedValue({});

      const result = await service.searchMembers('nobody');

      expect(result).toEqual([]);
    });
  });

  describe('getMembersByAccount', () => {
    it('calls api.getMembersByAccount with memberNumber', async () => {
      await service.getMembersByAccount('M001');

      expect(api.getMembersByAccount).toHaveBeenCalledWith('M001');
    });

    it('returns members array from response', async () => {
      const result = await service.getMembersByAccount('M001');

      expect(result).toEqual(mockMembersResponse.members);
    });

    it('returns empty array when response has no members', async () => {
      api.getMembersByAccount.mockResolvedValue({});

      const result = await service.getMembersByAccount('invalid');

      expect(result).toEqual([]);
    });
  });

  describe('getAllMembers', () => {
    it('fetches from API when cache is empty', async () => {
      await service.getAllMembers();

      expect(api.getMembers).toHaveBeenCalledWith();
    });

    it('returns members array from response', async () => {
      const result = await service.getAllMembers();

      expect(result).toEqual(mockMembersResponse.members);
    });

    it('caches the response', async () => {
      await service.getAllMembers();

      expect(membersCache).toEqual(mockMembersResponse);
    });

    it('uses cached data on subsequent calls', async () => {
      await service.getAllMembers();
      await service.getAllMembers();

      expect(api.getMembers).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when response has no members', async () => {
      api.getMembers.mockResolvedValue({});

      const result = await service.getAllMembers();

      expect(result).toEqual([]);
    });
  });
});
