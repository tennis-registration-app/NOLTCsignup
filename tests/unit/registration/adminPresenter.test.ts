/**
 * adminPresenter behavioral tests
 *
 * Verifies value mapping, renaming, and the getCourtData call
 * in buildAdminModel and buildAdminActions.
 *
 * Plain mock objects — no jsdom, no platform mocks.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildAdminModel,
  buildAdminActions,
} from '../../../src/registration/router/presenters/adminPresenter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp() {
  return {
    state: {
      currentTime: 1700000000,
      courtToMove: 3,
      ballPriceInput: '5.00',
    },
    setters: {
      setCourtToMove: vi.fn(),
      setBallPriceInput: vi.fn(),
    },
    alert: {
      showAlert: true,
      alertMessage: 'Block created',
      showAlertMessage: vi.fn(),
    },
    admin: {
      blockAdmin: {
        showBlockModal: false,
        setShowBlockModal: vi.fn(),
        selectedCourtsToBlock: [1, 4],
        setSelectedCourtsToBlock: vi.fn(),
        blockMessage: 'Maintenance',
        setBlockMessage: vi.fn(),
        blockStartTime: '09:00',
        setBlockStartTime: vi.fn(),
        blockEndTime: '10:00',
        setBlockEndTime: vi.fn(),
        blockingInProgress: false,
        setBlockingInProgress: vi.fn(),
        onCancelBlock: vi.fn(),
        onBlockCreate: vi.fn(),
        getCourtBlockStatus: vi.fn(),
      },
      waitlistAdmin: {
        waitlistMoveFrom: 2,
        setWaitlistMoveFrom: vi.fn(),
        onReorderWaitlist: vi.fn(),
      },
      adminPriceFeedback: {
        priceError: 'Invalid price',
        setPriceError: vi.fn(),
        showPriceSuccess: true,
        setShowPriceSuccess: vi.fn(),
      },
    },
    CONSTANTS: { ADMIN_CODE: '9999' },
  };
}

function makeMockHandlers() {
  return {
    getCourtData: vi.fn().mockReturnValue({ courts: [{ number: 1 }], waitlist: [] }),
    handleClearAllCourts: vi.fn(),
    handleAdminClearCourt: vi.fn(),
    handleMoveCourt: vi.fn(),
    handleClearWaitlist: vi.fn(),
    handleRemoveFromWaitlist: vi.fn(),
    handlePriceUpdate: vi.fn(),
    handleExitAdmin: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// buildAdminModel
// ---------------------------------------------------------------------------

describe('adminPresenter', () => {
  describe('buildAdminModel', () => {
    it('returns all 17 expected keys', () => {
      const model = buildAdminModel(makeMockApp() as any, makeMockHandlers());
      expect(Object.keys(model)).toHaveLength(17);
    });

    it('calls handlers.getCourtData and uses result as model.data', () => {
      const handlers = makeMockHandlers();
      const courtData = { courts: [{ number: 1, session: null }], waitlist: [] };
      handlers.getCourtData.mockReturnValue(courtData);

      const model = buildAdminModel(makeMockApp() as any, handlers);
      expect(handlers.getCourtData).toHaveBeenCalledOnce();
      expect(model.data).toBe(courtData);
    });

    it('maps state fields correctly', () => {
      const model = buildAdminModel(makeMockApp() as any, makeMockHandlers());
      expect(model.currentTime).toBe(1700000000);
      expect(model.courtToMove).toBe(3);
      expect(model.ballPriceInput).toBe('5.00');
    });

    it('maps alert, block, waitlist, and price fields correctly', () => {
      const app = makeMockApp();
      const model = buildAdminModel(app as any, makeMockHandlers() as any);
      expect(model.showAlert).toBe(true);
      expect(model.alertMessage).toBe('Block created');
      expect(model.showBlockModal).toBe(false);
      expect(model.selectedCourtsToBlock).toBe(app.admin.blockAdmin.selectedCourtsToBlock);
      expect(model.blockMessage).toBe('Maintenance');
      expect(model.blockStartTime).toBe('09:00');
      expect(model.blockEndTime).toBe('10:00');
      expect(model.blockingInProgress).toBe(false);
      expect(model.waitlistMoveFrom).toBe(2);
      expect(model.priceError).toBe('Invalid price');
      expect(model.showPriceSuccess).toBe(true);
      expect(model.getCourtBlockStatus).toBe(app.admin.blockAdmin.getCourtBlockStatus);
      expect(model.CONSTANTS).toBe(app.CONSTANTS);
    });
  });

  // ---------------------------------------------------------------------------
  // buildAdminActions
  // ---------------------------------------------------------------------------

  describe('buildAdminActions', () => {
    it('returns all 22 expected keys', () => {
      const actions = buildAdminActions(makeMockApp() as any, makeMockHandlers());
      expect(Object.keys(actions)).toHaveLength(22);
    });

    it('renames handler callbacks to on* convention', () => {
      const handlers = makeMockHandlers();
      const actions = buildAdminActions(makeMockApp() as any, handlers);
      expect(actions.onClearAllCourts).toBe(handlers.handleClearAllCourts);
      expect(actions.onClearCourt).toBe(handlers.handleAdminClearCourt);
      expect(actions.onMoveCourt).toBe(handlers.handleMoveCourt);
      expect(actions.onClearWaitlist).toBe(handlers.handleClearWaitlist);
      expect(actions.onRemoveFromWaitlist).toBe(handlers.handleRemoveFromWaitlist);
      expect(actions.onPriceUpdate).toBe(handlers.handlePriceUpdate);
      expect(actions.onExit).toBe(handlers.handleExitAdmin);
    });

    it('passes admin slice actions by reference', () => {
      const app = makeMockApp();
      const actions = buildAdminActions(app as any, makeMockHandlers() as any);
      expect(actions.setShowBlockModal).toBe(app.admin.blockAdmin.setShowBlockModal);
      expect(actions.onCancelBlock).toBe(app.admin.blockAdmin.onCancelBlock);
      expect(actions.onBlockCreate).toBe(app.admin.blockAdmin.onBlockCreate);
      expect(actions.onReorderWaitlist).toBe(app.admin.waitlistAdmin.onReorderWaitlist);
      expect(actions.showAlertMessage).toBe(app.alert.showAlertMessage);
    });
  });
});
