/**
 * useRegistrationEffects
 * Extracted from useRegistrationAppState
 *
 * Contains all useEffect hooks from useRegistrationAppState.
 * Pure extraction — no logic changes, same dependency arrays.
 */

import { useEffect } from 'react';
import { setLoadDataGlobal } from '../../../platform/registerGlobals.js';

/**
 * @param {Object} deps - Effect dependencies
 * @param {string} deps.currentScreen - Current screen name
 * @param {string|null} deps.currentMemberId - Current member ID
 * @param {Object} deps.dataStore - Data store instance
 * @param {Object} deps.TENNIS_CONFIG - Tennis configuration
 * @param {Function} deps.setBallPriceInput - Setter for ball price input
 * @param {Function} deps.setPreselectedCourt - Setter for preselected court
 * @param {Function} deps.setCurrentScreen - Setter for current screen
 * @param {Function} deps.fetchFrequentPartners - Function to fetch frequent partners
 * @param {Function} deps.loadData - Function to load data
 */
export function useRegistrationEffects({
  currentScreen,
  currentMemberId,
  dataStore,
  TENNIS_CONFIG,
  setBallPriceInput,
  setPreselectedCourt,
  setCurrentScreen,
  fetchFrequentPartners,
  loadData,
}) {
  // Stable primitives for effect deps (avoids object identity churn)
  const ballPriceCents = TENNIS_CONFIG.PRICING.TENNIS_BALLS;
  const settingsKey = TENNIS_CONFIG.STORAGE.SETTINGS_KEY;

  // Load admin settings when entering admin screen
  useEffect(() => {
    const loadAdminSettings = async () => {
      if (currentScreen === 'admin') {
        try {
          const settings = await dataStore?.get(settingsKey);
          if (settings) {
            const parsed = settings || {};
            setBallPriceInput((parsed.tennisBallPrice || ballPriceCents).toFixed(2));
          } else {
            setBallPriceInput(ballPriceCents.toFixed(2));
          }
        } catch {
          setBallPriceInput(ballPriceCents.toFixed(2));
        }
      }
    };
    loadAdminSettings();
  }, [currentScreen, ballPriceCents, settingsKey, dataStore, setBallPriceInput]);

  // Mobile Bridge Integration
  useEffect(() => {
    if (typeof window !== 'undefined' && window.RegistrationUI) {
      window.RegistrationUI.setSelectedCourt = (courtNumber) => {
        console.log('Mobile: Setting selected court to', courtNumber);
        setPreselectedCourt(courtNumber);
      };

      window.RegistrationUI.startRegistration = (courtNumber) => {
        console.log('Mobile: Starting registration for court', courtNumber);
        setCurrentScreen('group', 'mobileStartRegistration');
        requestAnimationFrame(() => {
          const input =
            document.querySelector('#mobile-group-search-input') ||
            document.querySelector('#main-search-input') ||
            document.querySelector('[data-role="player-input"]') ||
            document.querySelector('#playerNameInput') ||
            document.querySelector('input[type="text"]');
          if (input) {
            input.focus({ preventScroll: true });
            try {
              const v = input.value || '';
              input.setSelectionRange(v.length, v.length);
            } catch {
              /* setSelectionRange not supported */
            }
          }
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: one-time Tennis.Events subscription setup
  }, []);

  // Fetch frequent partners when entering group screen
  useEffect(() => {
    if (currentScreen === 'group' && currentMemberId) {
      fetchFrequentPartners(currentMemberId);
    }
  }, [currentScreen, currentMemberId, fetchFrequentPartners]);

  // Expose loadData for tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoadDataGlobal(loadData);
    }
  }, [loadData]);
}
