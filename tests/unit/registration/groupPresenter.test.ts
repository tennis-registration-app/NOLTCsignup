/**
 * groupPresenter behavioral tests
 *
 * Verifies value mapping, renaming, and passthrough behavior for
 * buildGroupModel and buildGroupActions.
 *
 * Plain mock objects — no jsdom, no platform mocks.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildGroupModel,
  buildGroupActions,
} from '../../../src/registration/router/presenters/groupPresenter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp() {
  return {
    state: {
      data: { courts: [], waitlist: [], courtSelection: { selected: 5 } },
      availableCourts: [1, 3, 5],
    },
    derived: { isMobileView: true },
    alert: { showAlert: true, alertMessage: 'Court is blocked' },
    session: { timeout: { showTimeoutWarning: true } },
    mobile: { mobileFlow: true, preselectedCourt: 7 },
    search: {
      searchInput: 'jones',
      showSuggestions: true,
      effectiveSearchInput: 'jones',
      addPlayerSearch: 'smith',
      showAddPlayerSuggestions: false,
      effectiveAddPlayerSearch: 'smith',
      getAutocompleteSuggestions: vi.fn(),
      handleGroupSearchChange: vi.fn(),
      handleGroupSearchFocus: vi.fn(),
      handleAddPlayerSearchChange: vi.fn(),
      handleAddPlayerSearchFocus: vi.fn(),
    },
    CONSTANTS: { MAX_PLAYERS: 4 },
  };
}

function makeMockWorkflow() {
  return {
    groupGuest: {
      currentGroup: [{ displayName: 'Alice' }, { displayName: 'Bob' }],
      showGuestForm: true,
      guestName: 'Guest1',
      guestSponsor: 'Alice',
      showGuestNameError: false,
      showSponsorError: true,
      handleRemovePlayer: vi.fn(),
      handleSelectSponsor: vi.fn(),
      handleCancelGuest: vi.fn(),
    },
    memberIdentity: {
      memberNumber: 'M-1234',
      frequentPartners: [{ member_id: 'fp1', display_name: 'Carol' }],
      frequentPartnersLoading: true,
    },
    showAddPlayer: true,
    isAssigning: true,
    isJoiningWaitlist: true,
  };
}

function makeMockHandlers() {
  return {
    handleGroupSuggestionClick: vi.fn(),
    handleAddPlayerSuggestionClick: vi.fn(),
    handleToggleAddPlayer: vi.fn(),
    handleToggleGuestForm: vi.fn(),
    handleGuestNameChange: vi.fn(),
    handleAddGuest: vi.fn(),
    addFrequentPartner: vi.fn(),
    handleGroupSelectCourt: vi.fn(),
    handleGroupJoinWaitlist: vi.fn(),
    handleGroupGoBack: vi.fn(),
    resetForm: vi.fn(),
    isPlayerAlreadyPlaying: vi.fn(),
    sameGroup: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// buildGroupModel
// ---------------------------------------------------------------------------

describe('groupPresenter', () => {
  describe('buildGroupModel', () => {
    it('returns all 27 expected keys', () => {
      const model = buildGroupModel(makeMockApp() as any, makeMockWorkflow() as any);
      expect(Object.keys(model)).toHaveLength(27);
    });

    it('maps workflow-sourced group/guest fields correctly', () => {
      const workflow = makeMockWorkflow();
      const model = buildGroupModel(makeMockApp() as any, workflow as any);
      expect(model.currentGroup).toBe(workflow.groupGuest.currentGroup);
      expect(model.showGuestForm).toBe(true);
      expect(model.guestName).toBe('Guest1');
      expect(model.guestSponsor).toBe('Alice');
      expect(model.showGuestNameError).toBe(false);
      expect(model.showSponsorError).toBe(true);
    });

    it('maps workflow-sourced identity fields correctly', () => {
      const workflow = makeMockWorkflow();
      const model = buildGroupModel(makeMockApp() as any, workflow as any);
      expect(model.memberNumber).toBe('M-1234');
      expect(model.frequentPartners).toBe(workflow.memberIdentity.frequentPartners);
      expect(model.frequentPartnersLoading).toBe(true);
    });

    it('maps workflow-sourced showAddPlayer correctly', () => {
      const workflow = makeMockWorkflow();
      const model = buildGroupModel(makeMockApp() as any, workflow as any);
      expect(model.showAddPlayer).toBe(true);
    });

    it('maps shell-sourced state fields correctly', () => {
      const app = makeMockApp();
      const model = buildGroupModel(app as any, makeMockWorkflow() as any);
      expect(model.data).toBe(app.state.data);
      expect(model.availableCourts).toBe(app.state.availableCourts);
      expect(model.courtSelection).toBe(app.state.data.courtSelection);
    });

    it('maps shell-sourced UI state correctly', () => {
      const app = makeMockApp();
      const model = buildGroupModel(app as any, makeMockWorkflow() as any);
      expect(model.showAlert).toBe(true);
      expect(model.alertMessage).toBe('Court is blocked');
      expect(model.showTimeoutWarning).toBe(true);
      expect(model.isMobileView).toBe(true);
    });

    it('maps shell-sourced mobile fields correctly', () => {
      const app = makeMockApp();
      const model = buildGroupModel(app as any, makeMockWorkflow() as any);
      expect(model.mobileFlow).toBe(true);
      expect(model.preselectedCourt).toBe(7);
    });

    it('maps shell-sourced search fields correctly', () => {
      const app = makeMockApp();
      const model = buildGroupModel(app as any, makeMockWorkflow() as any);
      expect(model.searchInput).toBe('jones');
      expect(model.showSuggestions).toBe(true);
      expect(model.effectiveSearchInput).toBe('jones');
      expect(model.addPlayerSearch).toBe('smith');
      expect(model.showAddPlayerSuggestions).toBe(false);
      expect(model.effectiveAddPlayerSearch).toBe('smith');
      expect(model.getAutocompleteSuggestions).toBe(app.search.getAutocompleteSuggestions);
    });
  });

  // ---------------------------------------------------------------------------
  // buildGroupActions
  // ---------------------------------------------------------------------------

  describe('buildGroupActions', () => {
    it('returns all 22 expected keys', () => {
      const actions = buildGroupActions(makeMockApp(), makeMockWorkflow(), makeMockHandlers());
      expect(Object.keys(actions)).toHaveLength(22);
    });

    it('renames handler callbacks to on* convention', () => {
      const handlers = makeMockHandlers();
      const actions = buildGroupActions(makeMockApp(), makeMockWorkflow(), handlers);
      expect(actions.onSuggestionClick).toBe(handlers.handleGroupSuggestionClick);
      expect(actions.onAddPlayerSuggestionClick).toBe(handlers.handleAddPlayerSuggestionClick);
      expect(actions.onToggleAddPlayer).toBe(handlers.handleToggleAddPlayer);
      expect(actions.onToggleGuestForm).toBe(handlers.handleToggleGuestForm);
      expect(actions.onGuestNameChange).toBe(handlers.handleGuestNameChange);
      expect(actions.onAddGuest).toBe(handlers.handleAddGuest);
      expect(actions.onSelectCourt).toBe(handlers.handleGroupSelectCourt);
      expect(actions.onJoinWaitlist).toBe(handlers.handleGroupJoinWaitlist);
      expect(actions.onGoBack).toBe(handlers.handleGroupGoBack);
    });

    it('maps onStartOver from resetForm and onAddFrequentPartner from addFrequentPartner', () => {
      const handlers = makeMockHandlers();
      const actions = buildGroupActions(makeMockApp(), makeMockWorkflow(), handlers);
      expect(actions.onStartOver).toBe(handlers.resetForm);
      expect(actions.onAddFrequentPartner).toBe(handlers.addFrequentPartner);
    });

    it('maps search change/focus actions from app.search', () => {
      const app = makeMockApp();
      const actions = buildGroupActions(app as any, makeMockWorkflow() as any, makeMockHandlers() as any);
      expect(actions.onSearchChange).toBe(app.search.handleGroupSearchChange);
      expect(actions.onSearchFocus).toBe(app.search.handleGroupSearchFocus);
      expect(actions.onAddPlayerSearchChange).toBe(app.search.handleAddPlayerSearchChange);
      expect(actions.onAddPlayerSearchFocus).toBe(app.search.handleAddPlayerSearchFocus);
    });

    it('passes workflow guest actions by reference', () => {
      const workflow = makeMockWorkflow();
      const actions = buildGroupActions(makeMockApp(), workflow, makeMockHandlers());
      expect(actions.onRemovePlayer).toBe(workflow.groupGuest.handleRemovePlayer);
      expect(actions.onSelectSponsor).toBe(workflow.groupGuest.handleSelectSponsor);
      expect(actions.onCancelGuest).toBe(workflow.groupGuest.handleCancelGuest);
    });

    it('maps joiningWaitlist from workflow.isJoiningWaitlist', () => {
      const workflow = makeMockWorkflow();
      workflow.isJoiningWaitlist = true;
      const actions = buildGroupActions(makeMockApp(), workflow, makeMockHandlers());
      expect(actions.joiningWaitlist).toBe(true);
    });

    it('maps isAssigning from workflow.isAssigning', () => {
      const workflow = makeMockWorkflow();
      workflow.isAssigning = true;
      const actions = buildGroupActions(makeMockApp(), workflow, makeMockHandlers());
      expect(actions.isAssigning).toBe(true);
    });

    it('passes utility functions by reference', () => {
      const handlers = makeMockHandlers();
      const actions = buildGroupActions(makeMockApp(), makeMockWorkflow(), handlers);
      expect(actions.isPlayerAlreadyPlaying).toBe(handlers.isPlayerAlreadyPlaying);
      expect(actions.sameGroup).toBe(handlers.sameGroup);
    });
  });
});
