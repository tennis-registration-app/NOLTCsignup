/**
 * useMemberIdentity Hook
 * Manages member identity state + frequent partners + cache.
 *
 * NOTE: The useEffect that triggers fetch on group screen entry stays in App.jsx.
 * NOTE: Reset quirks preserved:
 *   - resetForm should call clearCache()
 *   - timeout exit should NOT call clearCache()
 */

import { useReducer, useCallback, useRef } from 'react';
import { memberIdentityReducer, initialMemberIdentityState } from './memberIdentityReducer.js';

// TTL for frequent partners cache (10 minutes)
const FREQUENT_PARTNERS_CACHE_TTL_MS = 10 * 60 * 1000;

export function useMemberIdentity({ backend }) {
  const [state, dispatch] = useReducer(memberIdentityReducer, initialMemberIdentityState);

  // Cache ref for frequent partners (preserves exact legacy shape)
  const frequentPartnersCacheRef = useRef({});

  // ============================================
  // Setters
  // ============================================
  const setMemberNumber = useCallback((value) => {
    dispatch({ type: 'MEMBER_NUMBER_SET', value });
  }, []);

  const setCurrentMemberId = useCallback((value) => {
    dispatch({ type: 'CURRENT_MEMBER_ID_SET', value });
  }, []);

  const setFrequentPartners = useCallback((value) => {
    dispatch({ type: 'FREQUENT_PARTNERS_SET', value });
  }, []);

  const setFrequentPartnersLoading = useCallback((value) => {
    dispatch({ type: 'FREQUENT_PARTNERS_LOADING_SET', value });
  }, []);

  // ============================================
  // fetchFrequentPartners (EXACT LEGACY LOGIC)
  // ============================================
  const fetchFrequentPartners = useCallback(
    async (memberId) => {
      console.log('[FP] fetchFrequentPartners called', {
        memberId,
        cacheState: frequentPartnersCacheRef.current[memberId],
        timestamp: Date.now(),
      });

      if (!memberId || !backend?.queries) {
        console.log('[FP] No memberId or backend, returning');
        return;
      }

      // Check cache status - don't refetch if loading or still fresh
      const cached = frequentPartnersCacheRef.current[memberId];
      const now = Date.now();

      if (cached?.status === 'loading') {
        console.log('[FP] Already loading, skipping');
        return; // Already in flight
      }
      if (cached?.status === 'ready' && now - cached.ts < FREQUENT_PARTNERS_CACHE_TTL_MS) {
        console.log('[FP] Cache hit, using cached data');
        setFrequentPartners(cached.data);
        return; // Use cached data (still fresh)
      }

      // Mark as loading before fetch starts
      console.log('[FP] Starting fetch, marking as loading');
      frequentPartnersCacheRef.current[memberId] = { status: 'loading', ts: Date.now() };
      setFrequentPartnersLoading(true);

      try {
        const result = await backend.queries.getFrequentPartners(memberId);
        if (result.ok && result.partners) {
          // Transform API response to expected format
          const partners = result.partners.map((p) => ({
            player: {
              id: p.member_id,
              name: p.display_name,
              memberNumber: p.member_number,
              memberId: p.member_id,
            },
            count: p.play_count,
          }));

          frequentPartnersCacheRef.current[memberId] = {
            status: 'ready',
            data: partners,
            ts: Date.now(),
          };
          setFrequentPartners(partners);
          setFrequentPartnersLoading(false);
        } else {
          frequentPartnersCacheRef.current[memberId] = { status: 'error', ts: Date.now() };
          setFrequentPartnersLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch frequent partners:', error);
        frequentPartnersCacheRef.current[memberId] = { status: 'error', ts: Date.now() };
        setFrequentPartners([]);
        setFrequentPartnersLoading(false);
      }
    },
    [backend, setFrequentPartners, setFrequentPartnersLoading]
  );

  // ============================================
  // Cache management
  // ============================================
  const clearCache = useCallback(() => {
    frequentPartnersCacheRef.current = {};
  }, []);

  // ============================================
  // Resets
  // ============================================
  const resetMemberIdentity = useCallback(() => {
    dispatch({ type: 'MEMBER_IDENTITY_RESET' });
  }, []);

  // Full reset including cache (for resetForm)
  const resetMemberIdentityWithCache = useCallback(() => {
    dispatch({ type: 'MEMBER_IDENTITY_RESET' });
    frequentPartnersCacheRef.current = {};
  }, []);

  // ============================================
  // Return API
  // ============================================
  return {
    // State
    memberNumber: state.memberNumber,
    currentMemberId: state.currentMemberId,
    frequentPartners: state.frequentPartners,
    frequentPartnersLoading: state.frequentPartnersLoading,

    // Setters
    setMemberNumber,
    setCurrentMemberId,
    setFrequentPartners,
    setFrequentPartnersLoading,

    // Fetch
    fetchFrequentPartners,

    // Cache management (for reset quirk)
    clearCache,

    // Resets
    resetMemberIdentity, // Does NOT clear cache (for timeout)
    resetMemberIdentityWithCache, // Clears cache (for resetForm)
  };
}
