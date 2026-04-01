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
    CONSTANTS: { ADMIN_CODE: '9999', MAX_PLAYERS: 4 },
  };
}

function makeMockWorkflow() {
  return {
    groupGuest: { setCurrentGroup: vi.fn() },
    memberIdentity: { setMemberNumber: vi.fn() },
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
      const model = buildHomeModel(makeMockApp() as any);
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
      const model = buildHomeModel(app as any);
      expect(model.searchInput).toBe('smith');
      expect(model.showSuggestions).toBe(true);
      expect(model.isSearching).toBe(false);
      expect(model.effectiveSearchInput).toBe('smith');
      expect(model.getAutocompleteSuggestions).toBe(app.search.getAutocompleteSuggestions);
    });

    it('maps derived CTA state correctly', () => {
      const app = makeMockApp();
      const model = buildHomeModel(app as any);
      expect(model.canFirstGroupPlay).toBe(true);
      expect(model.canSecondGroupPlay).toBe(false);
      expect(model.canPassThroughGroupPlay).toBe(false);
      expect(model.firstWaitlistEntry).toBe(app.derived.firstWaitlistEntry);
      expect(model.secondWaitlistEntry).toBeNull();
      expect(model.passThroughEntry).toBeNull();
      expect(model.isMobileView).toBe(false);
    });

    it('maps alert slice correctly', () => {
      const app = makeMockApp();
      app.alert.showAlert = true;
      app.alert.alertMessage = 'Court blocked';
      const model = buildHomeModel(app as any);
      expect(model.showAlert).toBe(true);
      expect(model.alertMessage).toBe('Court blocked');
    });

    it('maps CONSTANTS by reference', () => {
      const app = makeMockApp();
      const model = buildHomeModel(app as any);
      expect(model.CONSTANTS).toBe(app.CONSTANTS);
    });
  });

  describe('buildHomeActions', () => {
    it('returns all 11 expected keys', () => {
      const app = makeMockApp();
      const actions = buildHomeActions(app as any, makeMockWorkflow() as any, makeMockHandlers() as any);
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
      const actions = buildHomeActions(app as any, makeMockWorkflow() as any, handlers);

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

    it('passes workflow setters by reference', () => {
      const workflow = makeMockWorkflow();
      const actions = buildHomeActions(makeMockApp() as any, workflow, makeMockHandlers());
      expect(actions.setCurrentGroup).toBe(workflow.groupGuest.setCurrentGroup);
      expect(actions.setMemberNumber).toBe(workflow.memberIdentity.setMemberNumber);
      expect(actions.setHasWaitlistPriority).toBe(workflow.setHasWaitlistPriority);
      expect(actions.setCurrentWaitlistEntryId).toBe(workflow.setCurrentWaitlistEntryId);
    });

    it('passes handler callbacks by reference', () => {
      const handlers = makeMockHandlers();
      const actions = buildHomeActions(makeMockApp() as any, makeMockWorkflow(), handlers);
      expect(actions.handleSuggestionClick).toBe(handlers.handleSuggestionClick);
      expect(actions.markUserTyping).toBe(handlers.markUserTyping);
      expect(actions.findMemberNumber).toBe(handlers.findMemberNumber);
    });

    it('passes search setters from app.search by reference', () => {
      const app = makeMockApp();
      const actions = buildHomeActions(app as any, makeMockWorkflow() as any, makeMockHandlers() as any);
      expect(actions.setSearchInput).toBe(app.search.setSearchInput);
      expect(actions.setShowSuggestions).toBe(app.search.setShowSuggestions);
    });
  });
});
