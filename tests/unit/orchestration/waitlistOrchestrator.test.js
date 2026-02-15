/**
 * waitlistOrchestrator unit tests
 *
 * Tests the sendGroupToWaitlistOrchestrated function with mocked dependencies.
 * Deps shape: flat destructured object (not grouped like assignCourt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendGroupToWaitlistOrchestrated } from '../../../src/registration/orchestration/waitlistOrchestrator.js';

// Mock windowBridge to prevent DOM access
vi.mock('../../../src/platform/windowBridge.js', () => ({
  getTennisUI: () => ({ toast: vi.fn() }),
  getTennisDomain: () => null,
}));

/**
 * Create mock deps with sensible defaults.
 * Deps are flat (not grouped) for waitlist orchestrator.
 */
function createMockDeps(overrides = {}) {
  return {
    // Read values
    isJoiningWaitlist: false,
    currentGroup: [
      { id: 'member-1', name: 'Alice Smith', memberNumber: '1001' },
      { id: 'member-2', name: 'Bob Jones', memberNumber: '1002' },
    ],
    mobileFlow: false,

    // Setters
    setIsJoiningWaitlist: vi.fn(),
    setWaitlistPosition: vi.fn(),
    setGpsFailedPrompt: vi.fn(),

    // Services/helpers
    backend: {
      commands: {
        joinWaitlistWithPlayers: vi.fn().mockResolvedValue({
          ok: true,
          data: { waitlist: { id: 'entry-123', position: 1 } },
          position: 1,
        }),
      },
    },
    getMobileGeolocation: vi.fn().mockResolvedValue(null),
    validateGroupCompat: vi.fn().mockReturnValue({ ok: true, errors: [] }),
    isPlayerAlreadyPlaying: vi.fn().mockReturnValue({ isPlaying: false }),
    showAlertMessage: vi.fn(),
    API_CONFIG: {
      IS_MOBILE: false,
    },

    ...overrides,
  };
}

/**
 * Create a valid group array for testing.
 */
function createGroup(players = []) {
  if (players.length === 0) {
    return [
      { id: 'member-1', name: 'Alice Smith', memberNumber: '1001' },
      { id: 'member-2', name: 'Bob Jones', memberNumber: '1002' },
    ];
  }
  return players;
}

describe('sendGroupToWaitlistOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
    // Mock performance.now
    vi.stubGlobal('performance', { now: () => 1000 });
  });

  describe('guard: double-submit prevention', () => {
    it('returns early when isJoiningWaitlist is true', async () => {
      const deps = createMockDeps({ isJoiningWaitlist: true });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setIsJoiningWaitlist).not.toHaveBeenCalled();
      expect(deps.backend.commands.joinWaitlistWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: empty group', () => {
    it('returns early when group is null', async () => {
      const deps = createMockDeps();

      await sendGroupToWaitlistOrchestrated(null, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).not.toHaveBeenCalled();
    });

    it('returns early when group is empty array', async () => {
      const deps = createMockDeps();

      await sendGroupToWaitlistOrchestrated([], deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: group validation', () => {
    it('shows alert when validateGroupCompat returns errors', async () => {
      const deps = createMockDeps({
        validateGroupCompat: vi.fn().mockReturnValue({
          ok: false,
          errors: ['Maximum group size is 4.'],
        }),
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.showAlertMessage).toHaveBeenCalledWith('Maximum group size is 4.');
      expect(deps.backend.commands.joinWaitlistWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: player already playing', () => {
    it('shows alert when player is already registered elsewhere', async () => {
      const deps = createMockDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'court-3',
        }),
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.showAlertMessage).toHaveBeenCalledWith(
        expect.stringContaining('is already registered elsewhere')
      );
      expect(deps.backend.commands.joinWaitlistWithPlayers).not.toHaveBeenCalled();
    });

    it('allows player already in current group', async () => {
      const deps = createMockDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'current',
        }),
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalled();
    });
  });

  describe('successful waitlist join', () => {
    it('calls joinWaitlistWithPlayers with correct players', async () => {
      const deps = createMockDeps();
      const group = createGroup([
        { id: 'p1', name: 'Alice', memberNumber: '1001' },
        { id: 'p2', name: 'Bob', memberNumber: '1002' },
      ]);

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'p1', name: 'Alice' }),
            expect.objectContaining({ id: 'p2', name: 'Bob' }),
          ]),
          groupType: 'singles', // 2 players = singles
        })
      );
    });

    it('sets groupType to doubles for 4 players', async () => {
      const deps = createMockDeps();
      const group = createGroup([
        { id: 'p1', name: 'Alice', memberNumber: '1001' },
        { id: 'p2', name: 'Bob', memberNumber: '1002' },
        { id: 'p3', name: 'Charlie', memberNumber: '1003' },
        { id: 'p4', name: 'Diana', memberNumber: '1004' },
      ]);

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ groupType: 'doubles' })
      );
    });

    it('sets waitlist position on success', async () => {
      const deps = createMockDeps();
      deps.backend.commands.joinWaitlistWithPlayers.mockResolvedValue({
        ok: true,
        data: { waitlist: { id: 'entry-456', position: 3 } },
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setWaitlistPosition).toHaveBeenCalledWith(3);
    });

    it('sets isJoiningWaitlist to true then false', async () => {
      const deps = createMockDeps();
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setIsJoiningWaitlist).toHaveBeenNthCalledWith(1, true);
      expect(deps.setIsJoiningWaitlist).toHaveBeenNthCalledWith(2, false);
    });
  });

  describe('mobile flow', () => {
    it('stores entry ID in sessionStorage for mobile flow', async () => {
      const deps = createMockDeps({ mobileFlow: true });
      deps.backend.commands.joinWaitlistWithPlayers.mockResolvedValue({
        ok: true,
        data: { waitlist: { id: 'mobile-entry-789', position: 1 } },
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'mobile-waitlist-entry-id',
        'mobile-entry-789'
      );
    });

    it('does not store entry ID for non-mobile flow', async () => {
      const deps = createMockDeps({ mobileFlow: false });
      deps.backend.commands.joinWaitlistWithPlayers.mockResolvedValue({
        ok: true,
        data: { waitlist: { id: 'entry-123', position: 1 } },
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('includes geolocation when available', async () => {
      const deps = createMockDeps({
        mobileFlow: true,
        getMobileGeolocation: vi.fn().mockResolvedValue({
          latitude: 37.7749,
          longitude: -122.4194,
        }),
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
        })
      );
    });
  });

  describe('deferred option', () => {
    it('passes deferred flag when option is set', async () => {
      const deps = createMockDeps();
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps, { deferred: true });

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ deferred: true })
      );
    });
  });

  describe('error handling', () => {
    it('shows GPS prompt on mobile location error', async () => {
      const deps = createMockDeps({
        API_CONFIG: { IS_MOBILE: true },
      });
      deps.backend.commands.joinWaitlistWithPlayers.mockResolvedValue({
        ok: false,
        message: 'Location required for mobile users',
      });
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setGpsFailedPrompt).toHaveBeenCalledWith(true);
    });

    it('resets isJoiningWaitlist on exception', async () => {
      const deps = createMockDeps();
      deps.backend.commands.joinWaitlistWithPlayers.mockRejectedValue(new Error('Network error'));
      const group = createGroup();

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setIsJoiningWaitlist).toHaveBeenLastCalledWith(false);
    });
  });

  describe('guest handling', () => {
    it('includes guest flag in player data', async () => {
      const deps = createMockDeps();
      const group = [
        { id: 'member-1', name: 'Alice', memberNumber: '1001' },
        { id: 'guest-1', name: 'Guest Player', isGuest: true, sponsor: 'member-1' },
      ];

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.backend.commands.joinWaitlistWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({ name: 'Alice' }),
            expect.objectContaining({ name: 'Guest Player', isGuest: true, sponsor: 'member-1' }),
          ]),
        })
      );
    });
  });
});
