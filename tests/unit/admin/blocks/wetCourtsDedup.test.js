/**
 * wetCourtsDedup — verifies bug #12 fix
 *
 * Documents that:
 * 1. Legacy blocks/hooks/useWetCourts.js has been deleted
 * 2. CompleteBlockManagerEnhanced uses controller actions directly
 * 3. Controller wetCourtsActions no longer includes no-op setters
 * 4. BlockActions no longer includes setSuspended (was fed by no-op)
 */

import { describe, it, expect } from 'vitest';
import { CONTROLLER_KEYS } from '../../../../src/admin/controller/buildAdminController.js';
import { createWetCourtsActions, createBlockActions } from '../../../../src/admin/types/domainObjects.js';
import fs from 'fs';
import path from 'path';

describe('wetCourts dedup (bug #12 fix)', () => {
  // ============================================================
  // A) Legacy hook deleted
  // ============================================================

  it('legacy blocks/hooks/useWetCourts.js no longer exists', () => {
    const legacyPath = path.resolve(
      __dirname,
      '../../../../src/admin/blocks/hooks/useWetCourts.js'
    );
    expect(fs.existsSync(legacyPath)).toBe(false);
  });

  // ============================================================
  // B) No-op setters removed from controller surface
  // ============================================================

  it('wetCourts.actions no longer includes setActive or setCourts', () => {
    expect(CONTROLLER_KEYS.wetCourts.actions).not.toContain('setActive');
    expect(CONTROLLER_KEYS.wetCourts.actions).not.toContain('setCourts');
  });

  it('wetCourts.actions has exactly 4 action keys', () => {
    expect(CONTROLLER_KEYS.wetCourts.actions).toEqual([
      'activateEmergency',
      'deactivateAll',
      'clearCourt',
      'clearAllCourts',
    ]);
  });

  it('blocks.actions no longer includes setSuspended', () => {
    expect(CONTROLLER_KEYS.blocks.actions).not.toContain('setSuspended');
  });

  it('blocks.actions has exactly 3 action keys', () => {
    expect(CONTROLLER_KEYS.blocks.actions).toEqual([
      'applyBlocks',
      'onEditingConsumed',
      'notify',
    ]);
  });

  // ============================================================
  // C) Factory functions produce correct shape
  // ============================================================

  it('createWetCourtsActions returns 4 keys (no setActive/setCourts)', () => {
    const actions = createWetCourtsActions({
      handleEmergencyWetCourt: () => {},
      deactivateWetCourts: () => {},
      onClearWetCourt: () => {},
      onClearAllWetCourts: () => {},
    });
    expect(Object.keys(actions).sort()).toEqual([
      'activateEmergency',
      'clearAllCourts',
      'clearCourt',
      'deactivateAll',
    ]);
  });

  it('createBlockActions returns 3 keys (no setSuspended)', () => {
    const actions = createBlockActions({
      onApplyBlocks: () => {},
      onEditingBlockConsumed: () => {},
      onNotification: () => {},
    });
    expect(Object.keys(actions).sort()).toEqual([
      'applyBlocks',
      'notify',
      'onEditingConsumed',
    ]);
  });

  // ============================================================
  // D) Controller actions wire through correctly
  // ============================================================

  it('createWetCourtsActions preserves function identity', () => {
    const activate = () => {};
    const deactivate = () => {};
    const clear = () => {};
    const clearAll = () => {};

    const actions = createWetCourtsActions({
      handleEmergencyWetCourt: activate,
      deactivateWetCourts: deactivate,
      onClearWetCourt: clear,
      onClearAllWetCourts: clearAll,
    });

    expect(actions.activateEmergency).toBe(activate);
    expect(actions.deactivateAll).toBe(deactivate);
    expect(actions.clearCourt).toBe(clear);
    expect(actions.clearAllCourts).toBe(clearAll);
  });

  // ============================================================
  // E) CompleteBlockManagerEnhanced no longer imports legacy hook
  // ============================================================

  it('CompleteBlockManagerEnhanced.tsx does not import legacy useWetCourts', () => {
    const componentPath = path.resolve(
      __dirname,
      '../../../../src/admin/blocks/CompleteBlockManagerEnhanced.tsx'
    );
    const content = fs.readFileSync(componentPath, 'utf-8');
    expect(content).not.toContain("from './hooks/useWetCourts'");
    expect(content).not.toContain('blocks/hooks/useWetCourts');
  });

  it('CompleteBlockManagerEnhanced.tsx uses controller actions directly', () => {
    const componentPath = path.resolve(
      __dirname,
      '../../../../src/admin/blocks/CompleteBlockManagerEnhanced.tsx'
    );
    const content = fs.readFileSync(componentPath, 'utf-8');
    expect(content).toContain('wetCourtsActions.activateEmergency');
    expect(content).toContain('wetCourtsActions.deactivateAll');
    expect(content).toContain('wetCourtsActions.clearCourt');
  });
});
