/**
 * Waitlist response-shape contract tests
 *
 * Documents the two known join-waitlist response shapes and proves
 * waitlistOrchestrator's fallback chain handles each one correctly.
 *
 * Shape A (flat) — observed in E2E mock (mock-api.js:297-308):
 *   { ok, position, waitlistId, message }
 *
 * Shape B (nested) — used in unit-test mocks:
 *   { ok, data: { waitlist: { id, position } } }
 *
 * The orchestrator reads:
 *   const waitlistEntry = result.data?.waitlist;
 *   const entryId      = waitlistEntry?.id;
 *   const position      = waitlistEntry?.position || result.position || 1;
 *
 * Note: entryId only resolves via the nested path (data.waitlist.id).
 * The flat-format waitlistId is never read.  This gap is documented here
 * but intentionally NOT fixed in this step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendGroupToWaitlistOrchestrated } from '../../../src/registration/orchestration/waitlistOrchestrator.js';

// Mock windowBridge to prevent DOM access
vi.mock('../../../src/platform/windowBridge.js', () => ({
  getTennisUI: () => ({ toast: vi.fn() }),
  getTennisDomain: () => null,
}));

// ── helpers ──────────────────────────────────────────────────

function createMockDeps(mockResponse, overrides = {}) {
  return {
    isJoiningWaitlist: false,
    currentGroup: [
      { id: 'member-1', name: 'Alice Smith', memberNumber: '1001' },
      { id: 'member-2', name: 'Bob Jones', memberNumber: '1002' },
    ],
    mobileFlow: overrides.mobileFlow ?? true,
    setIsJoiningWaitlist: vi.fn(),
    setWaitlistPosition: vi.fn(),
    setGpsFailedPrompt: vi.fn(),
    backend: {
      commands: {
        joinWaitlistWithPlayers: vi.fn().mockResolvedValue(mockResponse),
      },
    },
    getMobileGeolocation: vi.fn().mockResolvedValue(null),
    validateGroupCompat: vi.fn().mockReturnValue({ ok: true, errors: [] }),
    isPlayerAlreadyPlaying: vi.fn().mockReturnValue({ isPlaying: false }),
    showAlertMessage: vi.fn(),
    API_CONFIG: { IS_MOBILE: false },
    ...overrides,
  };
}

const group = [
  { id: 'member-1', name: 'Alice Smith', memberNumber: '1001' },
  { id: 'member-2', name: 'Bob Jones', memberNumber: '1002' },
];

// ── tests ────────────────────────────────────────────────────

describe('waitlist response shape contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('sessionStorage', {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('performance', { now: () => 1000 });
  });

  // ── A: position fallback chain ──────────────────────────

  describe('position fallback chain', () => {
    it('flat-only response: reads position from result.position', async () => {
      // Shape A — matches E2E mock (mock-api.js:297-308)
      const response = {
        ok: true,
        position: 3,
        waitlistId: 'wl-flat-1',
        message: 'Added to waitlist',
      };
      const deps = createMockDeps(response);

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setWaitlistPosition).toHaveBeenCalledWith(3);
    });

    it('nested-only response: reads position from data.waitlist.position', async () => {
      // Shape B — matches unit-test convention
      const response = {
        ok: true,
        data: { waitlist: { id: 'wl-nested-1', position: 5 } },
      };
      const deps = createMockDeps(response);

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setWaitlistPosition).toHaveBeenCalledWith(5);
    });

    it('both-present response: nested wins (checked first)', async () => {
      const response = {
        ok: true,
        data: { waitlist: { id: 'wl-both-1', position: 2 } },
        position: 7,
      };
      const deps = createMockDeps(response);

      await sendGroupToWaitlistOrchestrated(group, deps);

      // data.waitlist.position (2) is checked before result.position (7)
      expect(deps.setWaitlistPosition).toHaveBeenCalledWith(2);
    });

    it('neither-present response: defaults to 1', async () => {
      const response = { ok: true, message: 'Added to waitlist' };
      const deps = createMockDeps(response);

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(deps.setWaitlistPosition).toHaveBeenCalledWith(1);
    });
  });

  // ── B: entryId resolution (documents current gap) ───────

  describe('entryId resolution', () => {
    it('nested response: entryId resolves from data.waitlist.id', async () => {
      const response = {
        ok: true,
        data: { waitlist: { id: 'wl-nested-1', position: 1 } },
      };
      const deps = createMockDeps(response, { mobileFlow: true });

      await sendGroupToWaitlistOrchestrated(group, deps);

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'mobile-waitlist-entry-id',
        'wl-nested-1'
      );
    });

    it('flat response: entryId is undefined — waitlistId path not read (known gap)', async () => {
      // Shape A has waitlistId on the root, but the orchestrator reads
      // result.data?.waitlist?.id which is undefined for this shape.
      const response = {
        ok: true,
        position: 1,
        waitlistId: 'wl-flat-1',
      };
      const deps = createMockDeps(response, { mobileFlow: true });

      await sendGroupToWaitlistOrchestrated(group, deps);

      // entryId is undefined → sessionStorage.setItem is never called
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
