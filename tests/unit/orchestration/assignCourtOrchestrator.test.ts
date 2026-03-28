/**
 * assignCourtOrchestrator unit tests
 *
 * Tests the assignCourtToGroupOrchestrated function with mocked dependencies.
 * Deps shape: { state, actions, services, ui }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignCourtToGroupOrchestrated } from '../../../src/registration/orchestration/assignCourtOrchestrator.js';

// Mock windowBridge to prevent DOM access
vi.mock('../../../src/platform/windowBridge.js', () => ({
  getTennisUI: () => ({ toast: vi.fn() }),
  getTennisDomain: () => ({
    time: {
      durationForGroupSize: (size) => (size <= 2 ? 60 : 90),
    },
  }),
  getUI: () => null,
}));

/**
 * Create mock deps with sensible defaults.
 * Override specific values as needed per test.
 */
function createMockDeps(overrides = {}) {
  const state = {
    isAssigning: false,
    mobileFlow: false,
    preselectedCourt: null,
    operatingHours: { isOpen: true, opensAt: '06:00', closesAt: '22:00' },
    currentGroup: [
      { id: 'member-1', name: 'Alice Smith', memberNumber: '1001' },
      { id: 'member-2', name: 'Bob Jones', memberNumber: '1002' },
    ],
    courts: [
      { number: 1, id: 'court-uuid-1', isAvailable: true, isBlocked: false },
      { number: 2, id: 'court-uuid-2', isAvailable: true, isBlocked: false },
      { number: 3, id: 'court-uuid-3', isAvailable: false, isBlocked: false },
      { number: 4, id: 'court-uuid-4', isAvailable: true, isBlocked: false },
      { number: 5, id: 'court-uuid-5', isAvailable: true, isBlocked: false },
      { number: 6, id: 'court-uuid-6', isAvailable: true, isBlocked: false },
      { number: 7, id: 'court-uuid-7', isAvailable: true, isBlocked: false },
      { number: 8, id: 'court-uuid-8', isAvailable: true, isBlocked: false },
    ],
    currentWaitlistEntryId: null,
    CONSTANTS: {
      COURT_COUNT: 8,
      CHANGE_COURT_TIMEOUT_SEC: 30,
      AUTO_RESET_SUCCESS_MS: 5000,
    },
    API_CONFIG: {
      IS_MOBILE: false,
    },
    successResetTimerRef: { current: null },
    ...overrides.state,
  };

  const actions = {
    setIsAssigning: vi.fn(),
    setCurrentWaitlistEntryId: vi.fn(),
    setHasWaitlistPriority: vi.fn(),
    setCurrentGroup: vi.fn(),
    setJustAssignedCourt: vi.fn(),
    setAssignedSessionId: vi.fn(),
    setAssignedEndTime: vi.fn(),
    setReplacedGroup: vi.fn(),
    setDisplacement: vi.fn(),
    setOriginalCourtData: vi.fn(),
    setIsChangingCourt: vi.fn(),
    setWasOvertimeCourt: vi.fn(),
    setHasAssignedCourt: vi.fn(),
    setCanChangeCourt: vi.fn(),
    setChangeTimeRemaining: vi.fn(),
    setIsTimeLimited: vi.fn(),
    setTimeLimitReason: vi.fn(),
    setShowSuccess: vi.fn(),
    setGpsFailedPrompt: vi.fn(),
    ...overrides.actions,
  };

  const services = {
    backend: {
      commands: {
        assignFromWaitlist: vi.fn().mockResolvedValue({ ok: true }),
        assignCourtWithPlayers: vi.fn().mockResolvedValue({
          ok: true,
          session: { id: 'session-123', endTime: new Date(Date.now() + 3600000).toISOString() },
        }),
      },
      queries: {
        refresh: vi.fn().mockResolvedValue(undefined),
      },
    },
    getCourtBlockStatus: vi.fn().mockResolvedValue({ isBlocked: false }),
    getMobileGeolocation: vi.fn().mockResolvedValue(null),
    validateGroupCompat: vi.fn().mockReturnValue({ ok: true, errors: [] }),
    clearSuccessResetTimer: vi.fn(),
    resetForm: vi.fn(),
    successResetTimerRef: { current: null },
    dbg: vi.fn(),
    ...overrides.services,
  };

  const ui = {
    showAlertMessage: vi.fn(),
    ...overrides.ui,
  };

  return { state, actions, services, ui };
}

describe('assignCourtToGroupOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('guard: double-submit prevention', () => {
    it('returns early when isAssigning is true', async () => {
      const deps = createMockDeps({
        state: { isAssigning: true },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      // Should not call any actions or services
      expect(deps.actions.setIsAssigning).not.toHaveBeenCalled();
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: operating hours', () => {
    it('shows toast and returns early when club is closed', async () => {
      const today = new Date().getDay(); // Get current day of week (0-6)
      const deps = createMockDeps({
        state: {
          // Operating hours expects an array with day_of_week entries
          operatingHours: [
            { dayOfWeek: today, isClosed: true, opensAt: '08:00:00', closesAt: '20:00:00' },
          ],
        },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      // Should not proceed to assignment
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: court number validation', () => {
    it('shows alert for invalid court number (0)', async () => {
      const deps = createMockDeps();

      await assignCourtToGroupOrchestrated(0, 2, deps);

      expect(deps.ui.showAlertMessage).toHaveBeenCalled();
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });

    it('shows alert for court number exceeding count', async () => {
      const deps = createMockDeps({
        state: { CONSTANTS: { COURT_COUNT: 8 } },
      });

      await assignCourtToGroupOrchestrated(99, 2, deps);

      expect(deps.ui.showAlertMessage).toHaveBeenCalled();
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: empty group', () => {
    it('shows alert when currentGroup is empty', async () => {
      const deps = createMockDeps({
        state: { currentGroup: [] },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.ui.showAlertMessage).toHaveBeenCalled();
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });

    it('shows alert when currentGroup is null', async () => {
      const deps = createMockDeps({
        state: { currentGroup: null },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.ui.showAlertMessage).toHaveBeenCalled();
    });
  });

  describe('guard: group validation', () => {
    it('shows alert when validateGroupCompat returns errors', async () => {
      const deps = createMockDeps({
        services: {
          validateGroupCompat: vi.fn().mockReturnValue({
            ok: false,
            errors: ['Group size must be at least 1.'],
          }),
        },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.ui.showAlertMessage).toHaveBeenCalled();
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });
  });

  describe('guard: upcoming block', () => {
    it('shows alert when user declines upcoming block warning', async () => {
      const confirmMock = vi.fn().mockReturnValue(false);
      vi.stubGlobal('confirm', confirmMock);

      const deps = createMockDeps({
        services: {
          getCourtBlockStatus: vi.fn().mockResolvedValue({
            isCurrent: false,
            startTime: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins from now
            reason: 'maintenance',
          }),
        },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(confirmMock).toHaveBeenCalled();
      expect(deps.ui.showAlertMessage).toHaveBeenCalledWith(
        'Please select a different court or join the waitlist.'
      );
      expect(deps.services.backend.commands.assignCourtWithPlayers).not.toHaveBeenCalled();
    });

    it('proceeds with assignment when user accepts block warning', async () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

      const deps = createMockDeps({
        services: {
          getCourtBlockStatus: vi.fn().mockResolvedValue({
            isCurrent: false,
            startTime: new Date(Date.now() + 15 * 60000).toISOString(),
            reason: 'maintenance',
          }),
        },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.services.backend.commands.assignCourtWithPlayers).toHaveBeenCalled();
    });
  });

  describe('waitlist assignment flow', () => {
    it('calls assignFromWaitlist when currentWaitlistEntryId is set', async () => {
      const deps = createMockDeps({
        state: {
          currentWaitlistEntryId: 'waitlist-entry-123',
        },
      });

      deps.services.backend.commands.assignFromWaitlist.mockResolvedValue({
        ok: true,
        session: { id: 'session-456', endTime: new Date(Date.now() + 3600000).toISOString() },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.services.backend.commands.assignFromWaitlist).toHaveBeenCalledWith(
        expect.objectContaining({
          waitlistEntryId: 'waitlist-entry-123',
          courtId: 'court-uuid-1',
        })
      );
    });

    it('clears waitlist entry ID on successful assignment', async () => {
      const deps = createMockDeps({
        state: { currentWaitlistEntryId: 'waitlist-entry-123' },
      });

      deps.services.backend.commands.assignFromWaitlist.mockResolvedValue({
        ok: true,
        session: { id: 'session-456' },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.actions.setCurrentWaitlistEntryId).toHaveBeenCalledWith(null);
    });
  });

  describe('direct assignment flow', () => {
    it('calls assignCourtWithPlayers for non-waitlist group', async () => {
      const deps = createMockDeps({
        state: {
          currentWaitlistEntryId: null,
          currentGroup: [
            { id: 'member-1', name: 'Alice', memberNumber: '1001' },
            { id: 'member-2', name: 'Bob', memberNumber: '1002' },
          ],
        },
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.services.backend.commands.assignCourtWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          courtId: 'court-uuid-1',
          players: expect.arrayContaining([
            expect.objectContaining({ name: 'Alice' }),
            expect.objectContaining({ name: 'Bob' }),
          ]),
        })
      );
    });

    it('sets success state on successful assignment', async () => {
      const deps = createMockDeps();

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.actions.setJustAssignedCourt).toHaveBeenCalledWith(1);
      expect(deps.actions.setHasAssignedCourt).toHaveBeenCalledWith(true);
      expect(deps.actions.setShowSuccess).toHaveBeenCalledWith(true);
    });

    it('sets isAssigning to false after completion', async () => {
      const deps = createMockDeps();

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.actions.setIsAssigning).toHaveBeenLastCalledWith(false);
    });
  });

  describe('error handling', () => {
    it('sets isAssigning to false on API error', async () => {
      const deps = createMockDeps();
      deps.services.backend.commands.assignCourtWithPlayers.mockRejectedValue(
        new Error('Network error')
      );

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.actions.setIsAssigning).toHaveBeenLastCalledWith(false);
    });

    it('shows GPS prompt on mobile location error', async () => {
      const deps = createMockDeps({
        state: {
          API_CONFIG: { IS_MOBILE: true },
        },
      });

      deps.services.backend.commands.assignCourtWithPlayers.mockResolvedValue({
        ok: false,
        message: 'Location required for mobile assignment',
      });

      await assignCourtToGroupOrchestrated(1, 2, deps);

      expect(deps.actions.setGpsFailedPrompt).toHaveBeenCalledWith(true);
    });
  });

  describe('mobile flow', () => {
    it('uses preselectedCourt when in mobile flow without courtNumber', async () => {
      const deps = createMockDeps({
        state: {
          mobileFlow: true,
          preselectedCourt: 5,
        },
      });

      await assignCourtToGroupOrchestrated(null, 2, deps);

      expect(deps.services.backend.commands.assignCourtWithPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ courtId: 'court-uuid-5' })
      );
    });
  });
});
