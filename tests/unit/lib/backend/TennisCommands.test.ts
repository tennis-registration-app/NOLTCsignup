import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TennisCommands } from '../../../../src/lib/backend/TennisCommands.js';
import { AppError } from '../../../../src/lib/errors/AppError.js';

// ============================================================
// Helpers
// ============================================================

function createMockApi(overrides = {}) {
  return {
    post: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    get: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    ...overrides,
  };
}

function createMockDirectory(overrides = {}) {
  return {
    getMembersByAccount: vi.fn().mockResolvedValue([]),
    searchMembers: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/**
 * Build a TennisCommands instance with mocked deps.
 * Returns { commands, api, directory } for assertions.
 */
function setup(opts: Record<string, any> = {}) {
  const api = createMockApi(opts.api);
  const directory = createMockDirectory(opts.directory);
  const commands = new TennisCommands(api, directory);
  return { commands, api, directory };
}

// Standard member fixture for resolvePlayersToParticipants tests
const ALICE = {
  id: 'member-uuid-alice',
  accountId: 'account-uuid-1001',
  displayName: 'Alice Smith',
  memberNumber: '1001',
};

const BOB = {
  id: 'member-uuid-bob',
  accountId: 'account-uuid-1002',
  displayName: 'Bob Jones',
  memberNumber: '1002',
};

// ============================================================
// A) Simple delegation — verify endpoint + payload passthrough
// ============================================================

describe('TennisCommands', () => {
  describe('simple delegation', () => {
    it('assignCourt — calls /assign-court with mapped payload', async () => {
      const { commands, api } = setup();
      const input = {
        courtId: 'C1',
        participants: [{ kind: 'member', memberId: 'M1', accountId: 'A1' }],
        groupType: 'singles',
        addBalls: true,
      };

      const result = await commands.assignCourt(input);

      expect(result.ok).toBe(true);
      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/assign-court');
      // Wire mapper transforms courtId → court_id etc.
      expect(payload.court_id).toBe('C1');
      expect(payload.session_type).toBe('singles');
      expect(payload.add_balls).toBe(true);
    });

    it('joinWaitlist — calls /join-waitlist with mapped payload', async () => {
      const { commands, api } = setup();
      const input = {
        participants: [{ kind: 'member', memberId: 'M1', accountId: 'A1' }],
        groupType: 'doubles',
      };

      await commands.joinWaitlist(input);

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/join-waitlist');
      expect(payload.group_type).toBe('doubles');
    });

    it('assignCourt — returns api response unchanged', async () => {
      const apiResponse = { ok: true, session: { id: 'S99' }, serverNow: '2025-01-01T00:00:00Z' };
      const { commands } = setup({ api: { post: vi.fn().mockResolvedValue(apiResponse) } });

      const result = await commands.assignCourt({
        courtId: 'C1',
        participants: [],
        groupType: 'singles',
      });

      expect(result).toBe(apiResponse);
    });
  });

  // ============================================================
  // B) Validate-then-delegate — command builder + wire mapper + post
  // ============================================================

  describe('validate-then-delegate', () => {
    it('endSession — validates then posts to /end-session', async () => {
      const { commands, api } = setup();

      await commands.endSession({ courtId: 'C1', reason: 'completed' });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/end-session');
      expect(payload.court_id).toBe('C1');
    });

    it('endSession — validates sessionId when provided', async () => {
      const { commands, api } = setup();

      await commands.endSession({ sessionId: 'S1', courtId: 'C1', reason: 'completed' });

      // Should still call post (validation passed)
      expect(api.post).toHaveBeenCalledOnce();
    });

    it('endSession — skips validation when no sessionId', async () => {
      const { commands, api } = setup();

      // No sessionId → no buildEndSessionCommand call → no throw
      await commands.endSession({ courtId: 'C1' });

      expect(api.post).toHaveBeenCalledOnce();
    });

    it('cancelWaitlist — validates then posts to /cancel-waitlist', async () => {
      const { commands, api } = setup();

      await commands.cancelWaitlist({ entryId: 'W1', reason: 'cancelled' });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/cancel-waitlist');
      expect(payload.waitlist_id).toBe('W1');
    });

    it('cancelWaitlist — throws on missing entryId', async () => {
      const { commands } = setup();

      await expect(commands.cancelWaitlist({ entryId: '' })).rejects.toThrow();
    });

    it('deferWaitlistEntry — validates then posts to /defer-waitlist', async () => {
      const { commands, api } = setup();

      await commands.deferWaitlistEntry({ entryId: 'W1', deferred: true });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint] = api.post.mock.calls[0];
      expect(endpoint).toBe('/defer-waitlist');
    });

    it('assignFromWaitlist — validates then posts to /assign-from-waitlist', async () => {
      const { commands, api } = setup();

      await commands.assignFromWaitlist({ waitlistEntryId: 'W1', courtId: 'C1' });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/assign-from-waitlist');
      expect(payload.waitlist_id).toBe('W1');
      expect(payload.court_id).toBe('C1');
    });

    it('assignFromWaitlist — throws on missing waitlistEntryId', async () => {
      const { commands } = setup();

      await expect(
        commands.assignFromWaitlist({ waitlistEntryId: '', courtId: 'C1' })
      ).rejects.toThrow();
    });

    it('createBlock — validates then posts to /create-block', async () => {
      const { commands, api } = setup();

      await commands.createBlock({
        courtId: 'C1',
        startTime: '2025-01-01T08:00:00Z',
        endTime: '2025-01-01T10:00:00Z',
        reason: 'maintenance',
      });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/create-block');
      expect(payload.court_id).toBe('C1');
    });

    it('createBlock — throws on missing courtId', async () => {
      const { commands } = setup();

      await expect(
        commands.createBlock({ courtId: '', reason: 'test' })
      ).rejects.toThrow();
    });

    it('cancelBlock — validates then posts to /cancel-block', async () => {
      const { commands, api } = setup();

      await commands.cancelBlock({ blockId: 'B1' });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/cancel-block');
      expect(payload.block_id).toBe('B1');
    });

    it('cancelBlock — throws on missing blockId', async () => {
      const { commands } = setup();

      await expect(commands.cancelBlock({ blockId: '' })).rejects.toThrow();
    });

    it('purchaseBalls — validates, builds command, then posts to /purchase-balls', async () => {
      const { commands, api } = setup();

      await commands.purchaseBalls({
        sessionId: 'S1',
        accountId: 'A1',
        splitBalls: true,
      });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/purchase-balls');
      expect(payload.session_id).toBe('S1');
      expect(payload.account_id).toBe('A1');
      expect(payload.split_balls).toBe(true);
    });

    it('moveCourt — validates then posts to /move-court', async () => {
      const { commands, api } = setup();

      await commands.moveCourt({ fromCourtId: 'C1', toCourtId: 'C2' });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/move-court');
      expect(payload.from_court_id).toBe('C1');
      expect(payload.to_court_id).toBe('C2');
    });

    it('clearWaitlist — validates then posts to /clear-waitlist', async () => {
      const { commands, api } = setup();

      await commands.clearWaitlist();

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint] = api.post.mock.calls[0];
      expect(endpoint).toBe('/clear-waitlist');
    });
  });

  // ============================================================
  // C) Error propagation
  // ============================================================

  describe('error propagation', () => {
    it('api.post returning ok:false — passes through error envelope', async () => {
      const errorResponse = { ok: false, code: 'COURT_OCCUPIED', message: 'Court already in use' };
      const { commands } = setup({ api: { post: vi.fn().mockResolvedValue(errorResponse) } });

      const result = await commands.assignCourt({
        courtId: 'C1',
        participants: [],
        groupType: 'singles',
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe('COURT_OCCUPIED');
      expect(result.message).toBe('Court already in use');
    });

    it('api.post network failure — propagates rejection', async () => {
      const { commands } = setup({
        api: { post: vi.fn().mockRejectedValue(new Error('Network error')) },
      });

      await expect(
        commands.assignCourt({ courtId: 'C1', participants: [], groupType: 'singles' })
      ).rejects.toThrow('Network error');
    });

    it('command builder validation failure — throws before api call', async () => {
      const { commands, api } = setup();

      // cancelWaitlist requires non-empty entryId
      await expect(commands.cancelWaitlist({ entryId: '' })).rejects.toThrow();

      // api.post should never be called
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // D) Direct payload methods — inline payload, no wire mapper
  // ============================================================

  describe('direct payload methods', () => {
    it('restoreSession — posts inline payload to /restore-session', async () => {
      const { commands, api } = setup();

      await commands.restoreSession({
        displacedSessionId: 'DS1',
        takeoverSessionId: 'TS1',
      });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/restore-session');
      expect(payload.displaced_session_id).toBe('DS1');
      expect(payload.takeover_session_id).toBe('TS1');
    });

    it('undoOvertimeTakeover — posts inline payload to /undo-overtime-takeover', async () => {
      const { commands, api } = setup();

      await commands.undoOvertimeTakeover({
        takeoverSessionId: 'TS1',
        displacedSessionId: 'DS1',
      });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/undo-overtime-takeover');
      expect(payload.takeover_session_id).toBe('TS1');
      expect(payload.displaced_session_id).toBe('DS1');
    });

    it('updateSessionTournament — posts session_id and is_tournament', async () => {
      const { commands, api } = setup();

      await commands.updateSessionTournament({ sessionId: 'S1', isTournament: true });

      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/update-session-tournament');
      expect(payload.session_id).toBe('S1');
      expect(payload.is_tournament).toBe(true);
    });

    it('generateLocationToken — posts with default validity', async () => {
      const { commands, api } = setup();

      await commands.generateLocationToken();

      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/generate-location-token');
      expect(payload.validity_minutes).toBe(5);
    });

    it('generateLocationToken — posts with custom validity', async () => {
      const { commands, api } = setup();

      await commands.generateLocationToken({ validityMinutes: 15 });

      const payload = api.post.mock.calls[0][1];
      expect(payload.validity_minutes).toBe(15);
    });

    it('assignFromWaitlistWithLocation — delegates to assignFromWaitlist', async () => {
      const { commands, api } = setup();

      await commands.assignFromWaitlistWithLocation({
        waitlistEntryId: 'W1',
        courtId: 'C1',
        latitude: 37.7,
        longitude: -122.4,
      });

      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/assign-from-waitlist');
      // Wire mapper uses waitlist_id (not waitlist_entry_id)
      expect(payload.waitlist_id).toBe('W1');
      expect(payload.court_id).toBe('C1');
    });
  });

  // ============================================================
  // E) resolvePlayersToParticipants — complex member resolution
  // ============================================================

  describe('resolvePlayersToParticipants', () => {
    it('throws when directory is not set', async () => {
      const api = createMockApi();
      const commands = new TennisCommands(api, null);

      await expect(
        commands.resolvePlayersToParticipants([{ name: 'Alice', memberNumber: '1001' }])
      ).rejects.toThrow('TennisDirectory not set');
    });

    it('resolves all-member group via directory lookup', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockImplementation((memberNumber) => {
            if (memberNumber === '1001') return Promise.resolve([ALICE]);
            if (memberNumber === '1002') return Promise.resolve([BOB]);
            return Promise.resolve([]);
          }),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { name: 'Bob Jones', memberNumber: '1002' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        kind: 'member',
        memberId: 'member-uuid-alice',
        accountId: 'account-uuid-1001',
      });
      expect(result[1]).toEqual({
        kind: 'member',
        memberId: 'member-uuid-bob',
        accountId: 'account-uuid-1002',
      });
    });

    it('fetches unique member numbers only (deduplication)', async () => {
      const getMembersByAccount = vi.fn().mockResolvedValue([
        { ...ALICE },
        { id: 'member-uuid-alice-jr', accountId: 'account-uuid-1001', displayName: 'Alice Smith Jr' },
      ]);
      const { commands } = setup({ directory: { getMembersByAccount } });

      await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { name: 'Alice Smith Jr', memberNumber: '1001' },
      ]);

      // Same account number → only 1 directory call
      expect(getMembersByAccount).toHaveBeenCalledTimes(1);
      expect(getMembersByAccount).toHaveBeenCalledWith('1001');
    });

    it('matches by partial name when exact fails', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { id: 'M1', accountId: 'A1', displayName: 'Alexander Hamilton' },
          ]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alex', memberNumber: '1001' },
      ]);

      // "Alex" is contained in "Alexander Hamilton" → partial match
      expect((result[0] as any).memberId).toBe('M1');
    });

    it('matches by last name when exact and partial fail', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { id: 'M1', accountId: 'A1', displayName: 'Robert Hamilton' },
          ]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Bob Hamilton', memberNumber: '1001' },
      ]);

      // Last name "Hamilton" matches → last-name fallback
      expect((result[0] as any).memberId).toBe('M1');
    });

    it('uses single member on account as fallback', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { id: 'M1', accountId: 'A1', displayName: 'Completely Different Name' },
          ]),
        },
      });

      // No name match at all, but only 1 member on account → fallback with warning
      const result = await commands.resolvePlayersToParticipants([
        { name: 'Totally Unrelated', memberNumber: '1001' },
      ]);

      expect((result[0] as any).memberId).toBe('M1');
    });

    it('throws when member not found and multiple on account', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { id: 'M1', accountId: 'A1', displayName: 'Person One' },
            { id: 'M2', accountId: 'A1', displayName: 'Person Two' },
          ]),
        },
      });

      await expect(
        commands.resolvePlayersToParticipants([
          { name: 'Nobody Matching', memberNumber: '1001' },
        ])
      ).rejects.toThrow('Could not find member: Nobody Matching');
    });

    it('throws when member has no member number', async () => {
      const { commands } = setup();

      await expect(
        commands.resolvePlayersToParticipants([{ name: 'No Number' }])
      ).rejects.toThrow('has no member number');
    });

    it('resolves guest players with __NEEDS_ACCOUNT__ then assigns first member account', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { name: 'Guest Player', isGuest: true },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].kind).toBe('member');
      expect(result[1]).toEqual({
        kind: 'guest',
        guestName: 'Guest Player',
        accountId: 'account-uuid-1001', // assigned from first member
      });
    });

    it('guest uses player.guest_name when name is missing', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { guest_name: 'Wire Format Guest', isGuest: true },
      ]);

      expect((result[1] as any).guestName).toBe('Wire Format Guest');
    });

    it('guest defaults to "Guest" when no name provided', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { isGuest: true },
      ]);

      expect((result[1] as any).guestName).toBe('Guest');
    });

    it('throws when all guests and no members', async () => {
      const { commands } = setup();

      await expect(
        commands.resolvePlayersToParticipants([
          { name: 'Guest 1', isGuest: true },
          { name: 'Guest 2', isGuest: true },
        ])
      ).rejects.toThrow('Cannot register guests without a member');
    });

    it('recognizes type: "guest" as guest player', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
        },
      });

      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
        { name: 'Guest Via Type', type: 'guest' },
      ]);

      expect(result[1].kind).toBe('guest');
      expect((result[1] as any).guestName).toBe('Guest Via Type');
    });

    it('uses clubNumber as fallback for memberNumber', async () => {
      const { commands, directory } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
        },
      });

      await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', clubNumber: '1001' },
      ]);

      expect(directory.getMembersByAccount).toHaveBeenCalledWith('1001');
    });

    it('empty players array returns empty result', async () => {
      const { commands } = setup();

      const result = await commands.resolvePlayersToParticipants([]);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // F) Higher-level methods — validate → resolve → call
  // ============================================================

  describe('assignCourtWithPlayers', () => {
    function setupWithDirectory() {
      return setup({
        directory: {
          getMembersByAccount: vi.fn().mockImplementation((num) => {
            if (num === '1001') return Promise.resolve([ALICE]);
            if (num === '1002') return Promise.resolve([BOB]);
            return Promise.resolve([]);
          }),
        },
      });
    }

    it('validates → resolves → calls assignCourt', async () => {
      const { commands, api } = setupWithDirectory();

      const result = await commands.assignCourtWithPlayers({
        courtId: 'C1',
        players: [
          { id: 'p1', name: 'Alice Smith', memberNumber: '1001' },
          { id: 'p2', name: 'Bob Jones', memberNumber: '1002' },
        ],
        groupType: 'singles',
        addBalls: true,
      });

      expect(result.ok).toBe(true);
      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/assign-court');
      // Participants should be resolved member UUIDs
      expect(payload.participants).toHaveLength(2);
      expect(payload.participants[0].type).toBe('member');
      expect(payload.participants[0].member_id).toBe('member-uuid-alice');
      expect(payload.add_balls).toBe(true);
    });

    it('passes geolocation to assignCourt', async () => {
      const { commands, api } = setupWithDirectory();

      await commands.assignCourtWithPlayers({
        courtId: 'C1',
        players: [{ id: 'p1', name: 'Alice Smith', memberNumber: '1001' }],
        groupType: 'singles',
        latitude: 37.7,
        longitude: -122.4,
      });

      const payload = api.post.mock.calls[0][1];
      expect(payload.latitude).toBe(37.7);
      expect(payload.longitude).toBe(-122.4);
    });

    it('throws when buildAssignCourtCommand validation fails (empty courtId)', async () => {
      const { commands, api } = setupWithDirectory();

      await expect(
        commands.assignCourtWithPlayers({
          courtId: '',
          players: [{ id: 'p1', name: 'Alice Smith', memberNumber: '1001' }],
          groupType: 'singles',
        })
      ).rejects.toThrow();

      expect(api.post).not.toHaveBeenCalled();
    });

    it('normalizes player props from both UI formats', async () => {
      const { commands, api } = setupWithDirectory();

      // Uses displayName instead of name, memberId instead of id
      await commands.assignCourtWithPlayers({
        courtId: 'C1',
        players: [
          { memberId: 'p1', displayName: 'Alice Smith', memberNumber: '1001' },
        ],
        groupType: 'singles',
      });

      expect(api.post).toHaveBeenCalledOnce();
    });
  });

  describe('joinWaitlistWithPlayers', () => {
    function setupWithDirectory() {
      return setup({
        directory: {
          getMembersByAccount: vi.fn().mockImplementation((num) => {
            if (num === '1001') return Promise.resolve([ALICE]);
            if (num === '1002') return Promise.resolve([BOB]);
            return Promise.resolve([]);
          }),
        },
      });
    }

    it('validates → resolves → calls joinWaitlist', async () => {
      const { commands, api } = setupWithDirectory();

      const result = await commands.joinWaitlistWithPlayers({
        players: [
          { id: 'p1', name: 'Alice Smith', memberNumber: '1001' },
          { id: 'p2', name: 'Bob Jones', memberNumber: '1002' },
        ],
        groupType: 'doubles',
      });

      expect(result.ok).toBe(true);
      expect(api.post).toHaveBeenCalledOnce();
      const [endpoint, payload] = api.post.mock.calls[0];
      expect(endpoint).toBe('/join-waitlist');
      expect(payload.group_type).toBe('doubles');
      expect(payload.participants).toHaveLength(2);
    });

    it('passes deferred flag through', async () => {
      const { commands, api } = setupWithDirectory();

      await commands.joinWaitlistWithPlayers({
        players: [{ id: 'p1', name: 'Alice Smith', memberNumber: '1001' }],
        groupType: 'singles',
        deferred: true,
      });

      const payload = api.post.mock.calls[0][1];
      expect(payload.deferred).toBe(true);
    });

    it('passes geolocation through', async () => {
      const { commands, api } = setupWithDirectory();

      await commands.joinWaitlistWithPlayers({
        players: [{ id: 'p1', name: 'Alice Smith', memberNumber: '1001' }],
        groupType: 'singles',
        latitude: 37.7,
        longitude: -122.4,
      });

      const payload = api.post.mock.calls[0][1];
      expect(payload.latitude).toBe(37.7);
      expect(payload.longitude).toBe(-122.4);
    });

    it('throws when validation fails (empty players)', async () => {
      const { commands, api } = setupWithDirectory();

      await expect(
        commands.joinWaitlistWithPlayers({
          players: [],
          groupType: 'singles',
        })
      ).rejects.toThrow();

      expect(api.post).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // G) AppError metadata — category + code on every throw
  // ============================================================

  describe('AppError metadata', () => {
    it('DIRECTORY_NOT_SET — throws AppError with VALIDATION category', async () => {
      const api = createMockApi();
      const commands = new TennisCommands(api, null);

      try {
        await commands.resolvePlayersToParticipants([{ name: 'A', memberNumber: '1' }]);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('VALIDATION');
        expect(e.code).toBe('DIRECTORY_NOT_SET');
        expect(e.message).toContain('TennisDirectory not set');
      }
    });

    it('MISSING_MEMBER_NUMBER — throws AppError with VALIDATION category', async () => {
      const { commands } = setup();

      try {
        await commands.resolvePlayersToParticipants([{ name: 'No Number' }]);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('VALIDATION');
        expect(e.code).toBe('MISSING_MEMBER_NUMBER');
        expect(e.message).toContain('has no member number');
      }
    });

    it('MEMBER_NOT_FOUND — throws AppError with NOT_FOUND category', async () => {
      const { commands } = setup({
        directory: {
          getMembersByAccount: vi.fn().mockResolvedValue([
            { id: 'M1', accountId: 'A1', displayName: 'Person One' },
            { id: 'M2', accountId: 'A1', displayName: 'Person Two' },
          ]),
        },
      });

      try {
        await commands.resolvePlayersToParticipants([
          { name: 'Nobody Matching', memberNumber: '1001' },
        ]);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('NOT_FOUND');
        expect(e.code).toBe('MEMBER_NOT_FOUND');
        expect(e.message).toContain('Could not find member');
      }
    });

    it('GUESTS_WITHOUT_MEMBER — throws AppError with VALIDATION category', async () => {
      const { commands } = setup();

      try {
        await commands.resolvePlayersToParticipants([
          { name: 'Guest 1', isGuest: true },
        ]);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e.category).toBe('VALIDATION');
        expect(e.code).toBe('GUESTS_WITHOUT_MEMBER');
        expect(e.message).toContain('Cannot register guests without a member');
      }
    });
  });

  // ============================================================
  // H) setDirectory
  // ============================================================

  describe('setDirectory', () => {
    it('allows setting directory after construction', async () => {
      const api = createMockApi();
      const commands = new TennisCommands(api, null);

      // Should throw without directory
      await expect(
        commands.resolvePlayersToParticipants([{ name: 'A', memberNumber: '1' }])
      ).rejects.toThrow('TennisDirectory not set');

      // Set directory
      const directory = createMockDirectory({
        getMembersByAccount: vi.fn().mockResolvedValue([ALICE]),
      });
      commands.setDirectory(directory);

      // Should now work
      const result = await commands.resolvePlayersToParticipants([
        { name: 'Alice Smith', memberNumber: '1001' },
      ]);
      expect(result[0].kind).toBe('member');
    });
  });
});
