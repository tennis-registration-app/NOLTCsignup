import { describe, it, expect } from 'vitest';
import {
  buildCourtHandlerDeps,
  buildGroupHandlerDeps,
  buildGuestHandlerDeps,
  buildAdminHandlerDeps,
  buildNavigationHandlerDeps,
} from '../../../../src/registration/appHandlers/buildHandlerDeps';

/**
 * Contract test: freeze the deps shape for each handler builder.
 * If a builder adds or removes a key, the sorted-key snapshot breaks.
 */

// Minimal mock app — just enough properties to not crash the pure mappers
const mockApp = {
  state: { screen: 'home' },
  setters: { setScreen: () => {} },
  mobile: { isMobile: false },
  players: { groupGuest: { currentGroup: [] }, memberIdentity: { clearCache: () => {} } },
  services: { backend: { queries: { refresh: () => {} } } },
  helpers: { getCourtData: () => [], markUserTyping: () => {} },
  alert: { showAlert: () => {} },
  refs: { successResetTimerRef: { current: null } },
  derived: { canSubmit: false },
  session: { streak: { streakCount: 0 }, guestCounterHook: { count: 0 } },
  search: { searchTerm: '' },
  court: { courtAssignment: { selectedCourt: null } },
  admin: {
    adminPriceFeedback: { price: null },
    waitlistAdmin: {},
    blockAdmin: { blocks: [] },
  },
  assignCourtToGroupOrchestrated: () => {},
  changeCourtOrchestrated: () => {},
  sendGroupToWaitlistOrchestrated: () => {},
  validateGroupCompat: () => {},
  handleSuggestionClickOrchestrated: () => {},
  handleAddPlayerSuggestionClickOrchestrated: () => {},
  resetFormOrchestrated: () => {},
  dbg: () => {},
  CONSTANTS: {},
  TENNIS_CONFIG: {},
  API_CONFIG: {},
};

const mockCore = {
  clearSuccessResetTimer: () => {},
  resetForm: () => {},
  isPlayerAlreadyPlaying: () => {},
};

const mockCourt = { handleCourtSelect: () => {} };

describe('buildHandlerDeps contract', () => {
  describe('buildCourtHandlerDeps', () => {
    const deps = buildCourtHandlerDeps(mockApp, mockCore);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'API_CONFIG',
        'CONSTANTS',
        'alert',
        'assignCourtToGroupOrchestrated',
        'blockAdmin',
        'changeCourtOrchestrated',
        'core',
        'courtAssignment',
        'dbg',
        'groupGuest',
        'helpers',
        'mobile',
        'refs',
        'sendGroupToWaitlistOrchestrated',
        'services',
        'setters',
        'state',
        'validateGroupCompat',
      ]);
    });

    it('preserves reference equality for slices', () => {
      expect(deps.state).toBe(mockApp.state);
      expect(deps.services).toBe(mockApp.services);
    });
  });

  describe('buildGroupHandlerDeps', () => {
    const mockGroupWorkflow = {
      groupGuest: { currentGroup: [], setCurrentGroup: () => {} },
      streak: { streakCount: 0 },
      memberIdentity: { setMemberNumber: () => {} },
      setShowAddPlayer: () => {},
      setHasWaitlistPriority: () => {},
    };
    const deps = buildGroupHandlerDeps(mockApp, mockGroupWorkflow, mockCore, mockCourt);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'CONSTANTS',
        'alert',
        'core',
        'court',
        'derived',
        'groupGuest',
        'handleAddPlayerSuggestionClickOrchestrated',
        'handleSuggestionClickOrchestrated',
        'helpers',
        'memberIdentity',
        'mobile',
        'refs',
        'search',
        'services',
        'setters',
        'streak',
      ]);
    });

    it('sources workflow fields from workflow, not app', () => {
      expect(deps.groupGuest).toBe(mockGroupWorkflow.groupGuest);
      expect(deps.streak).toBe(mockGroupWorkflow.streak);
      expect(deps.memberIdentity).toBe(mockGroupWorkflow.memberIdentity);
      expect(deps.setters.setShowAddPlayer).toBe(mockGroupWorkflow.setShowAddPlayer);
      expect(deps.setters.setHasWaitlistPriority).toBe(mockGroupWorkflow.setHasWaitlistPriority);
    });

    it('sources shell fields from app', () => {
      expect(deps.derived).toBe(mockApp.derived);
      expect(deps.mobile).toBe(mockApp.mobile);
      expect(deps.services).toBe(mockApp.services);
    });
  });

  describe('buildGuestHandlerDeps', () => {
    const mockGuestWorkflow = {
      groupGuest: { currentGroup: [], setCurrentGroup: () => {} },
      memberIdentity: { memberNumber: '' },
      setShowAddPlayer: () => {},
    };
    const deps = buildGuestHandlerDeps(mockApp, mockGuestWorkflow);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'derived',
        'groupGuest',
        'guestCounterHook',
        'helpers',
        'memberIdentity',
        'search',
        'setters',
      ]);
    });

    it('sources workflow fields from workflow, not app', () => {
      expect(deps.groupGuest).toBe(mockGuestWorkflow.groupGuest);
      expect(deps.memberIdentity).toBe(mockGuestWorkflow.memberIdentity);
      expect(deps.setters.setShowAddPlayer).toBe(mockGuestWorkflow.setShowAddPlayer);
    });

    it('sources shell fields from app', () => {
      expect(deps.guestCounterHook).toBe(mockApp.session.guestCounterHook);
      expect(deps.derived).toBe(mockApp.derived);
      expect(deps.search).toBe(mockApp.search);
    });
  });

  describe('buildAdminHandlerDeps', () => {
    const deps = buildAdminHandlerDeps(mockApp, mockCourt);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'TENNIS_CONFIG',
        'alert',
        'court',
        'helpers',
        'search',
        'services',
        'setters',
        'state',
        'adminPriceFeedback',
      ].sort());
    });
  });

  describe('buildNavigationHandlerDeps', () => {
    const mockWorkflow = {
      groupGuest: { currentGroup: [], setCurrentGroup: () => {} },
      memberIdentity: { setMemberNumber: () => {} },
      showAddPlayer: false,
      setShowAddPlayer: () => {},
    };
    const deps = buildNavigationHandlerDeps(mockApp, mockWorkflow);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'TENNIS_CONFIG',
        'alert',
        'groupGuest',
        'memberIdentity',
        'mobile',
        'setters',
        'state',
      ]);
    });

    it('sources workflow fields from workflow, not app', () => {
      expect(deps.groupGuest).toBe(mockWorkflow.groupGuest);
      expect(deps.memberIdentity).toBe(mockWorkflow.memberIdentity);
      expect(deps.state.showAddPlayer).toBe(mockWorkflow.showAddPlayer);
      expect(deps.setters.setShowAddPlayer).toBe(mockWorkflow.setShowAddPlayer);
    });
  });
});
