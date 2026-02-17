/**
 * Normalization Layer - API to Domain transformation
 *
 * All normalizers are re-exported here. Consumers should import from
 * this barrel rather than individual files to maintain a single
 * transformation boundary.
 */

// Board normalization (composes court, session, block, waitlist normalizers)
export { normalizeBoard } from './normalizeBoard.js';

// Member / group normalization
export {
  normalizeMember,
  normalizeAccountMember,
  normalizeAccountMembers,
} from './normalizeMember.js';
export { normalizeGroup } from './normalizeGroup.js';

// Admin settings normalization
export {
  normalizeAdminSettingsResponse,
  normalizeSettings,
  normalizeOperatingHours,
  normalizeOverrides,
  denormalizeOperatingHours,
  denormalizeOverride,
} from './normalizeAdminSettings.js';

// Admin analytics normalization
export {
  normalizeHeatmapRow,
  normalizeTransaction,
  normalizeGameSession,
  normalizeCalendarBlock,
  normalizeAiResponse,
  normalizeAiAnalyticsSummary,
  normalizeAiHeatmapRow,
} from './adminAnalytics.js';
