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
  groupGuest: { currentGroup: [] },
  courtAssignment: { selectedCourt: null },
  services: { backend: { queries: { refresh: () => {} } } },
  helpers: { getCourtData: () => [], markUserTyping: () => {} },
  blockAdmin: { blocks: [] },
  alert: { showAlert: () => {} },
  refs: { successResetTimerRef: { current: null } },
  derived: { canSubmit: false },
  streak: { streakCount: 0 },
  search: { searchTerm: '' },
  memberIdentity: { clearCache: () => {} },
  guestCounterHook: { count: 0 },
  clearCourtFlow: { clearCourt: () => {} },
  adminPriceFeedback: { price: null },
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
    const deps = buildGroupHandlerDeps(mockApp, mockCore, mockCourt);
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
  });

  describe('buildGuestHandlerDeps', () => {
    const deps = buildGuestHandlerDeps(mockApp);
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
    const deps = buildNavigationHandlerDeps(mockApp);
    const keys = Object.keys(deps).sort();

    it('has frozen key set', () => {
      expect(keys).toEqual([
        'TENNIS_CONFIG',
        'alert',
        'clearCourtFlow',
        'groupGuest',
        'memberIdentity',
        'mobile',
        'setters',
        'state',
      ]);
    });
  });
});
