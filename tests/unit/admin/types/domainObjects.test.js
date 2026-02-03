import { describe, it, expect, vi } from 'vitest';
import {
  createWetCourtsModel,
  createWetCourtsActions,
  createBlockModel,
  createBlockActions,
  createBlockComponents,
  createAdminServices,
} from '../../../../src/admin/types/domainObjects.js';

describe('domainObjects', () => {
  describe('module exports', () => {
    it('exports expected factories', () => {
      expect(typeof createWetCourtsModel).toBe('function');
      expect(typeof createWetCourtsActions).toBe('function');
      expect(typeof createBlockModel).toBe('function');
      expect(typeof createBlockActions).toBe('function');
      expect(typeof createBlockComponents).toBe('function');
      expect(typeof createAdminServices).toBe('function');
    });
  });

  describe('createWetCourtsModel', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createWetCourtsModel(undefined)).not.toThrow();
      expect(() => createWetCourtsModel()).not.toThrow();
    });

    it('preserves undefined values (no defaults)', () => {
      const model = createWetCourtsModel({});
      expect(model.active).toBeUndefined();
      expect(model.courts).toBeUndefined();
      expect(model.enabled).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const wetCourts = new Set([1, 2, 3]);
      const model = createWetCourtsModel({
        wetCourtsActive: true,
        wetCourts,
        ENABLE_WET_COURTS: true,
      });
      expect(model.active).toBe(true);
      expect(model.courts).toBe(wetCourts);
      expect(model.enabled).toBe(true);
    });

    it('preserves null values (does not convert to undefined)', () => {
      const model = createWetCourtsModel({ wetCourts: null });
      expect(model.courts).toBeNull();
    });

    it('preserves false values', () => {
      const model = createWetCourtsModel({ wetCourtsActive: false, ENABLE_WET_COURTS: false });
      expect(model.active).toBe(false);
      expect(model.enabled).toBe(false);
    });
  });

  describe('createWetCourtsActions', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createWetCourtsActions(undefined)).not.toThrow();
    });

    it('preserves undefined values (no defaults)', () => {
      const actions = createWetCourtsActions({});
      expect(actions.setActive).toBeUndefined();
      expect(actions.setCourts).toBeUndefined();
      expect(actions.activateEmergency).toBeUndefined();
      expect(actions.deactivateAll).toBeUndefined();
      expect(actions.clearCourt).toBeUndefined();
      expect(actions.clearAllCourts).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const setWetCourtsActive = vi.fn();
      const setWetCourts = vi.fn();
      const handleEmergencyWetCourt = vi.fn();
      const deactivateWetCourts = vi.fn();
      const onClearWetCourt = vi.fn();
      const onClearAllWetCourts = vi.fn();

      const actions = createWetCourtsActions({
        setWetCourtsActive,
        setWetCourts,
        handleEmergencyWetCourt,
        deactivateWetCourts,
        onClearWetCourt,
        onClearAllWetCourts,
      });

      expect(actions.setActive).toBe(setWetCourtsActive);
      expect(actions.setCourts).toBe(setWetCourts);
      expect(actions.activateEmergency).toBe(handleEmergencyWetCourt);
      expect(actions.deactivateAll).toBe(deactivateWetCourts);
      expect(actions.clearCourt).toBe(onClearWetCourt);
      expect(actions.clearAllCourts).toBe(onClearAllWetCourts);
    });
  });

  describe('createBlockModel', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createBlockModel(undefined)).not.toThrow();
    });

    it('preserves undefined values (no defaults)', () => {
      const model = createBlockModel({});
      expect(model.courts).toBeUndefined();
      expect(model.blocks).toBeUndefined();
      expect(model.hoursOverrides).toBeUndefined();
      expect(model.editingBlock).toBeUndefined();
      expect(model.suspendedBlocks).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const courts = [{ id: 1 }];
      const courtBlocks = [{ id: 'block-1' }];
      const hoursOverrides = [{ date: '2026-01-01' }];
      const initialEditingBlock = { id: 'edit-1' };
      const suspendedBlocks = [{ id: 'suspended-1' }];

      const model = createBlockModel({
        courts,
        courtBlocks,
        hoursOverrides,
        initialEditingBlock,
        suspendedBlocks,
      });

      expect(model.courts).toBe(courts);
      expect(model.blocks).toBe(courtBlocks);
      expect(model.hoursOverrides).toBe(hoursOverrides);
      expect(model.editingBlock).toBe(initialEditingBlock);
      expect(model.suspendedBlocks).toBe(suspendedBlocks);
    });

    it('preserves null values', () => {
      const model = createBlockModel({ initialEditingBlock: null });
      expect(model.editingBlock).toBeNull();
    });

    it('preserves empty arrays', () => {
      const model = createBlockModel({ courtBlocks: [], courts: [] });
      expect(model.blocks).toEqual([]);
      expect(model.courts).toEqual([]);
    });
  });

  describe('createBlockActions', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createBlockActions(undefined)).not.toThrow();
    });

    it('preserves undefined values', () => {
      const actions = createBlockActions({});
      expect(actions.applyBlocks).toBeUndefined();
      expect(actions.onEditingConsumed).toBeUndefined();
      expect(actions.setSuspended).toBeUndefined();
      expect(actions.notify).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const onApplyBlocks = vi.fn();
      const onEditingBlockConsumed = vi.fn();
      const setSuspendedBlocks = vi.fn();
      const onNotification = vi.fn();

      const actions = createBlockActions({
        onApplyBlocks,
        onEditingBlockConsumed,
        setSuspendedBlocks,
        onNotification,
      });

      expect(actions.applyBlocks).toBe(onApplyBlocks);
      expect(actions.onEditingConsumed).toBe(onEditingBlockConsumed);
      expect(actions.setSuspended).toBe(setSuspendedBlocks);
      expect(actions.notify).toBe(onNotification);
    });
  });

  describe('createBlockComponents', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createBlockComponents(undefined)).not.toThrow();
    });

    it('preserves undefined values', () => {
      const components = createBlockComponents({});
      expect(components.VisualTimeEntry).toBeUndefined();
      expect(components.MiniCalendar).toBeUndefined();
      expect(components.EventCalendar).toBeUndefined();
      expect(components.MonthView).toBeUndefined();
      expect(components.EventSummary).toBeUndefined();
      expect(components.HoverCard).toBeUndefined();
      expect(components.QuickActionsMenu).toBeUndefined();
      expect(components.Tennis).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const VisualTimeEntry = () => null;
      const MiniCalendar = () => null;
      const EventCalendarEnhanced = () => null;
      const MonthView = () => null;
      const EventSummary = () => null;
      const HoverCard = () => null;
      const QuickActionsMenu = () => null;
      const Tennis = { config: {} };

      const components = createBlockComponents({
        VisualTimeEntry,
        MiniCalendar,
        EventCalendarEnhanced,
        MonthView,
        EventSummary,
        HoverCard,
        QuickActionsMenu,
        Tennis,
      });

      expect(components.VisualTimeEntry).toBe(VisualTimeEntry);
      expect(components.MiniCalendar).toBe(MiniCalendar);
      expect(components.EventCalendar).toBe(EventCalendarEnhanced); // Renamed field
      expect(components.MonthView).toBe(MonthView);
      expect(components.EventSummary).toBe(EventSummary);
      expect(components.HoverCard).toBe(HoverCard);
      expect(components.QuickActionsMenu).toBe(QuickActionsMenu);
      expect(components.Tennis).toBe(Tennis);
    });
  });

  describe('createAdminServices', () => {
    it('does not throw if called with undefined', () => {
      expect(() => createAdminServices(undefined)).not.toThrow();
    });

    it('preserves undefined values', () => {
      const services = createAdminServices({});
      expect(services.backend).toBeUndefined();
    });

    it('maps input keys to curated field names', () => {
      const backend = { admin: { getBlocks: vi.fn() } };
      const services = createAdminServices({ backend });
      expect(services.backend).toBe(backend);
    });

    it('does not include extra fields (services are curated)', () => {
      const services = createAdminServices({
        backend: {},
        dataStore: {},
        extra: 'value',
      });
      expect(services).not.toHaveProperty('dataStore');
      expect(services).not.toHaveProperty('extra');
      expect(Object.keys(services)).toEqual(['backend']);
    });
  });
});
