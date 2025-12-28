/**
 * useTennisService - React hook for tennis court registration
 *
 * Provides reactive state and methods for court operations,
 * with automatic real-time updates from the backend.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTennisService } from '../services/index.js';

export function useTennisService(options = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courts, setCourts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [settings, setSettings] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const serviceRef = useRef(null);
  const mountedRef = useRef(true);

  // Initialize service and load data
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        // getTennisService is synchronous - returns instance immediately
        const service = getTennisService(options);
        serviceRef.current = service;

        // Load initial data (this is async)
        const data = await service.loadInitialData();

        if (mountedRef.current) {
          setCourts(data.courts || []);
          setWaitlist(data.waitlist || []);
          setSettings(data.settings || {});
          setLastUpdate(Date.now());
          setIsLoading(false);
        }

        // Subscribe to changes
        service.addListener((change) => {
          if (!mountedRef.current) return;

          console.log('Service change:', change.type);
          setLastUpdate(Date.now());

          // Refresh the relevant data
          if (change.type === 'courts' || change.type === 'sessions' || change.type === 'blocks') {
            service.getAllCourts().then((courts) => {
              if (mountedRef.current) setCourts(courts);
            });
          }
          if (change.type === 'waitlist') {
            service.getWaitlist().then((waitlist) => {
              if (mountedRef.current) setWaitlist(waitlist);
            });
          }
        });
      } catch (err) {
        console.error('Failed to initialize tennis service:', err);
        if (mountedRef.current) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ===========================================
  // Computed Values
  // ===========================================

  const availableCourts = courts.filter((c) => c.isAvailable);
  const occupiedCourts = courts.filter((c) => c.isOccupied);
  const blockedCourts = courts.filter((c) => c.isBlocked);

  // ===========================================
  // Court Operations
  // ===========================================

  const assignCourt = useCallback(async (courtNumber, players, options = {}) => {
    if (!serviceRef.current) throw new Error('Service not initialized');

    try {
      const result = await serviceRef.current.assignCourt(courtNumber, players, options);
      return result;
    } catch (err) {
      console.error('Failed to assign court:', err);
      throw err;
    }
  }, []);

  const clearCourt = useCallback(async (courtNumber, options = {}) => {
    if (!serviceRef.current) throw new Error('Service not initialized');

    try {
      const result = await serviceRef.current.clearCourt(courtNumber, options);
      return result;
    } catch (err) {
      console.error('Failed to clear court:', err);
      throw err;
    }
  }, []);

  // ===========================================
  // Waitlist Operations
  // ===========================================

  const addToWaitlist = useCallback(async (players, options = {}) => {
    if (!serviceRef.current) throw new Error('Service not initialized');

    try {
      const result = await serviceRef.current.addToWaitlist(players, options);
      return result;
    } catch (err) {
      console.error('Failed to add to waitlist:', err);
      throw err;
    }
  }, []);

  const removeFromWaitlist = useCallback(async (waitlistId) => {
    if (!serviceRef.current) throw new Error('Service not initialized');

    try {
      const result = await serviceRef.current.removeFromWaitlist(waitlistId);
      return result;
    } catch (err) {
      console.error('Failed to remove from waitlist:', err);
      throw err;
    }
  }, []);

  const assignFromWaitlist = useCallback(async (waitlistId, courtNumber, options = {}) => {
    if (!serviceRef.current) throw new Error('Service not initialized');

    try {
      const result = await serviceRef.current.assignFromWaitlist(waitlistId, courtNumber, options);
      return result;
    } catch (err) {
      console.error('Failed to assign from waitlist:', err);
      throw err;
    }
  }, []);

  // ===========================================
  // Member Operations
  // ===========================================

  const searchMembers = useCallback(async (query) => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.searchMembers(query);
  }, []);

  const getMembersByAccount = useCallback(async (memberNumber) => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.getMembersByAccount(memberNumber);
  }, []);

  // ===========================================
  // Refresh
  // ===========================================

  const refresh = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      const [newCourts, newWaitlist] = await Promise.all([
        serviceRef.current.getAllCourts(),
        serviceRef.current.getWaitlist(),
      ]);

      if (mountedRef.current) {
        setCourts(newCourts);
        setWaitlist(newWaitlist);
        setLastUpdate(Date.now());
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }, []);

  // ===========================================
  // Return
  // ===========================================

  return {
    // State
    isLoading,
    error,
    courts,
    waitlist,
    settings,
    lastUpdate,

    // Computed
    availableCourts,
    occupiedCourts,
    blockedCourts,

    // Court Operations
    assignCourt,
    clearCourt,

    // Waitlist Operations
    addToWaitlist,
    removeFromWaitlist,
    assignFromWaitlist,

    // Member Operations
    searchMembers,
    getMembersByAccount,

    // Utilities
    refresh,
  };
}

export default useTennisService;
