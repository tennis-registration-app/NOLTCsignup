/**
 * useOptimisticWetToggle
 *
 * Shared hook for optimistic single-court wet toggle.
 * Used by both CourtStatusGrid (via useCourtActions) and
 * CompleteBlockManagerEnhanced (via WetCourtManagementPanel).
 *
 * ONE implementation — prevents duplicate optimistic wrappers.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../shared/utils/toast';

/**
 * @param {Object} deps
 * @param {Set} [deps.wetCourts] - Real wet courts Set from useWetCourts
 * @param {Function} [deps.clearCourt] - Raw clearWetCourt from useWetCourts
 */
export function useOptimisticWetToggle({ wetCourts, clearCourt }: { wetCourts?: Set<number>; clearCourt?: (n: number) => Promise<{success?: boolean; error?: string}> | void }) {
  const [optimisticWetCourts, setOptimisticWetCourts] = useState(null as Set<number> | null);
  const [wetToggleInFlight, setWetToggleInFlight] = useState(false);

  // Clear optimistic overrides when real wetCourts Set catches up.
  useEffect(() => {
    if (!optimisticWetCourts) return;

    // Bidirectional equality: optimistic ⊆ real AND real ⊆ optimistic
    const realMatches = (() => {
      for (const num of optimisticWetCourts) {
        if (!wetCourts?.has(num)) return false;
      }
      if (wetCourts) {
        for (const num of wetCourts) {
          if (!optimisticWetCourts.has(num)) return false;
        }
      }
      return true;
    })();

    if (realMatches) {
      setOptimisticWetCourts(null);
    }
  }, [wetCourts, optimisticWetCourts]);

  /**
   * Optimistically clear a single wet court.
   * Immediately removes from display Set, then awaits backend.
   */
  const handleWetCourtToggle = useCallback(
    async (courtNum: number) => {
      if (wetToggleInFlight || !clearCourt) return;

      const activeWetCourts = optimisticWetCourts || wetCourts || new Set();
      if (!activeWetCourts.has(courtNum)) return;

      const updatedSet = new Set(activeWetCourts);
      updatedSet.delete(courtNum);
      setOptimisticWetCourts(updatedSet);
      setWetToggleInFlight(true);

      try {
        const res = await clearCourt(courtNum);
        if (!res?.success) {
          setOptimisticWetCourts(null);
          toast(res?.error || 'Failed to clear wet court', { type: 'error' });
        }
      } catch {
        setOptimisticWetCourts(null);
        toast('Unexpected error clearing wet court', { type: 'error' });
      } finally {
        setWetToggleInFlight(false);
      }
    },
    [wetToggleInFlight, optimisticWetCourts, wetCourts, clearCourt]
  );

  /**
   * Set optimistic wet courts to an empty set (all dry).
   * Used by deactivate / clear-all handlers.
   */
  const setAllDryOptimistic = useCallback(() => {
    setOptimisticWetCourts(new Set());
  }, []);

  /**
   * Set optimistic wet courts to all 12 courts (activate).
   */
  const setAllWetOptimistic = useCallback(() => {
    setOptimisticWetCourts(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
  }, []);

  /**
   * Roll back optimistic state (on error).
   */
  const rollbackOptimistic = useCallback(() => {
    setOptimisticWetCourts(null);
  }, []);

  /**
   * Mark a bulk wet operation as in-flight (for double-click prevention).
   * @param {boolean} inFlight
   */
  const setBulkInFlight = useCallback((inFlight: boolean) => {
    setWetToggleInFlight(inFlight);
  }, []);

  return {
    optimisticWetCourts,
    wetToggleInFlight,
    handleWetCourtToggle,
    setAllDryOptimistic,
    setAllWetOptimistic,
    rollbackOptimistic,
    setBulkInFlight,
  };
}
