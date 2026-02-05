import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWaitlistService } from '../../../../src/registration/services/modules/waitlistService.js';

describe('waitlistService', () => {
  let api;
  let notifyListeners;
  let transformWaitlist;
  let waitlistDataCache;
  let logger;
  let service;

  const mockApiWaitlist = {
    waitlist: [
      { id: 'w1', group: { players: [{ name: 'Alice' }] } },
      { id: 'w2', group: { players: [{ name: 'Bob' }] } },
    ],
  };

  const mockTransformedWaitlist = [
    { id: 'w1', names: ['Alice'] },
    { id: 'w2', names: ['Bob'] },
  ];

  beforeEach(() => {
    waitlistDataCache = null;

    api = {
      getWaitlist: vi.fn().mockResolvedValue(mockApiWaitlist),
      cancelWaitlist: vi.fn().mockResolvedValue({ success: true }),
    };

    notifyListeners = vi.fn();
    transformWaitlist = vi.fn().mockReturnValue(mockTransformedWaitlist);
    logger = {
      error: vi.fn(),
    };

    service = createWaitlistService({
      api,
      notifyListeners,
      transformWaitlist,
      getWaitlistData: () => waitlistDataCache,
      setWaitlistData: (v) => {
        waitlistDataCache = v;
      },
      logger,
    });
  });

  describe('refreshWaitlist', () => {
    it('fetches waitlist data from API and stores in cache', async () => {
      await service.refreshWaitlist();

      expect(api.getWaitlist).toHaveBeenCalled();
      expect(waitlistDataCache).toBe(mockApiWaitlist);
    });

    it('notifies listeners after refresh', async () => {
      await service.refreshWaitlist();

      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });

    it('returns transformed waitlist', async () => {
      const result = await service.refreshWaitlist();

      expect(transformWaitlist).toHaveBeenCalledWith(mockApiWaitlist.waitlist);
      expect(result).toBe(mockTransformedWaitlist);
    });

    it('logs and rethrows errors', async () => {
      const error = new Error('API failed');
      api.getWaitlist.mockRejectedValue(error);

      await expect(service.refreshWaitlist()).rejects.toThrow('API failed');
      expect(logger.error).toHaveBeenCalledWith('ApiService', 'Failed to refresh waitlist', error);
    });
  });

  describe('getWaitlist', () => {
    it('refreshes data if cache is empty', async () => {
      const result = await service.getWaitlist();

      expect(api.getWaitlist).toHaveBeenCalled();
      expect(result).toBe(mockTransformedWaitlist);
    });

    it('uses cached data if available', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.getWaitlist();

      expect(api.getWaitlist).not.toHaveBeenCalled();
      expect(transformWaitlist).toHaveBeenCalledWith(mockApiWaitlist.waitlist);
      expect(result).toBe(mockTransformedWaitlist);
    });
  });

  describe('removeFromWaitlist', () => {
    it('calls cancelWaitlist with string ID', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.removeFromWaitlist('w1');

      expect(api.cancelWaitlist).toHaveBeenCalledWith('w1');
      expect(result).toEqual({ success: true });
    });

    it('looks up ID when passed numeric index (legacy)', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await service.removeFromWaitlist(1);

      expect(api.cancelWaitlist).toHaveBeenCalledWith('w2');
      expect(result).toEqual({ success: true });
    });

    it('throws error for invalid index', async () => {
      waitlistDataCache = mockApiWaitlist;

      await expect(service.removeFromWaitlist(99)).rejects.toThrow(
        'Waitlist entry at index 99 not found'
      );
    });

    it('refreshes waitlist after removal', async () => {
      waitlistDataCache = mockApiWaitlist;

      await service.removeFromWaitlist('w1');

      // Should have called getWaitlist twice: once for the initial call, once for refresh
      expect(api.getWaitlist).toHaveBeenCalled();
      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });
  });

  describe('addToWaitlist', () => {
    let serviceWithLogger;

    beforeEach(() => {
      api.getMembersByAccount = vi.fn();
      api.getMembers = vi.fn();
      api.joinWaitlist = vi.fn().mockResolvedValue({
        waitlist: { position: 2 },
      });

      logger = {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      serviceWithLogger = createWaitlistService({
        api,
        notifyListeners,
        transformWaitlist,
        getWaitlistData: () => waitlistDataCache,
        setWaitlistData: (v) => {
          waitlistDataCache = v;
        },
        logger,
      });
    });

    it('calls joinWaitlist with transformed participants for UUID players', async () => {
      const players = [
        {
          name: 'John Doe',
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          accountId: 'account-uuid-1',
        },
      ];

      const result = await serviceWithLogger.addToWaitlist(players);

      expect(api.joinWaitlist).toHaveBeenCalledWith('singles', [
        {
          type: 'member',
          member_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          account_id: 'account-uuid-1',
        },
      ]);
      expect(result).toEqual({
        success: true,
        waitlist: { position: 2 },
        position: 2,
      });
    });

    it('looks up member by memberNumber when UUID not provided', async () => {
      api.getMembersByAccount.mockResolvedValue({
        members: [
          {
            id: 'member-uuid-1',
            account_id: 'account-uuid-1',
            display_name: 'John Doe',
            is_primary: true,
          },
        ],
      });

      const players = [{ name: 'John Doe', memberNumber: '12345' }];

      await serviceWithLogger.addToWaitlist(players);

      expect(api.getMembersByAccount).toHaveBeenCalledWith('12345');
      expect(api.joinWaitlist).toHaveBeenCalledWith('singles', [
        {
          type: 'member',
          member_id: 'member-uuid-1',
          account_id: 'account-uuid-1',
        },
      ]);
    });

    it('handles guest players', async () => {
      api.getMembersByAccount.mockResolvedValue({
        members: [
          {
            id: 'member-uuid-1',
            account_id: 'account-uuid-1',
            display_name: 'John Doe',
            is_primary: true,
          },
        ],
      });

      const players = [
        { name: 'John Doe', memberNumber: '12345' },
        { name: 'Guest Player', isGuest: true },
      ];

      await serviceWithLogger.addToWaitlist(players);

      expect(api.joinWaitlist).toHaveBeenCalledWith('singles', [
        {
          type: 'member',
          member_id: 'member-uuid-1',
          account_id: 'account-uuid-1',
        },
        {
          type: 'guest',
          guest_name: 'Guest Player',
          account_id: 'account-uuid-1',
        },
      ]);
    });

    it('uses doubles groupType for 3+ players', async () => {
      const players = [
        { id: 'uuid-1-aaaa-bbbb-cccc-dddddddddddd', accountId: 'acc-1', name: 'P1' },
        { id: 'uuid-2-aaaa-bbbb-cccc-dddddddddddd', accountId: 'acc-2', name: 'P2' },
        { id: 'uuid-3-aaaa-bbbb-cccc-dddddddddddd', accountId: 'acc-3', name: 'P3' },
      ];

      await serviceWithLogger.addToWaitlist(players);

      expect(api.joinWaitlist).toHaveBeenCalledWith('doubles', expect.any(Array));
    });

    it('refreshes waitlist after successful add', async () => {
      const players = [
        { id: 'uuid-1-aaaa-bbbb-cccc-dddddddddddd', accountId: 'acc-1', name: 'P1' },
      ];

      await serviceWithLogger.addToWaitlist(players);

      expect(api.getWaitlist).toHaveBeenCalled();
      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });

    it('throws error when member cannot be resolved', async () => {
      api.getMembersByAccount.mockResolvedValue({ members: [] });
      api.getMembers.mockResolvedValue({ members: [] });

      const players = [{ name: 'Unknown', memberNumber: '99999' }];

      await expect(serviceWithLogger.addToWaitlist(players)).rejects.toThrow(
        'Could not find member in database: Unknown (99999)'
      );
    });

    it('respects groupType from options', async () => {
      const players = [
        { id: 'uuid-1-aaaa-bbbb-cccc-dddddddddddd', accountId: 'acc-1', name: 'P1' },
      ];

      await serviceWithLogger.addToWaitlist(players, { groupType: 'doubles' });

      expect(api.joinWaitlist).toHaveBeenCalledWith('doubles', expect.any(Array));
    });
  });

  describe('assignFromWaitlist', () => {
    let courtsService;
    let serviceWithCourts;

    const mockCourts = [
      { number: 1, id: 'court-uuid-1' },
      { number: 2, id: 'court-uuid-2' },
    ];

    beforeEach(() => {
      courtsService = {
        getAllCourts: vi.fn().mockResolvedValue(mockCourts),
        refreshCourtData: vi.fn().mockResolvedValue(undefined),
      };

      api.assignFromWaitlist = vi.fn().mockResolvedValue({
        session: { id: 'session-1' },
      });

      serviceWithCourts = createWaitlistService({
        api,
        notifyListeners,
        transformWaitlist,
        getWaitlistData: () => waitlistDataCache,
        setWaitlistData: (v) => {
          waitlistDataCache = v;
        },
        logger,
        courtsService,
      });
    });

    it('calls assignFromWaitlist API with court ID', async () => {
      waitlistDataCache = mockApiWaitlist;

      const result = await serviceWithCourts.assignFromWaitlist('w1', 2);

      expect(courtsService.getAllCourts).toHaveBeenCalled();
      expect(api.assignFromWaitlist).toHaveBeenCalledWith('w1', 'court-uuid-2', {
        addBalls: false,
        splitBalls: false,
      });
      expect(result).toEqual({
        success: true,
        session: { id: 'session-1' },
      });
    });

    it('looks up waitlist ID when passed numeric index (legacy)', async () => {
      waitlistDataCache = mockApiWaitlist;

      await serviceWithCourts.assignFromWaitlist(0, 1);

      expect(api.assignFromWaitlist).toHaveBeenCalledWith('w1', 'court-uuid-1', expect.any(Object));
    });

    it('throws error for invalid waitlist index', async () => {
      waitlistDataCache = mockApiWaitlist;

      await expect(serviceWithCourts.assignFromWaitlist(99, 1)).rejects.toThrow(
        'Waitlist entry at index 99 not found'
      );
    });

    it('throws error for invalid court number', async () => {
      waitlistDataCache = mockApiWaitlist;

      await expect(serviceWithCourts.assignFromWaitlist('w1', 99)).rejects.toThrow(
        'Court 99 not found'
      );
    });

    it('passes ball options to API', async () => {
      waitlistDataCache = mockApiWaitlist;

      await serviceWithCourts.assignFromWaitlist('w1', 1, {
        addBalls: true,
        splitBalls: true,
      });

      expect(api.assignFromWaitlist).toHaveBeenCalledWith('w1', 'court-uuid-1', {
        addBalls: true,
        splitBalls: true,
      });
    });

    it('supports legacy balls option', async () => {
      waitlistDataCache = mockApiWaitlist;

      await serviceWithCourts.assignFromWaitlist('w1', 1, { balls: true });

      expect(api.assignFromWaitlist).toHaveBeenCalledWith('w1', 'court-uuid-1', {
        addBalls: true,
        splitBalls: false,
      });
    });

    it('refreshes both courts and waitlist after assignment', async () => {
      waitlistDataCache = mockApiWaitlist;

      await serviceWithCourts.assignFromWaitlist('w1', 1);

      expect(courtsService.refreshCourtData).toHaveBeenCalled();
      expect(api.getWaitlist).toHaveBeenCalled();
      expect(notifyListeners).toHaveBeenCalledWith('waitlist');
    });
  });
});
