import { useEffect } from 'react';
import { logger } from '../../lib/logger.js';
import { getMobileModal } from '../../platform/windowBridge.js';
import { listPlayableCourts } from '../../shared/courts/courtAvailability.js';
import { isCourtEligibleForGroup } from '../../lib/types/domain.js';
import { getUpcomingBlockWarningFromBlocks } from '@lib';

/**
 * Auto-show waitlist-available notice when a court is free
 * and THIS mobile user is first in the waitlist.
 * Mobile-only concern — no-ops when isMobileView is false.
 */
export function useWaitlistAvailable({
  courts,
  courtBlocks,
  upcomingBlocks,
  waitlist,
  isMobileView,
  mobileState,
}) {
  useEffect(() => {
    if (!isMobileView) return;

    const hasWaitlist = waitlist.length > 0;
    if (!hasWaitlist) {
      // No waitlist - close notice if open
      const mobileModal = getMobileModal();
      if (mobileModal?.currentType === 'waitlist-available') {
        mobileModal?.close?.();
      }
      return;
    }

    // Check if THIS mobile user is first in the waitlist
    // Use mobileState (React state) instead of sessionStorage for reactivity
    const mobileWaitlistEntryId = mobileState.waitlistEntryId;
    const firstGroup = waitlist[0];

    // Deferred groups: only skip when no full-time court available.
    // No blocks means no restrictions — all courts have full time available.
    let deferredBlocked = false;
    if (firstGroup?.deferred) {
      const allBlocks = [...(courtBlocks || []), ...(upcomingBlocks || [])];
      if (allBlocks.length === 0) {
        deferredBlocked = false; // No blocks = all courts have full time
      } else {
        const groupPlayerCount = firstGroup?.players?.length || 0;
        const sessionDuration = groupPlayerCount >= 4 ? 90 : 60;
        const nowDate = new Date();
        const freeForDeferred = listPlayableCourts(courts, courtBlocks, nowDate.toISOString());
        const eligibleForDeferred = freeForDeferred.filter((courtNum) =>
          isCourtEligibleForGroup(courtNum, groupPlayerCount)
        );
        deferredBlocked = !eligibleForDeferred.some((courtNum) => {
          const warning = getUpcomingBlockWarningFromBlocks(
            courtNum,
            sessionDuration + 5,
            allBlocks,
            nowDate
          );
          return warning == null;
        });
      }
    }

    const isUserFirstInWaitlist =
      mobileWaitlistEntryId && firstGroup?.id === mobileWaitlistEntryId && !deferredBlocked;

    // Use shared helper for consistent free court calculation
    const now = new Date().toISOString();
    const freeCourtList = listPlayableCourts(courts, courtBlocks, now);

    // Filter by singles-only eligibility for this group's player count
    const groupPlayerCount = firstGroup?.players?.length || 0;
    const eligibleCourtList = freeCourtList.filter((courtNum) =>
      isCourtEligibleForGroup(courtNum, groupPlayerCount)
    );
    const freeCourtCount = eligibleCourtList.length;

    logger.debug('CourtDisplay', 'WaitlistNotice check', {
      freeCourts: freeCourtCount,
      freeCourtList: eligibleCourtList,
      waitlistLength: waitlist?.length,
      isMobileView: isMobileView,
      mobileWaitlistEntryId: mobileWaitlistEntryId,
      firstGroupId: firstGroup?.id,
      isUserFirstInWaitlist: isUserFirstInWaitlist,
      shouldShow: freeCourtCount > 0 && isUserFirstInWaitlist,
      totalCourts: courts?.length,
      courtsWithSession: courts?.filter((c) => c?.session).length,
    });

    const mobileModal = getMobileModal();
    if (freeCourtCount > 0 && isUserFirstInWaitlist) {
      // Court available AND this mobile user is first in waitlist - show notice
      mobileModal?.open('waitlist-available', { firstGroup });
    } else if (mobileModal?.currentType === 'waitlist-available') {
      // Not first, no free courts, or no waitlist - close notice if it's currently showing
      mobileModal?.close?.();
    }
  }, [courts, courtBlocks, upcomingBlocks, waitlist, isMobileView, mobileState]);
}
