/**
 * BlockingSection Presenter Equivalence Test
 *
 * Proves that buildBlockingModel + buildBlockingActions produce
 * IDENTICAL props to the legacy BlockingSection pass-through.
 *
 * The legacy section rendered CompleteBlockManagerEnhanced 3 times
 * (one per blockingView), each with the same domain objects but a
 * different defaultView string. The presenter collapses this into
 * a single VIEW_MAP lookup.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildBlockingModel,
  buildBlockingActions,
  VIEW_MAP,
} from '../../../src/admin/presenters/blockingPresenter.js';

// --- Fixtures ---

const mockWetCourtsModel = {
  active: true,
  courts: new Set([3, 5]),
  enabled: true,
};

const mockWetCourtsActions = {
  setActive: vi.fn(),
  setCourts: vi.fn(),
  activateEmergency: vi.fn(),
  deactivateAll: vi.fn(),
  clearCourt: vi.fn(),
  clearAllCourts: vi.fn(),
};

const mockBlockModel = {
  courts: [{ number: 1 }],
  blocks: [{ id: 'b1' }],
  hoursOverrides: [],
  editingBlock: null,
  suspendedBlocks: [],
};

const mockBlockActions = {
  applyBlocks: vi.fn(),
  onEditingConsumed: vi.fn(),
  setSuspended: vi.fn(),
  notify: vi.fn(),
};

const mockComponents = {
  VisualTimeEntry: () => null,
  MiniCalendar: () => null,
  EventCalendar: () => null,
  MonthView: () => null,
  EventSummary: () => null,
  HoverCard: () => null,
  QuickActionsMenu: () => null,
};

const mockServices = {
  backend: { queries: {}, commands: {}, admin: {} },
};

/**
 * Legacy BlockingSection prop extraction — VERBATIM from BlockingSection.jsx
 * before the presenter refactor.
 *
 * For a given blockingView, returns what CompleteBlockManagerEnhanced receives.
 */
function legacyBlockingProps(blockingView, wcModel, wcActions, bModel, bActions, comps, svc) {
  // The legacy section maps blockingView to defaultView:
  const viewMap = { create: 'create', future: 'calendar', list: 'timeline' };
  const defaultView = viewMap[blockingView];
  // Only renders when blockingView matches one of the 3 branches
  if (!defaultView) return null;

  return {
    wetCourtsModel: wcModel,
    wetCourtsActions: wcActions,
    blockModel: bModel,
    blockActions: bActions,
    components: comps,
    services: svc,
    defaultView,
  };
}

/**
 * Presenter-based prop extraction
 */
function presenterBlockingProps(blockingView, wcModel, wcActions, bModel, bActions, comps, svc) {
  const model = buildBlockingModel(blockingView, wcModel, bModel, comps, svc);
  const actions = buildBlockingActions(wcActions, bActions);

  return {
    wetCourtsModel: model.wetCourtsModel,
    wetCourtsActions: actions.wetCourtsActions,
    blockModel: model.blockModel,
    blockActions: actions.blockActions,
    components: model.components,
    services: model.services,
    defaultView: model.defaultView,
  };
}

describe('BlockingSection presenter equivalence', () => {
  describe('VIEW_MAP covers all legacy branches', () => {
    it('maps create → create', () => {
      expect(VIEW_MAP.create).toBe('create');
    });

    it('maps future → calendar', () => {
      expect(VIEW_MAP.future).toBe('calendar');
    });

    it('maps list → timeline', () => {
      expect(VIEW_MAP.list).toBe('timeline');
    });

    it('has exactly 3 entries', () => {
      expect(Object.keys(VIEW_MAP)).toHaveLength(3);
    });
  });

  describe.each(['create', 'future', 'list'])('blockingView="%s"', (view) => {
    const legacy = legacyBlockingProps(
      view, mockWetCourtsModel, mockWetCourtsActions,
      mockBlockModel, mockBlockActions, mockComponents, mockServices
    );
    const presenter = presenterBlockingProps(
      view, mockWetCourtsModel, mockWetCourtsActions,
      mockBlockModel, mockBlockActions, mockComponents, mockServices
    );

    it('produces same keys', () => {
      expect(Object.keys(presenter).sort()).toEqual(Object.keys(legacy).sort());
    });

    it('all values are reference-equal', () => {
      for (const key of Object.keys(legacy)) {
        expect(presenter[key], `${key} reference equality`).toBe(legacy[key]);
      }
    });
  });

  it('model keys are exactly as expected', () => {
    const model = buildBlockingModel(
      'create', mockWetCourtsModel, mockBlockModel, mockComponents, mockServices
    );
    expect(Object.keys(model).sort()).toEqual(
      ['blockModel', 'components', 'defaultView', 'services', 'wetCourtsModel'].sort()
    );
  });

  it('actions keys are exactly as expected', () => {
    const actions = buildBlockingActions(mockWetCourtsActions, mockBlockActions);
    expect(Object.keys(actions).sort()).toEqual(
      ['blockActions', 'wetCourtsActions'].sort()
    );
  });

  it('type map for model matches expected shape', () => {
    const model = buildBlockingModel(
      'create', mockWetCourtsModel, mockBlockModel, mockComponents, mockServices
    );
    const typeMap = {};
    for (const key of Object.keys(model).sort()) {
      typeMap[key] = typeof model[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "blockModel": "object",
        "components": "object",
        "defaultView": "string",
        "services": "object",
        "wetCourtsModel": "object",
      }
    `);
  });

  it('type map for actions matches expected shape', () => {
    const actions = buildBlockingActions(mockWetCourtsActions, mockBlockActions);
    const typeMap = {};
    for (const key of Object.keys(actions).sort()) {
      typeMap[key] = typeof actions[key];
    }
    expect(typeMap).toMatchInlineSnapshot(`
      {
        "blockActions": "object",
        "wetCourtsActions": "object",
      }
    `);
  });
});
