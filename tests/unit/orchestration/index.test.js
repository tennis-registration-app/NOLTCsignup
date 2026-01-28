import { describe, it, expect } from 'vitest';
import * as orchestration from '../../../src/registration/orchestration/index.js';

describe('orchestration facade exports', () => {
  it('exports success helper', () => {
    expect(typeof orchestration.success).toBe('function');
  });

  it('exports failure helper', () => {
    expect(typeof orchestration.failure).toBe('function');
  });

  it('exports wrapAsync helper', () => {
    expect(typeof orchestration.wrapAsync).toBe('function');
  });

  // Orchestrators:
  it('exports changeCourtOrchestrated', () => {
    expect(typeof orchestration.changeCourtOrchestrated).toBe('function');
  });

  it('exports resetFormOrchestrated', () => {
    expect(typeof orchestration.resetFormOrchestrated).toBe('function');
  });

  it('exports applyInactivityTimeoutOrchestrated', () => {
    expect(typeof orchestration.applyInactivityTimeoutOrchestrated).toBe('function');
  });
});
