/**
 * resetOrchestrator unit tests
 *
 * Tests resetFormOrchestrated and applyInactivityTimeoutOrchestrated
 * with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resetFormOrchestrated,
  applyInactivityTimeoutOrchestrated,
} from '../../../src/registration/orchestration/resetOrchestrator.js';

// Mock logger
vi.mock('../../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function createResetFormActions() {
  return {
    setCurrentGroup: vi.fn(),
    setShowSuccess: vi.fn(),
    setMemberNumber: vi.fn(),
    setCurrentMemberId: vi.fn(),
    setJustAssignedCourt: vi.fn(),
    setAssignedSessionId: vi.fn(),
    setAssignedEndTime: vi.fn(),
    setReplacedGroup: vi.fn(),
    setDisplacement: vi.fn(),
    setOriginalCourtData: vi.fn(),
    setCanChangeCourt: vi.fn(),
    setIsTimeLimited: vi.fn(),
    setCurrentScreen: vi.fn(),
    setSearchInput: vi.fn(),
    setShowSuggestions: vi.fn(),
    setShowAddPlayer: vi.fn(),
    setAddPlayerSearch: vi.fn(),
    setShowAddPlayerSuggestions: vi.fn(),
    setHasWaitlistPriority: vi.fn(),
    setCurrentWaitlistEntryId: vi.fn(),
    setWaitlistPosition: vi.fn(),
    setSelectedCourtToClear: vi.fn(),
    setClearCourtStep: vi.fn(),
    setIsChangingCourt: vi.fn(),
    setWasOvertimeCourt: vi.fn(),
    setCourtToMove: vi.fn(),
    setHasAssignedCourt: vi.fn(),
    setShowGuestForm: vi.fn(),
    setGuestName: vi.fn(),
    setGuestSponsor: vi.fn(),
    setShowGuestNameError: vi.fn(),
    setShowSponsorError: vi.fn(),
    setRegistrantStreak: vi.fn(),
    setShowStreakModal: vi.fn(),
    setStreakAcknowledged: vi.fn(),
  };
}

function createResetFormDeps(overrides = {}) {
  const actions = createResetFormActions();
  const services = {
    clearCache: vi.fn(),
    clearSuccessResetTimer: vi.fn(),
    refresh: vi.fn().mockResolvedValue({}),
    ...overrides.services,
  };
  return { actions, services, ...overrides };
}

function createTimeoutDeps(overrides = {}) {
  return {
    setCurrentGroup: vi.fn(),
    setShowSuccess: vi.fn(),
    setMemberNumber: vi.fn(),
    setCurrentMemberId: vi.fn(),
    setJustAssignedCourt: vi.fn(),
    setReplacedGroup: vi.fn(),
    setDisplacement: vi.fn(),
    setOriginalCourtData: vi.fn(),
    setCanChangeCourt: vi.fn(),
    setIsTimeLimited: vi.fn(),
    setCurrentScreen: vi.fn(),
    setAssignedSessionId: vi.fn(),
    setAssignedEndTime: vi.fn(),
    setCurrentWaitlistEntryId: vi.fn(),
    setWaitlistPosition: vi.fn(),
    setCourtToMove: vi.fn(),
    setHasAssignedCourt: vi.fn(),
    setShowGuestForm: vi.fn(),
    setGuestName: vi.fn(),
    setGuestSponsor: vi.fn(),
    setRegistrantStreak: vi.fn(),
    setShowStreakModal: vi.fn(),
    setStreakAcknowledged: vi.fn(),
    setSearchInput: vi.fn(),
    setShowSuggestions: vi.fn(),
    setShowAddPlayer: vi.fn(),
    setAddPlayerSearch: vi.fn(),
    setShowAddPlayerSuggestions: vi.fn(),
    setHasWaitlistPriority: vi.fn(),
    setSelectedCourtToClear: vi.fn(),
    setClearCourtStep: vi.fn(),
    setIsChangingCourt: vi.fn(),
    setWasOvertimeCourt: vi.fn(),
    clearSuccessResetTimer: vi.fn(),
    refresh: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// ── resetFormOrchestrated ──────────────────────────────────────
describe('resetFormOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the success reset timer', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.services.clearSuccessResetTimer).toHaveBeenCalled();
  });

  it('clears the frequent partners cache', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.services.clearCache).toHaveBeenCalled();
  });

  it('resets currentGroup to empty array', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setCurrentGroup).toHaveBeenCalledWith([]);
  });

  it('resets showSuccess to false', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setShowSuccess).toHaveBeenCalledWith(false);
  });

  it('clears member identity fields', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setMemberNumber).toHaveBeenCalledWith('');
    expect(deps.actions.setCurrentMemberId).toHaveBeenCalledWith(null);
  });

  it('clears assignment state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setJustAssignedCourt).toHaveBeenCalledWith(null);
    expect(deps.actions.setAssignedSessionId).toHaveBeenCalledWith(null);
    expect(deps.actions.setAssignedEndTime).toHaveBeenCalledWith(null);
    expect(deps.actions.setHasAssignedCourt).toHaveBeenCalledWith(false);
  });

  it('clears replacement/displacement state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setReplacedGroup).toHaveBeenCalledWith(null);
    expect(deps.actions.setDisplacement).toHaveBeenCalledWith(null);
    expect(deps.actions.setOriginalCourtData).toHaveBeenCalledWith(null);
  });

  it('resets court change state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setCanChangeCourt).toHaveBeenCalledWith(false);
    expect(deps.actions.setIsChangingCourt).toHaveBeenCalledWith(false);
    expect(deps.actions.setWasOvertimeCourt).toHaveBeenCalledWith(false);
    expect(deps.actions.setCourtToMove).toHaveBeenCalledWith(null);
    expect(deps.actions.setIsTimeLimited).toHaveBeenCalledWith(false);
  });

  it('navigates to home screen', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setCurrentScreen).toHaveBeenCalledWith('home', 'resetForm');
  });

  it('clears search/suggestion UI', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setSearchInput).toHaveBeenCalledWith('');
    expect(deps.actions.setShowSuggestions).toHaveBeenCalledWith(false);
    expect(deps.actions.setShowAddPlayer).toHaveBeenCalledWith(false);
    expect(deps.actions.setAddPlayerSearch).toHaveBeenCalledWith('');
    expect(deps.actions.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
  });

  it('clears waitlist state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setHasWaitlistPriority).toHaveBeenCalledWith(false);
    expect(deps.actions.setCurrentWaitlistEntryId).toHaveBeenCalledWith(null);
    expect(deps.actions.setWaitlistPosition).toHaveBeenCalledWith(0);
  });

  it('clears clear-court state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setSelectedCourtToClear).toHaveBeenCalledWith(null);
    expect(deps.actions.setClearCourtStep).toHaveBeenCalledWith(1);
  });

  it('clears guest form state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setShowGuestForm).toHaveBeenCalledWith(false);
    expect(deps.actions.setGuestName).toHaveBeenCalledWith('');
    expect(deps.actions.setGuestSponsor).toHaveBeenCalledWith('');
    expect(deps.actions.setShowGuestNameError).toHaveBeenCalledWith(false);
    expect(deps.actions.setShowSponsorError).toHaveBeenCalledWith(false);
  });

  it('clears streak state', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setRegistrantStreak).toHaveBeenCalledWith(0);
    expect(deps.actions.setShowStreakModal).toHaveBeenCalledWith(false);
    expect(deps.actions.setStreakAcknowledged).toHaveBeenCalledWith(false);
  });

  it('calls refresh after reset when available', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.services.refresh).toHaveBeenCalled();
  });

  it('does not throw when refresh is undefined', async () => {
    const deps = createResetFormDeps();
    deps.services.refresh = undefined;
    await expect(resetFormOrchestrated(deps)).resolves.toBeUndefined();
  });

  it('does not throw when refresh rejects', async () => {
    const deps = createResetFormDeps();
    deps.services.refresh = vi.fn().mockRejectedValue(new Error('network'));
    await expect(resetFormOrchestrated(deps)).resolves.toBeUndefined();
  });
});

// ── applyInactivityTimeoutOrchestrated ─────────────────────────
describe('applyInactivityTimeoutOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears success reset timer', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.clearSuccessResetTimer).toHaveBeenCalled();
  });

  it('navigates to home with sessionTimeout reason', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setCurrentScreen).toHaveBeenCalledWith('home', 'sessionTimeout');
  });

  it('clears all core state', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setCurrentGroup).toHaveBeenCalledWith([]);
    expect(deps.setShowSuccess).toHaveBeenCalledWith(false);
    expect(deps.setMemberNumber).toHaveBeenCalledWith('');
    expect(deps.setCurrentMemberId).toHaveBeenCalledWith(null);
    expect(deps.setJustAssignedCourt).toHaveBeenCalledWith(null);
  });

  it('clears privacy-sensitive state', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setAssignedSessionId).toHaveBeenCalledWith(null);
    expect(deps.setAssignedEndTime).toHaveBeenCalledWith(null);
    expect(deps.setCurrentWaitlistEntryId).toHaveBeenCalledWith(null);
    expect(deps.setGuestName).toHaveBeenCalledWith('');
    expect(deps.setGuestSponsor).toHaveBeenCalledWith('');
  });

  it('clears streak state', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setRegistrantStreak).toHaveBeenCalledWith(0);
    expect(deps.setShowStreakModal).toHaveBeenCalledWith(false);
    expect(deps.setStreakAcknowledged).toHaveBeenCalledWith(false);
  });

  it('clears search and add-player UI', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setSearchInput).toHaveBeenCalledWith('');
    expect(deps.setShowSuggestions).toHaveBeenCalledWith(false);
    expect(deps.setShowAddPlayer).toHaveBeenCalledWith(false);
    expect(deps.setAddPlayerSearch).toHaveBeenCalledWith('');
    expect(deps.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
  });

  it('resets clear-court and court-change state', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setSelectedCourtToClear).toHaveBeenCalledWith(null);
    expect(deps.setClearCourtStep).toHaveBeenCalledWith(1);
    expect(deps.setIsChangingCourt).toHaveBeenCalledWith(false);
    expect(deps.setWasOvertimeCourt).toHaveBeenCalledWith(false);
  });

  it('calls refresh after timeout when available', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.refresh).toHaveBeenCalled();
  });

  it('does not throw when refresh is undefined', async () => {
    const deps = createTimeoutDeps({ refresh: undefined });
    await expect(applyInactivityTimeoutOrchestrated(deps)).resolves.toBeUndefined();
  });

  it('does not throw when refresh rejects', async () => {
    const deps = createTimeoutDeps({
      refresh: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    await expect(applyInactivityTimeoutOrchestrated(deps)).resolves.toBeUndefined();
  });
});
