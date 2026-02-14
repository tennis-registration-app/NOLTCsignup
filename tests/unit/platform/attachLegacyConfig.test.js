import { describe, test, expect } from 'vitest';
import { legacyConfig } from '../../../src/platform/attachLegacyConfig.js';
import { TENNIS_CONFIG } from '../../../src/lib/config.js';

describe('attachLegacyConfig', () => {
  test('Courts matches ESM source', () => {
    expect(legacyConfig.Courts.TOTAL_COUNT).toBe(TENNIS_CONFIG.COURTS.TOTAL_COUNT);
    expect(legacyConfig.Courts.TOP_ROW).toBe(TENNIS_CONFIG.COURTS.TOP_ROW);
    expect(legacyConfig.Courts.BOTTOM_ROW).toBe(TENNIS_CONFIG.COURTS.BOTTOM_ROW);
  });

  test('Timing matches ESM source', () => {
    expect(legacyConfig.Timing.SINGLES).toBe(TENNIS_CONFIG.TIMING.SINGLES_DURATION_MIN);
    expect(legacyConfig.Timing.DOUBLES).toBe(TENNIS_CONFIG.TIMING.DOUBLES_DURATION_MIN);
    expect(legacyConfig.Timing.MAX_PLAY).toBe(TENNIS_CONFIG.TIMING.MAX_PLAY_DURATION_MIN);
    expect(legacyConfig.Timing.AVG_GAME).toBe(TENNIS_CONFIG.TIMING.AVG_GAME_TIME_MIN);
    expect(legacyConfig.Timing.AUTO_CLEAR_MIN).toBe(180);
  });

  test('Display matches ESM source', () => {
    expect(legacyConfig.Display.MAX_WAITING_DISPLAY).toBe(TENNIS_CONFIG.DISPLAY.MAX_WAITING_DISPLAY);
  });
});
