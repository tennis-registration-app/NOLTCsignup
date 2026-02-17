/**
 * Admin Controller Contract Test
 *
 * Verifies that buildAdminController produces objects with the expected shape.
 * This is a "contract fence" - changes to the controller surface area
 * require updating this test, which signals API changes.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  buildAdminController,
  CONTROLLER_KEYS,
} from '../../../../src/admin/controller/buildAdminController.js';

describe('buildAdminController contract', () => {
  // Minimal deps to exercise the factory
  const minimalDeps = {
    backend: { queries: {}, commands: {}, admin: {} },
    dataStore: { getData: () => null },
    courts: [],
    courtBlocks: [],
    waitingGroups: [],
    hoursOverrides: [],
    blockToEdit: null,
    suspendedBlocks: [],
    wetCourtsActive: false,
    wetCourts: new Set(),
    ENABLE_WET_COURTS: true,
    selectedDate: new Date(),
    currentTime: new Date(),
    calendarView: 'day',
    refreshTrigger: 0,
    activeTab: 'status',
    showAIAssistant: false,
    USE_REAL_AI: true,
    settings: {},
    actions: {},
    components: {
      VisualTimeEntry: () => null,
      MiniCalendar: () => null,
      EventCalendarEnhanced: () => null,
      MonthView: () => null,
      EventSummary: () => null,
      HoverCard: () => null,
      QuickActionsMenu: () => null,
      Tennis: {},
      AIAssistant: () => null,
      AIAssistantAdmin: () => null,
    },
  };

  describe('top-level structure', () => {
    it('returns object with expected top-level keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.topLevel.sort());
    });

    it('CONTROLLER_KEYS.topLevel matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.topLevel).toMatchInlineSnapshot(`
        [
          "ai",
          "blocks",
          "calendar",
          "services",
          "status",
          "wetCourts",
        ]
      `);
    });
  });

  describe('services section', () => {
    it('has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.services).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.services.sort());
    });

    it('CONTROLLER_KEYS.services matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.services).toMatchInlineSnapshot(`
        [
          "backend",
        ]
      `);
    });
  });

  describe('wetCourts section', () => {
    it('has model and actions', () => {
      const controller = buildAdminController(minimalDeps);
      expect(controller.wetCourts).toHaveProperty('model');
      expect(controller.wetCourts).toHaveProperty('actions');
    });

    it('model has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.wetCourts.model).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.wetCourts.model.sort());
    });

    it('actions has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.wetCourts.actions).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.wetCourts.actions.sort());
    });

    it('CONTROLLER_KEYS.wetCourts matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.wetCourts).toMatchInlineSnapshot(`
        {
          "actions": [
            "activateEmergency",
            "clearAllCourts",
            "clearCourt",
            "deactivateAll",
            "setActive",
            "setCourts",
          ],
          "model": [
            "active",
            "courts",
            "enabled",
          ],
        }
      `);
    });
  });

  describe('blocks section', () => {
    it('has model, actions, and components', () => {
      const controller = buildAdminController(minimalDeps);
      expect(controller.blocks).toHaveProperty('model');
      expect(controller.blocks).toHaveProperty('actions');
      expect(controller.blocks).toHaveProperty('components');
    });

    it('model has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.blocks.model).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.blocks.model.sort());
    });

    it('actions has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.blocks.actions).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.blocks.actions.sort());
    });

    it('components has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.blocks.components).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.blocks.components.sort());
    });

    it('CONTROLLER_KEYS.blocks matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.blocks).toMatchInlineSnapshot(`
        {
          "actions": [
            "applyBlocks",
            "notify",
            "onEditingConsumed",
            "setSuspended",
          ],
          "components": [
            "EventCalendar",
            "EventSummary",
            "HoverCard",
            "MiniCalendar",
            "MonthView",
            "QuickActionsMenu",
            "Tennis",
            "VisualTimeEntry",
          ],
          "model": [
            "blocks",
            "courts",
            "editingBlock",
            "hoursOverrides",
            "suspendedBlocks",
          ],
        }
      `);
    });
  });

  describe('status section', () => {
    it('has model and actions', () => {
      const controller = buildAdminController(minimalDeps);
      expect(controller.status).toHaveProperty('model');
      expect(controller.status).toHaveProperty('actions');
    });

    it('model has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.status.model).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.status.model.sort());
    });

    it('actions has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.status.actions).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.status.actions.sort());
    });

    it('CONTROLLER_KEYS.status matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.status).toMatchInlineSnapshot(`
        {
          "actions": [
            "clearAllCourts",
            "clearCourt",
            "editBlock",
            "moveCourt",
            "moveInWaitlist",
            "removeFromWaitlist",
          ],
          "model": [
            "courtBlocks",
            "courts",
            "currentTime",
            "selectedDate",
            "waitingGroups",
          ],
        }
      `);
    });
  });

  describe('calendar section', () => {
    it('has model and actions', () => {
      const controller = buildAdminController(minimalDeps);
      expect(controller.calendar).toHaveProperty('model');
      expect(controller.calendar).toHaveProperty('actions');
    });

    it('model has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.calendar.model).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.calendar.model.sort());
    });

    it('actions has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.calendar.actions).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.calendar.actions.sort());
    });

    it('CONTROLLER_KEYS.calendar matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.calendar).toMatchInlineSnapshot(`
        {
          "actions": [
            "onRefresh",
          ],
          "model": [
            "calendarView",
            "courts",
            "currentTime",
            "hoursOverrides",
            "refreshTrigger",
          ],
        }
      `);
    });
  });

  describe('ai section', () => {
    it('has model, actions, services, and components', () => {
      const controller = buildAdminController(minimalDeps);
      expect(controller.ai).toHaveProperty('model');
      expect(controller.ai).toHaveProperty('actions');
      expect(controller.ai).toHaveProperty('services');
      expect(controller.ai).toHaveProperty('components');
    });

    it('model has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.ai.model).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.ai.model.sort());
    });

    it('actions has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.ai.actions).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.ai.actions.sort());
    });

    it('services has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.ai.services).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.ai.services.sort());
    });

    it('components has expected keys', () => {
      const controller = buildAdminController(minimalDeps);
      const keys = Object.keys(controller.ai.components).sort();
      expect(keys).toEqual(CONTROLLER_KEYS.ai.components.sort());
    });

    it('CONTROLLER_KEYS.ai matches inline snapshot', () => {
      expect(CONTROLLER_KEYS.ai).toMatchInlineSnapshot(`
        {
          "actions": [
            "clearAllCourts",
            "clearCourt",
            "loadData",
            "moveCourt",
            "onAISettingsChanged",
            "refreshData",
            "setShowAIAssistant",
            "updateBallPrice",
          ],
          "components": [
            "AIAssistant",
            "AIAssistantAdmin",
          ],
          "model": [
            "USE_REAL_AI",
            "activeTab",
            "courts",
            "settings",
            "showAIAssistant",
            "waitingGroups",
          ],
          "services": [
            "backend",
            "dataStore",
          ],
        }
      `);
    });
  });

  describe('without components', () => {
    it('sets block components to undefined when not provided', () => {
      const depsWithoutComponents = { ...minimalDeps, components: undefined };
      const controller = buildAdminController(depsWithoutComponents);
      expect(controller.blocks.components).toBeUndefined();
    });

    it('sets AI components to undefined when not provided', () => {
      const depsWithoutComponents = { ...minimalDeps, components: undefined };
      const controller = buildAdminController(depsWithoutComponents);
      expect(controller.ai.components).toBeUndefined();
    });
  });

  describe('action wiring', () => {
    it('wires actions from deps.actions to appropriate domain objects', () => {
      const mockClearCourt = () => {};
      const mockMoveCourt = () => {};
      const depsWithActions = {
        ...minimalDeps,
        actions: {
          clearCourt: mockClearCourt,
          moveCourt: mockMoveCourt,
        },
      };

      const controller = buildAdminController(depsWithActions);

      // statusActions.clearCourt should be wired
      expect(controller.status.actions.clearCourt).toBe(mockClearCourt);
      expect(controller.status.actions.moveCourt).toBe(mockMoveCourt);

      // aiActions should also get clearCourt
      expect(controller.ai.actions.clearCourt).toBe(mockClearCourt);
    });
  });
});
