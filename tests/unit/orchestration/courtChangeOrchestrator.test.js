/**
 * courtChangeOrchestrator unit tests
 *
 * Tests changeCourtOrchestrated with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeCourtOrchestrated } from '../../../src/registration/orchestration/courtChangeOrchestrator.js';

function createDeps(overrides = {}) {
  return {
    canChangeCourt: true,
    justAssignedCourt: 3,
    replacedGroup: null,
    setOriginalCourtData: vi.fn(),
    setShowSuccess: vi.fn(),
    setIsChangingCourt: vi.fn(),
    setWasOvertimeCourt: vi.fn(),
    setCurrentScreen: vi.fn(),
    ...overrides,
  };
}

describe('changeCourtOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('guard: canChangeCourt / justAssignedCourt', () => {
    it('returns early when canChangeCourt is false', () => {
      const deps = createDeps({ canChangeCourt: false });
      changeCourtOrchestrated(deps);
      expect(deps.setCurrentScreen).not.toHaveBeenCalled();
      expect(deps.setIsChangingCourt).not.toHaveBeenCalled();
    });

    it('returns early when justAssignedCourt is null', () => {
      const deps = createDeps({ justAssignedCourt: null });
      changeCourtOrchestrated(deps);
      expect(deps.setCurrentScreen).not.toHaveBeenCalled();
    });

    it('returns early when justAssignedCourt is 0 (falsy)', () => {
      const deps = createDeps({ justAssignedCourt: 0 });
      changeCourtOrchestrated(deps);
      expect(deps.setCurrentScreen).not.toHaveBeenCalled();
    });
  });

  describe('normal flow (no replaced group)', () => {
    it('hides success screen', () => {
      const deps = createDeps();
      changeCourtOrchestrated(deps);
      expect(deps.setShowSuccess).toHaveBeenCalledWith(false);
    });

    it('sets isChangingCourt to true', () => {
      const deps = createDeps();
      changeCourtOrchestrated(deps);
      expect(deps.setIsChangingCourt).toHaveBeenCalledWith(true);
    });

    it('sets wasOvertimeCourt to false when no replacedGroup', () => {
      const deps = createDeps({ replacedGroup: null });
      changeCourtOrchestrated(deps);
      expect(deps.setWasOvertimeCourt).toHaveBeenCalledWith(false);
    });

    it('navigates to court selection screen', () => {
      const deps = createDeps();
      changeCourtOrchestrated(deps);
      expect(deps.setCurrentScreen).toHaveBeenCalledWith('court', 'changeCourt');
    });

    it('does not set originalCourtData when no replacedGroup', () => {
      const deps = createDeps({ replacedGroup: null });
      changeCourtOrchestrated(deps);
      expect(deps.setOriginalCourtData).not.toHaveBeenCalled();
    });
  });

  describe('overtime replacement flow', () => {
    const replacedGroup = {
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      endTime: '2024-01-15T12:00:00Z',
    };

    it('stores original court data from replacedGroup', () => {
      const deps = createDeps({ replacedGroup });
      changeCourtOrchestrated(deps);
      expect(deps.setOriginalCourtData).toHaveBeenCalledWith({
        players: replacedGroup.players,
        startTime: null,
        endTime: replacedGroup.endTime,
        assignedAt: null,
        duration: null,
      });
    });

    it('sets wasOvertimeCourt to true when replacedGroup exists', () => {
      const deps = createDeps({ replacedGroup });
      changeCourtOrchestrated(deps);
      expect(deps.setWasOvertimeCourt).toHaveBeenCalledWith(true);
    });

    it('still navigates to court screen', () => {
      const deps = createDeps({ replacedGroup });
      changeCourtOrchestrated(deps);
      expect(deps.setCurrentScreen).toHaveBeenCalledWith('court', 'changeCourt');
    });
  });
});
