/**
 * memberSelectionOrchestrator unit tests
 *
 * Tests handleSuggestionClickOrchestrated and handleAddPlayerSuggestionClickOrchestrated
 * with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSuggestionClickOrchestrated,
  handleAddPlayerSuggestionClickOrchestrated,
} from '../../../src/registration/orchestration/memberSelectionOrchestrator.js';

// Mock logger to prevent console output
vi.mock('../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock toast
vi.mock('../../../src/shared/utils/toast.js', () => ({
  toast: vi.fn(),
}));

function makeSuggestion(overrides = {}) {
  return {
    memberNumber: '1001',
    member: {
      id: 'member-uuid-1',
      name: 'Alice Smith',
      displayName: 'Alice Smith',
      accountId: 'account-1',
      phone: '555-0100',
      ranking: 4.0,
      winRate: 0.6,
      unclearedStreak: 0,
      ...overrides.member,
    },
    ...overrides,
  };
}

function createSuggestionClickDeps(overrides = {}) {
  return {
    currentGroup: [],
    setSearchInput: vi.fn(),
    setShowSuggestions: vi.fn(),
    setMemberNumber: vi.fn(),
    setCurrentMemberId: vi.fn(),
    setRegistrantStreak: vi.fn(),
    setStreakAcknowledged: vi.fn(),
    setCurrentGroup: vi.fn(),
    setCurrentScreen: vi.fn(),
    backend: {
      directory: {
        invalidateAccount: vi.fn(),
        getMembersByAccount: vi.fn().mockResolvedValue([]),
      },
    },
    fetchFrequentPartners: vi.fn(),
    isPlayerAlreadyPlaying: vi.fn().mockReturnValue({ isPlaying: false }),
    guardAddPlayerEarly: vi.fn().mockReturnValue(true),
    getCourtData: vi.fn().mockReturnValue({ courts: [], waitlist: [] }),
    getAvailableCourts: vi.fn().mockReturnValue([1, 2]),
    showAlertMessage: vi.fn(),
    ...overrides,
  };
}

function createAddPlayerDeps(overrides = {}) {
  return {
    currentGroup: [{ id: 'existing-1', name: 'Bob', memberNumber: '1002' }],
    setAddPlayerSearch: vi.fn(),
    setShowAddPlayer: vi.fn(),
    setShowAddPlayerSuggestions: vi.fn(),
    setCurrentGroup: vi.fn(),
    setHasWaitlistPriority: vi.fn(),
    setAlertMessage: vi.fn(),
    setShowAlert: vi.fn(),
    guardAddPlayerEarly: vi.fn().mockReturnValue(true),
    guardAgainstGroupDuplicate: vi.fn().mockReturnValue(true),
    isPlayerAlreadyPlaying: vi.fn().mockReturnValue({ isPlaying: false }),
    getAvailableCourts: vi.fn().mockReturnValue([1, 2]),
    getCourtData: vi.fn().mockReturnValue({ courts: [], waitlist: [] }),
    saveCourtData: vi.fn().mockResolvedValue(true),
    findMemberNumber: vi.fn().mockReturnValue('1001'),
    showAlertMessage: vi.fn(),
    CONSTANTS: { MAX_PLAYERS: 4, ALERT_DISPLAY_MS: 3000 },
    ...overrides,
  };
}

// ── handleSuggestionClickOrchestrated ──────────────────────────
describe('handleSuggestionClickOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('guard: invalid suggestion', () => {
    it('shows alert for null suggestion', async () => {
      const deps = createSuggestionClickDeps();
      await handleSuggestionClickOrchestrated(null, deps);
      expect(deps.showAlertMessage).toHaveBeenCalledWith(
        'Invalid member selection. Please try again.'
      );
    });

    it('shows alert for suggestion without memberNumber', async () => {
      const deps = createSuggestionClickDeps();
      await handleSuggestionClickOrchestrated(
        { member: { id: '1' }, memberNumber: '' },
        deps
      );
      expect(deps.showAlertMessage).toHaveBeenCalled();
    });

    it('shows alert for suggestion without member object', async () => {
      const deps = createSuggestionClickDeps();
      await handleSuggestionClickOrchestrated(
        { memberNumber: '1001', member: null },
        deps
      );
      expect(deps.showAlertMessage).toHaveBeenCalled();
    });
  });

  describe('guard: player already on court', () => {
    it('returns early and clears input when player is on a court', async () => {
      const deps = createSuggestionClickDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'court',
          courtNumber: 3,
        }),
      });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setSearchInput).toHaveBeenCalledWith('');
      expect(deps.setShowSuggestions).toHaveBeenCalledWith(false);
      expect(deps.setMemberNumber).not.toHaveBeenCalled();
    });
  });

  describe('guard: guardAddPlayerEarly', () => {
    it('returns early when guardAddPlayerEarly fails', async () => {
      const deps = createSuggestionClickDeps({
        guardAddPlayerEarly: vi.fn().mockReturnValue(false),
      });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setSearchInput).toHaveBeenCalledWith('');
      expect(deps.setShowSuggestions).toHaveBeenCalledWith(false);
      expect(deps.setMemberNumber).not.toHaveBeenCalled();
    });
  });

  describe('guard: player on waitlist', () => {
    it('shows COURT_READY toast when position 1 with available court', async () => {
      const { toast } = await import('../../../src/shared/utils/toast.js');
      const deps = createSuggestionClickDeps({
        isPlayerAlreadyPlaying: vi.fn()
          .mockReturnValueOnce({ isPlaying: false }) // first call (court check)
          .mockReturnValueOnce({ isPlaying: true, location: 'waiting', position: 1 }), // second call
        getAvailableCourts: vi.fn().mockReturnValue([1]),
      });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(toast).toHaveBeenCalled();
      expect(deps.setSearchInput).toHaveBeenCalledWith('');
      expect(deps.setMemberNumber).not.toHaveBeenCalled();
    });

    it('shows ALREADY_ON_WAITLIST toast when on waitlist without court ready', async () => {
      const { toast } = await import('../../../src/shared/utils/toast.js');
      const deps = createSuggestionClickDeps({
        isPlayerAlreadyPlaying: vi.fn()
          .mockReturnValueOnce({ isPlaying: false })
          .mockReturnValueOnce({ isPlaying: true, location: 'waiting', position: 3 }),
        getAvailableCourts: vi.fn().mockReturnValue([]),
      });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(toast).toHaveBeenCalled();
      expect(deps.setMemberNumber).not.toHaveBeenCalled();
    });
  });

  describe('success: normal selection flow', () => {
    it('sets member number and navigates to group screen', async () => {
      const deps = createSuggestionClickDeps();

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setMemberNumber).toHaveBeenCalledWith('1001');
      expect(deps.setCurrentMemberId).toHaveBeenCalledWith('member-uuid-1');
      expect(deps.setCurrentScreen).toHaveBeenCalledWith('group', 'handleSuggestionClick');
    });

    it('adds player to currentGroup', async () => {
      const deps = createSuggestionClickDeps();

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setCurrentGroup).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Alice Smith',
          memberNumber: '1001',
          id: 'member-uuid-1',
        }),
      ]);
    });

    it('clears search input and suggestions', async () => {
      const deps = createSuggestionClickDeps();

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setSearchInput).toHaveBeenCalledWith('');
      expect(deps.setShowSuggestions).toHaveBeenCalledWith(false);
    });

    it('fetches frequent partners', async () => {
      const deps = createSuggestionClickDeps();

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.fetchFrequentPartners).toHaveBeenCalledWith('member-uuid-1');
    });

    it('sets registrant streak defaults for first player', async () => {
      const deps = createSuggestionClickDeps({ currentGroup: [] });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setRegistrantStreak).toHaveBeenCalledWith(0);
      expect(deps.setStreakAcknowledged).toHaveBeenCalledWith(false);
    });

    it('does not reset streak when adding to non-empty group', async () => {
      const deps = createSuggestionClickDeps({
        currentGroup: [{ id: 'existing', name: 'Bob', memberNumber: '1002' }],
      });

      await handleSuggestionClickOrchestrated(makeSuggestion(), deps);

      // setRegistrantStreak should not be called for non-first player
      expect(deps.setRegistrantStreak).not.toHaveBeenCalled();
    });
  });
});

// ── handleAddPlayerSuggestionClickOrchestrated ─────────────────
describe('handleAddPlayerSuggestionClickOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('guard: invalid suggestion', () => {
    it('shows alert for null suggestion', async () => {
      const deps = createAddPlayerDeps();
      await handleAddPlayerSuggestionClickOrchestrated(null, deps);
      expect(deps.showAlertMessage).toHaveBeenCalledWith(
        'Invalid player selection. Please try again.'
      );
    });

    it('shows alert for suggestion without member.id', async () => {
      const deps = createAddPlayerDeps();
      await handleAddPlayerSuggestionClickOrchestrated(
        { memberNumber: '1001', member: { id: '', name: 'Test' } },
        deps
      );
      expect(deps.showAlertMessage).toHaveBeenCalled();
    });
  });

  describe('guard: guardAddPlayerEarly', () => {
    it('clears UI when guardAddPlayerEarly fails', async () => {
      const deps = createAddPlayerDeps({
        guardAddPlayerEarly: vi.fn().mockReturnValue(false),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setAddPlayerSearch).toHaveBeenCalledWith('');
      expect(deps.setShowAddPlayer).toHaveBeenCalledWith(false);
      expect(deps.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
    });
  });

  describe('guard: group duplicate', () => {
    it('shows toast and clears UI when duplicate detected', async () => {
      const { toast } = await import('../../../src/shared/utils/toast.js');
      const deps = createAddPlayerDeps({
        guardAgainstGroupDuplicate: vi.fn().mockReturnValue(false),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(toast).toHaveBeenCalled();
      expect(deps.setAddPlayerSearch).toHaveBeenCalledWith('');
      expect(deps.setShowAddPlayer).toHaveBeenCalledWith(false);
    });
  });

  describe('waitlist priority transfer', () => {
    it('transfers waitlist group when position 1 with court available', async () => {
      const waitlistPlayers = [
        { memberId: 'wl-1', displayName: 'Waitlist Alice' },
        { memberId: 'wl-2', displayName: 'Waitlist Bob' },
      ];

      const deps = createAddPlayerDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'waiting',
          position: 1,
        }),
        getCourtData: vi.fn().mockReturnValue({
          courts: [],
          waitlist: [{ group: { players: waitlistPlayers } }],
        }),
        getAvailableCourts: vi.fn().mockReturnValue([1]),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setCurrentGroup).toHaveBeenCalled();
      expect(deps.setHasWaitlistPriority).toHaveBeenCalledWith(true);
      expect(deps.saveCourtData).toHaveBeenCalled();
    });
  });

  describe('guard: max players', () => {
    it('shows alert when group is full', async () => {
      const deps = createAddPlayerDeps({
        currentGroup: [
          { id: '1', name: 'A', memberNumber: '1' },
          { id: '2', name: 'B', memberNumber: '2' },
          { id: '3', name: 'C', memberNumber: '3' },
          { id: '4', name: 'D', memberNumber: '4' },
        ],
        CONSTANTS: { MAX_PLAYERS: 4, ALERT_DISPLAY_MS: 3000 },
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.showAlertMessage).toHaveBeenCalledWith('Group is full (max 4 players)');
    });
  });

  describe('success: add player to group', () => {
    it('adds new player to existing group', async () => {
      const deps = createAddPlayerDeps();

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setCurrentGroup).toHaveBeenCalledWith([
        { id: 'existing-1', name: 'Bob', memberNumber: '1002' },
        expect.objectContaining({
          name: 'Alice Smith',
          memberNumber: '1001',
          id: 'member-uuid-1',
        }),
      ]);
    });

    it('clears add player UI after adding', async () => {
      const deps = createAddPlayerDeps();

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setAddPlayerSearch).toHaveBeenCalledWith('');
      expect(deps.setShowAddPlayer).toHaveBeenCalledWith(false);
      expect(deps.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
    });
  });

  describe('player already playing feedback', () => {
    it('shows alert for player already on court', async () => {
      const deps = createAddPlayerDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'court',
          playerName: 'Alice',
          courtNumber: 3,
        }),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setAlertMessage).toHaveBeenCalledWith(
        'Alice is already playing on Court 3'
      );
      expect(deps.setShowAlert).toHaveBeenCalledWith(true);
    });

    it('shows alert for player on waitlist (not position 1)', async () => {
      const deps = createAddPlayerDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'waiting',
          position: 3,
          playerName: 'Alice',
        }),
        getAvailableCourts: vi.fn().mockReturnValue([]),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setAlertMessage).toHaveBeenCalledWith(
        'Alice is already in a group waiting for a court'
      );
    });

    it('shows alert for player in current group', async () => {
      const deps = createAddPlayerDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'current',
          playerName: 'Alice',
        }),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setAlertMessage).toHaveBeenCalledWith(
        'Alice is already in your group'
      );
    });

    it('auto-dismisses alert after ALERT_DISPLAY_MS', async () => {
      const deps = createAddPlayerDeps({
        isPlayerAlreadyPlaying: vi.fn().mockReturnValue({
          isPlaying: true,
          location: 'court',
          playerName: 'Alice',
          courtNumber: 1,
        }),
      });

      await handleAddPlayerSuggestionClickOrchestrated(makeSuggestion(), deps);

      expect(deps.setShowAlert).toHaveBeenCalledWith(true);
      vi.advanceTimersByTime(3000);
      expect(deps.setShowAlert).toHaveBeenCalledWith(false);
    });
  });
});
