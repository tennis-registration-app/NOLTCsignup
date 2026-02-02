/**
 * @fileoverview React hook for admin settings management.
 * Thin wrapper around pure logic in adminSettingsLogic.js.
 *
 * This hook owns all settings-related state:
 * - settings (ball price, guest fees)
 * - operatingHours
 * - hoursOverrides
 * - blockTemplates
 *
 * Contains effects #1 (ADMIN_REFRESH listener) and #2 (mount + storage listener).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../lib/logger.js';
import {
  loadSettingsData,
  updateBallPriceApi,
  refreshSettingsApi,
  refreshAISettingsApi,
} from './adminSettingsLogic.js';

// Singleton guard to prevent duplicate listener attachment on re-mount
const _one = (key) => (window[key] ? true : ((window[key] = true), false));

/**
 * Hook for managing admin settings state and operations.
 *
 * @param {Object} deps - External dependencies
 * @param {Object} deps.backend - Backend API client
 * @param {Function} deps.showNotification - Notification function (message, type)
 * @param {Object} deps.dataStore - Local storage abstraction
 * @param {Object} deps.TENNIS_CONFIG - Config constants
 * @param {Function} deps.clearAllTimers - Timer cleanup function
 * @returns {Object} Settings state and operations
 */
export function useAdminSettings(deps) {
  const { backend, showNotification, dataStore, TENNIS_CONFIG, clearAllTimers } = deps;

  // State owned by this hook
  const [settings, setSettings] = useState({});
  const [operatingHours, setOperatingHours] = useState([]);
  const [hoursOverrides, setHoursOverrides] = useState([]);
  const [blockTemplates, setBlockTemplates] = useState([]);

  // Load data function
  const loadData = useCallback(async () => {
    const result = await loadSettingsData({
      backend,
      dataStore,
      TENNIS_CONFIG,
      onError: (msg) => showNotification(msg, 'error'),
    });

    if (result.blockTemplates) {
      setBlockTemplates(result.blockTemplates);
    }
    if (result.settings) {
      setSettings(result.settings);
    }
    if (result.operatingHours) {
      setOperatingHours(result.operatingHours);
    }
    if (result.hoursOverrides) {
      setHoursOverrides(result.hoursOverrides);
    }
  }, [backend, dataStore, TENNIS_CONFIG, showNotification]);

  // Stable ref for loadData to avoid stale closures in event listeners
  const loadDataRef = useRef(loadData);
  // eslint-disable-next-line react-hooks/refs -- Intentional: update ref on every render to avoid stale closure in event listener
  loadDataRef.current = loadData;

  // Effect #1: Event-driven refresh bridge listener
  useEffect(() => {
    const onAdminRefresh = () => {
      loadDataRef.current();
    };
    window.addEventListener('ADMIN_REFRESH', onAdminRefresh);
    return () => window.removeEventListener('ADMIN_REFRESH', onAdminRefresh);
  }, []);

  // Effect #2: Load data on mount + storage listener
  useEffect(() => {
    loadData();

    // Prevent duplicate attachment if this component re-mounts
    if (_one('__ADMIN_SETTINGS_LISTENERS_INSTALLED')) return;

    // Listen for storage events from other apps/tabs (fallback for non-API data)
    const handleStorageEvent = (e) => {
      if (e.key === TENNIS_CONFIG.STORAGE.KEY || e.key === 'courtBlocks') {
        logger.debug('AdminApp', 'Cross-app storage update detected for', e.key);
        // Invalidate cache for this key
        if (dataStore?.cache) {
          dataStore.cache.delete(e.key);
        }
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageEvent, { passive: true });

    // Defensive cleanup on unload as well
    window.addEventListener(
      'beforeunload',
      () => {
        try {
          clearAllTimers();
        } catch {
          // Intentionally ignored (Phase 3.5 lint): cleanup on unload
        }
        try {
          window.removeEventListener('storage', handleStorageEvent);
        } catch {
          // Intentionally ignored (Phase 3.5 lint): listener may not exist
        }
      },
      { once: true }
    );

    return () => {
      try {
        window.removeEventListener('storage', handleStorageEvent);
      } catch {
        // Intentionally ignored (Phase 3.5 lint): cleanup on unmount
      }
    };
  }, [loadData, TENNIS_CONFIG, dataStore, clearAllTimers]);

  // Update ball price handler
  const updateBallPrice = useCallback(
    async (price) => {
      const result = await updateBallPriceApi(backend, price);
      if (result.ok) {
        setSettings((prev) => ({ ...prev, tennisBallPrice: price }));
        showNotification('Ball price updated', 'success');
      } else {
        showNotification('Failed to update ball price', 'error');
      }
      return result;
    },
    [backend, showNotification]
  );

  // Refresh settings after external changes (SystemSettings callback)
  const handleSettingsChanged = useCallback(() => {
    refreshSettingsApi({ backend }).then((result) => {
      if (result) {
        if (result.settings) {
          setSettings(result.settings);
        }
        if (result.operatingHours) {
          setOperatingHours(result.operatingHours);
        }
        if (result.hoursOverrides) {
          setHoursOverrides(result.hoursOverrides);
        }
      }
    });
  }, [backend]);

  // Refresh settings after AI-triggered changes
  const handleAISettingsChanged = useCallback(async () => {
    const result = await refreshAISettingsApi({ backend });
    if (result) {
      if (result.settings) {
        setSettings(result.settings);
      }
      if (result.hoursOverrides) {
        setHoursOverrides(result.hoursOverrides);
      }
    }
  }, [backend]);

  // Expose reload function for handleRefreshData in App.jsx
  const reloadSettings = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    settings,
    operatingHours,
    hoursOverrides,
    blockTemplates,
    // Operations
    updateBallPrice,
    handleSettingsChanged,
    handleAISettingsChanged,
    reloadSettings,
  };
}

export default useAdminSettings;
