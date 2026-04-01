/**
 * resetOrchestrator unit tests
 *
 * Tests resetFormOrchestrated and applyInactivityTimeoutOrchestrated
 * with mocked dependencies.
 *
 * After WorkflowProvider introduction, these orchestrators only handle
 * shell-owned state. Workflow state resets automatically via key-based
 * remount of WorkflowProvider.
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

function createResetFormDeps(overrides: Record<string, any> = {}) {
  const actions = {
    setShowSuccess: vi.fn(),
    setCurrentScreen: vi.fn(),
    setSearchInput: vi.fn(),
    setShowSuggestions: vi.fn(),
    setAddPlayerSearch: vi.fn(),
    setShowAddPlayerSuggestions: vi.fn(),
    ...overrides.actions,
  };
  const services = {
    clearSuccessResetTimer: vi.fn(),
    refresh: vi.fn().mockResolvedValue({}),
    ...overrides.services,
  };
  return { actions, services };
}

function createTimeoutDeps(overrides: Record<string, any> = {}) {
  return {
    setShowSuccess: vi.fn(),
    setCurrentScreen: vi.fn(),
    setSearchInput: vi.fn(),
    setShowSuggestions: vi.fn(),
    setAddPlayerSearch: vi.fn(),
    setShowAddPlayerSuggestions: vi.fn(),
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

  it('resets showSuccess to false', async () => {
    const deps = createResetFormDeps();
    await resetFormOrchestrated(deps);
    expect(deps.actions.setShowSuccess).toHaveBeenCalledWith(false);
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
    expect(deps.actions.setAddPlayerSearch).toHaveBeenCalledWith('');
    expect(deps.actions.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
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

  it('resets showSuccess to false', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setShowSuccess).toHaveBeenCalledWith(false);
  });

  it('clears search and add-player UI', async () => {
    const deps = createTimeoutDeps();
    await applyInactivityTimeoutOrchestrated(deps);
    expect(deps.setSearchInput).toHaveBeenCalledWith('');
    expect(deps.setShowSuggestions).toHaveBeenCalledWith(false);
    expect(deps.setAddPlayerSearch).toHaveBeenCalledWith('');
    expect(deps.setShowAddPlayerSuggestions).toHaveBeenCalledWith(false);
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
