import { vi } from 'vitest';

// Capture original fetch ONCE at module load — never changes
const ORIGINAL_FETCH = globalThis.fetch;

/**
 * Stub globalThis.fetch to return a mock response.
 *
 * @param {Object} envelope - The JSON body to return from response.json()
 * @param {{ status?: number }} [options]
 * @returns {import('vitest').Mock}
 */
export function stubFetch(envelope = { ok: true }, options = {}) {
  const mockFn = vi.fn().mockResolvedValue({
    ok: (options.status ?? 200) < 400,
    status: options.status ?? 200,
    json: async () => envelope,
    text: async () => JSON.stringify(envelope),
  });
  globalThis.fetch = mockFn;
  return mockFn;
}

/**
 * Stub globalThis.fetch to reject (network failure).
 *
 * @param {string} [message='Network error']
 * @returns {import('vitest').Mock}
 */
export function stubFetchReject(message = 'Network error') {
  const mockFn = vi.fn().mockRejectedValue(new TypeError(message));
  globalThis.fetch = mockFn;
  return mockFn;
}

/**
 * Stub globalThis.fetch to return different responses per call.
 *
 * @param {Array<Object>} envelopes - Array of JSON bodies for sequential calls
 * @returns {import('vitest').Mock}
 */
export function stubFetchSequence(envelopes) {
  const mockFn = vi.fn();
  envelopes.forEach((envelope) => {
    mockFn.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => envelope,
      text: async () => JSON.stringify(envelope),
    });
  });
  globalThis.fetch = mockFn;
  return mockFn;
}

/**
 * Restore the original fetch. Call in afterEach.
 */
export function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
}
