import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCourtsService } from '../../../../src/registration/services/modules/courtsService.js';

describe('courtsService', () => {
  let api;
  let notifyListeners;
  let transformCourts;
  let courtDataCache;
  let logger;
  let service;

  const mockApiCourts = {
    courts: [
      { court_number: 1, status: 'available' },
      { court_number: 2, status: 'occupied' },
      { court_number: 3, status: 'available' },
    ],
  };

  const mockTransformedCourts = [
    { number: 1, isAvailable: true },
    { number: 2, isAvailable: false },
    { number: 3, isAvailable: true },
  ];

  beforeEach(() => {
    courtDataCache = null;

    api = {
      getCourtStatus: vi.fn().mockResolvedValue(mockApiCourts),
    };

    notifyListeners = vi.fn();
    transformCourts = vi.fn().mockReturnValue(mockTransformedCourts);
    logger = {
      error: vi.fn(),
    };

    service = createCourtsService({
      api,
      notifyListeners,
      transformCourts,
      getCourtData: () => courtDataCache,
      setCourtData: (v) => {
        courtDataCache = v;
      },
      logger,
    });
  });

  describe('refreshCourtData', () => {
    it('fetches court data from API and stores in cache', async () => {
      await service.refreshCourtData();

      expect(api.getCourtStatus).toHaveBeenCalledWith(true);
      expect(courtDataCache).toBe(mockApiCourts);
    });

    it('notifies listeners after refresh', async () => {
      await service.refreshCourtData();

      expect(notifyListeners).toHaveBeenCalledWith('courts');
    });

    it('returns transformed courts', async () => {
      const result = await service.refreshCourtData();

      expect(transformCourts).toHaveBeenCalledWith(mockApiCourts.courts);
      expect(result).toBe(mockTransformedCourts);
    });

    it('logs and rethrows errors', async () => {
      const error = new Error('API failed');
      api.getCourtStatus.mockRejectedValue(error);

      await expect(service.refreshCourtData()).rejects.toThrow('API failed');
      expect(logger.error).toHaveBeenCalledWith('ApiService', 'Failed to refresh court data', error);
    });
  });

  describe('getAllCourts', () => {
    it('refreshes data if cache is empty', async () => {
      const result = await service.getAllCourts();

      expect(api.getCourtStatus).toHaveBeenCalled();
      expect(result).toBe(mockTransformedCourts);
    });

    it('uses cached data if available', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getAllCourts();

      expect(api.getCourtStatus).not.toHaveBeenCalled();
      expect(transformCourts).toHaveBeenCalledWith(mockApiCourts.courts);
      expect(result).toBe(mockTransformedCourts);
    });
  });

  describe('getAvailableCourts', () => {
    it('returns only available courts', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getAvailableCourts();

      expect(result).toEqual([
        { number: 1, isAvailable: true },
        { number: 3, isAvailable: true },
      ]);
    });

    it('refreshes data if cache is empty', async () => {
      const result = await service.getAvailableCourts();

      expect(api.getCourtStatus).toHaveBeenCalled();
      expect(result).toEqual([
        { number: 1, isAvailable: true },
        { number: 3, isAvailable: true },
      ]);
    });
  });

  describe('getCourtByNumber', () => {
    it('returns correct court by number', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getCourtByNumber(2);

      expect(result).toEqual({ number: 2, isAvailable: false });
    });

    it('returns undefined if court not found', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.getCourtByNumber(99);

      expect(result).toBeUndefined();
    });
  });

  describe('clearCourt', () => {
    const mockTransformedCourtsWithIds = [
      { number: 1, id: 'court-uuid-1', isAvailable: true },
      { number: 2, id: 'court-uuid-2', isAvailable: false },
      { number: 3, id: 'court-uuid-3', isAvailable: true },
    ];

    beforeEach(() => {
      transformCourts.mockReturnValue(mockTransformedCourtsWithIds);
      api.endSessionByCourt = vi.fn().mockResolvedValue({
        session: { id: 'session-1' },
      });
      logger.debug = vi.fn();
    });

    it('calls endSessionByCourt with court id and default reason', async () => {
      courtDataCache = mockApiCourts;

      const result = await service.clearCourt(2);

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'completed');
      expect(result).toEqual({
        success: true,
        session: { id: 'session-1' },
      });
    });

    it('throws error for invalid court number', async () => {
      courtDataCache = mockApiCourts;

      await expect(service.clearCourt(99)).rejects.toThrow('Court 99 not found');
    });

    it('maps "early" reason to cleared_early', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Left early' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'cleared_early');
    });

    it('maps "done" reason to cleared_early', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { reason: 'done playing' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'cleared_early');
    });

    it('maps "observed empty" reason to completed', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Observed empty' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'completed');
    });

    it('maps "admin override" reason to admin_override', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Admin override' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'admin_override');
    });

    it('maps "force" reason to admin_override', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { reason: 'Force clear' });

      expect(api.endSessionByCourt).toHaveBeenCalledWith('court-uuid-2', 'admin_override');
    });

    it('refreshes court data after clearing', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2);

      // refreshCourtData calls getCourtStatus
      expect(api.getCourtStatus).toHaveBeenCalledWith(true);
      expect(notifyListeners).toHaveBeenCalledWith('courts');
    });

    it('logs debug message with mapped reason', async () => {
      courtDataCache = mockApiCourts;

      await service.clearCourt(2, { clearReason: 'Left early' });

      expect(logger.debug).toHaveBeenCalledWith(
        'ApiService',
        'Clearing court 2 with reason: cleared_early (legacy: Left early)'
      );
    });
  });

  describe('assignCourt', () => {
    const mockTransformedCourtsWithIds = [
      { number: 1, id: 'court-uuid-1', isAvailable: true },
      { number: 2, id: 'court-uuid-2', isAvailable: false },
      { number: 3, id: 'court-uuid-3', isAvailable: true },
    ];

    beforeEach(() => {
      transformCourts.mockReturnValue(mockTransformedCourtsWithIds);
      api.assignCourt = vi.fn().mockResolvedValue({
        session: { id: 'session-123' },
      });
      api.getMembersByAccount = vi.fn();
      api.getMembers = vi.fn();
      logger.debug = vi.fn();
      logger.warn = vi.fn();
    });

    it('calls api.assignCourt with correct court id derived from courts list', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
      ];

      const result = await service.assignCourt(1, players);

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        expect.any(Array),
        { addBalls: false, splitBalls: false }
      );
      expect(result).toEqual({
        success: true,
        session: { id: 'session-123' },
        court: 1,
      });
    });

    it('throws error for invalid court number', async () => {
      courtDataCache = mockApiCourts;

      const players = [{ id: 'uuid-1', accountId: 'account-1', name: 'John' }];

      await expect(service.assignCourt(99, players)).rejects.toThrow('Court 99 not found');
    });

    it('passes UUID player directly without lookup', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
      ];

      await service.assignCourt(1, players);

      expect(api.getMembersByAccount).not.toHaveBeenCalled();
      expect(api.getMembers).not.toHaveBeenCalled();
      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        [
          {
            type: 'member',
            member_id: '11111111-2222-3333-4444-555555555555',
            account_id: 'account-1',
          },
        ],
        expect.any(Object)
      );
    });

    it('looks up member by memberNumber when UUID not provided', async () => {
      courtDataCache = mockApiCourts;
      api.getMembersByAccount.mockResolvedValue({
        members: [
          {
            id: 'looked-up-uuid',
            account_id: 'looked-up-account',
            first_name: 'John',
            last_name: 'Doe',
            is_primary: true,
          },
        ],
      });

      const players = [{ memberNumber: '12345', name: 'John Doe' }];

      await service.assignCourt(1, players);

      expect(api.getMembersByAccount).toHaveBeenCalledWith('12345');
      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        [
          {
            type: 'member',
            member_id: 'looked-up-uuid',
            account_id: 'looked-up-account',
          },
        ],
        expect.any(Object)
      );
    });

    it('falls back to name search when memberNumber lookup fails', async () => {
      courtDataCache = mockApiCourts;
      api.getMembersByAccount.mockRejectedValue(new Error('Not found'));
      api.getMembers.mockResolvedValue({
        members: [
          {
            id: 'name-search-uuid',
            account_id: 'name-search-account',
            first_name: 'Jane',
            last_name: 'Smith',
          },
        ],
      });

      const players = [{ memberNumber: '99999', name: 'Jane Smith' }];

      await service.assignCourt(1, players);

      expect(api.getMembers).toHaveBeenCalledWith('Jane Smith');
      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        [
          {
            type: 'member',
            member_id: 'name-search-uuid',
            account_id: 'name-search-account',
          },
        ],
        expect.any(Object)
      );
    });

    it('handles guest players correctly', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
        { isGuest: true, name: 'Guest Player' },
      ];

      await service.assignCourt(1, players);

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        [
          {
            type: 'member',
            member_id: '11111111-2222-3333-4444-555555555555',
            account_id: 'account-1',
          },
          {
            type: 'guest',
            guest_name: 'Guest Player',
            account_id: 'account-1',
            charged_to_account_id: 'account-1',
          },
        ],
        expect.any(Object)
      );
    });

    it('determines singles session type for 1-2 players', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
        { id: '22222222-3333-4444-5555-666666666666', accountId: 'account-2', name: 'Jane' },
      ];

      await service.assignCourt(1, players);

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('determines doubles session type for 3+ players', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
        { id: '22222222-3333-4444-5555-666666666666', accountId: 'account-2', name: 'Jane' },
        { id: '33333333-4444-5555-6666-777777777777', accountId: 'account-3', name: 'Bob' },
      ];

      await service.assignCourt(1, players);

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'doubles',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('passes addBalls option through to API', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
      ];

      await service.assignCourt(1, players, { addBalls: true });

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        expect.any(Array),
        { addBalls: true, splitBalls: false }
      );
    });

    it('passes legacy balls option through to API', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
      ];

      await service.assignCourt(1, players, { balls: true });

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        expect.any(Array),
        { addBalls: true, splitBalls: false }
      );
    });

    it('refreshes court data after assignment', async () => {
      courtDataCache = mockApiCourts;

      const players = [
        { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
      ];

      await service.assignCourt(1, players);

      expect(api.getCourtStatus).toHaveBeenCalledWith(true);
      expect(notifyListeners).toHaveBeenCalledWith('courts');
    });

    it('throws error when participant missing account_id', async () => {
      courtDataCache = mockApiCourts;
      api.getMembersByAccount.mockResolvedValue({ members: [] });
      api.getMembers.mockResolvedValue({ members: [] });

      const players = [{ memberNumber: '12345', name: 'Unknown Player' }];

      await expect(service.assignCourt(1, players)).rejects.toThrow(
        'Could not determine account_id for participant'
      );
    });

    it('handles legacy group format with players array', async () => {
      courtDataCache = mockApiCourts;

      const group = {
        players: [
          { id: '11111111-2222-3333-4444-555555555555', accountId: 'account-1', name: 'John' },
        ],
        guests: 0,
      };

      await service.assignCourt(1, group, 60);

      expect(api.assignCourt).toHaveBeenCalledWith(
        'court-uuid-1',
        'singles',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('throws error for invalid players format', async () => {
      courtDataCache = mockApiCourts;

      await expect(service.assignCourt(1, 'invalid')).rejects.toThrow('Invalid players format');
    });
  });
});
