/**
 * homePresenter unit tests
 *
 * Direct tests for buildHomeModel and buildHomeActions pure functions.
 * No JSX, no vitest-environment, no mocks required — these are pure functions.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildHomeModel,
  buildHomeActions,
} from '../../../src/registration/router/presenters/homePresenter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp() {
  return {
    search: {
      searchInput: 'smith',
      showSuggestions: true,
      isSearching: false,
      effectiveSearchInput: 'smith',
      getAutocompleteSuggestions: vi.fn(),
      setSearchInput: vi.fn(),
      setShowSuggestions: vi.fn(),
    },
    derived: {
      canFirstGroupPlay: true,
      canSecondGroupPlay: false,
      firstWaitlistEntry: { id: 'w1', players: [] },
      secondWaitlistEntry: null,
      firstWaitlistEntryData: { players: [{ displayName: 'Alice' }] },
      secondWaitlistEntryData: null,
      canPassThroughGroupPlay: false,
      passThroughEntry: null,
      passThroughEntryData: null,
      isMobileView: false,
    },
    alert: {
      showAlert: false,
      alertMessage: '',
    },
    setters: {
      setCurrentScreen: vi.fn(),
    },
    players: {
      memberIdentity: { setMemberNumber: vi.fn() },
      groupGuest: { setCurrentGroup: vi.fn() },
    },
    CONSTANTS: { ADMIN_CODE: '9999', MAX_PLAYERS: 4 },
  };
}

function makeMockWorkflow(app) {
  return {
    groupGuest: app.players.groupGuest,
    memberIdentity: app.players.memberIdentity,
    setHasWaitlistPriority: vi.fn(),
    setCurrentWaitlistEntryId: vi.fn(),
  };
}

function makeMockHandlers() {
  return {
    handleSuggestionClick: vi.fn(),
    markUserTyping: vi.fn(),
    findMemberNumber: vi.fn(),
    checkLocationAndProceed: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('homePresenter', () => {
  describe('buildHomeModel', () => {
    it('returns all 18 expected keys', () => {
      const model = buildHomeModel(makeMockApp());
      const expectedKeys = [
        'searchInput',
        'showSuggestions',
        'isSearching',
        'effectiveSearchInput',
        'getAutocompleteSuggestions',
        'canFirstGroupPlay',
        'canSecondGroupPlay',
        'firstWaitlistEntry',
        'secondWaitlistEntry',
        'firstWaitlistEntryData',
        'secondWaitlistEntryData',
        'canPassThroughGroupPlay',
        'passThroughEntry',
        'passThroughEntryData',
        'showAlert',
        'alertMessage',
        'isMobileView',
        'CONSTANTS',
      ].sort();
      expect(Object.keys(model).sort()).toEqual(expectedKeys);
    });

    it('maps search slice correctly', () => {
      const app = makeMockApp();
      const model = buildHomeModel(app);
      expect(model.searchInput).toBe('smith');
      expect(model.showSuggestions).toBe(true);
      expect(model.isSearching).toBe(false);
      expect(model.effectiveSearchInput).toBe('smith');
      expect(model.getAutocompleteSuggestions).toBe(app.search.getAutocompleteSuggestions);
    });

    it('maps derived CTA state correctly', () => {
      const app = makeMockApp();
      const model = buildHomeModel(app);
      expect(model.canFirstGroupPlay).toBe(true);
      expect(model.canSecondGroupPlay).toBe(false);
      expect(model.canPassThroughGroupPlay).toBe(false);
      expect(model.firstWaitlistEntry).toBe(app.derived.firstWaitlistEntry);
      expect(model.secondWaitlistEntry).toBeNull();
      expect(model.passThroughEntry).toBeNull();
      expect(model.isMobileView).toBe(false);
    });
  });

  describe('buildHomeActions', () => {
    it('returns all 11 expected keys', () => {
      const app = makeMockApp();
      const actions = buildHomeActions(app, makeMockWorkflow(app), makeMockHandlers());
      const expectedKeys = [
        'setSearchInput',
        'setShowSuggestions',
        'setCurrentScreen',
        'setCurrentGroup',
        'setMemberNumber',
        'setHasWaitlistPriority',
        'setCurrentWaitlistEntryId',
        'handleSuggestionClick',
        'markUserTyping',
        'findMemberNumber',
        'onClearCourtClick',
      ].sort();
      expect(Object.keys(actions).sort()).toEqual(expectedKeys);
    });

    it('onClearCourtClick calls checkLocationAndProceed then navigates', () => {
      const app = makeMockApp();
      const handlers = makeMockHandlers();
      const actions = buildHomeActions(app, makeMockWorkflow(app), handlers);

      actions.onClearCourtClick();

      expect(handlers.checkLocationAndProceed).toHaveBeenCalledOnce();

      // Verify callback navigates to clearCourt screen
      const callback = handlers.checkLocationAndProceed.mock.calls[0][0];
      expect(typeof callback).toBe('function');
      callback();
      expect(app.setters.setCurrentScreen).toHaveBeenCalledWith(
        'clearCourt',
        'homeClearCourtClick'
      );
    });
  });
});
