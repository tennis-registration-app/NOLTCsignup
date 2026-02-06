/**
 * ApiTennisService error normalization tests (façade wiring smoke test).
 *
 * Full error-path coverage will be provided in WP5-B.4 module tests;
 * this test validates the façade catch+normalize wiring via direct stubbing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isDomainError } from '@lib/errors';

// Mock all heavy dependencies to allow minimal instantiation
vi.mock('@lib/ApiAdapter.js', () => ({
  ApiAdapter: class MockApiAdapter {
    constructor() {}
  },
}));

vi.mock('@lib/RealtimeClient.js', () => ({
  getRealtimeClient: () => ({
    onSessionChange: vi.fn(),
    onWaitlistChange: vi.fn(),
    onBlockChange: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock service modules to return minimal stubs
vi.mock('../../../../src/registration/services/modules/courtsService.js', () => ({
  createCourtsService: () => ({}),
}));

vi.mock('../../../../src/registration/services/modules/waitlistService.js', () => ({
  createWaitlistService: () => ({}),
}));

vi.mock('../../../../src/registration/services/modules/membersService.js', () => ({
  createMembersService: () => ({}),
}));

vi.mock('../../../../src/registration/services/modules/settingsService.js', () => ({
  createSettingsService: () => ({}),
}));

vi.mock('../../../../src/registration/services/modules/purchasesService.js', () => ({
  createPurchasesService: () => ({}),
}));

vi.mock('../../../../src/registration/services/modules/lifecycleService.js', () => ({
  createLifecycleService: () => ({}),
}));

vi.mock('../../../../src/registration/services/legacy/courtTransforms.js', () => ({
  transformCourts: vi.fn(),
}));

vi.mock('../../../../src/registration/services/legacy/waitlistTransforms.js', () => ({
  transformWaitlist: vi.fn(),
}));

// Import after mocks
const { ApiTennisService } = await import(
  '../../../../src/registration/services/ApiTennisService.js'
);

describe('ApiTennisService error normalization', () => {
  let service;

  beforeEach(() => {
    service = new ApiTennisService();
  });

  it('normalizes errors thrown by courtsService.getCourtByNumber', async () => {
    const originalError = new Error('boom');
    service.courtsService = {
      getCourtByNumber: vi.fn().mockRejectedValue(originalError),
    };

    let caught;
    try {
      await service.getCourtByNumber(1);
    } catch (e) {
      caught = e;
    }

    expect(isDomainError(caught)).toBe(true);
    expect(caught.message).toBe('boom');
    expect(caught.safeDetails.service).toBe('ApiTennisService');
    expect(caught.safeDetails.operation).toBe('getCourtByNumber');
    expect(caught.cause).toBe(originalError);
  });

  it('normalizes errors thrown by waitlistService.getWaitlist', async () => {
    const originalError = new Error('waitlist boom');
    service.waitlistService = {
      getWaitlist: vi.fn().mockRejectedValue(originalError),
    };

    let caught;
    try {
      await service.getWaitlist();
    } catch (e) {
      caught = e;
    }

    expect(isDomainError(caught)).toBe(true);
    expect(caught.message).toBe('waitlist boom');
    expect(caught.safeDetails.service).toBe('ApiTennisService');
    expect(caught.safeDetails.operation).toBe('getWaitlist');
    expect(caught.cause).toBe(originalError);
  });
});
