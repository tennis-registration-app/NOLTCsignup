/**
 * Normalization Layer - API to Domain transformation
 *
 * All normalizers are re-exported here. Consumers should import from
 * this barrel rather than individual files to maintain a single
 * transformation boundary.
 */

// Board normalization (composes court, session, block, waitlist normalizers)
export { normalizeBoard } from './normalizeBoard';

// Member / group normalization
export {
  normalizeMember,
  normalizeAccountMember,
  normalizeAccountMembers,
} from './normalizeMember';
export { normalizeGroup } from './normalizeGroup';

// Admin settings normalization
export {
  normalizeAdminSettingsResponse,
  normalizeSettings,
  normalizeOperatingHours,
  normalizeOverrides,
  denormalizeOperatingHours,
  denormalizeOverride,
} from './normalizeAdminSettings';

// Admin analytics normalization
export {
  normalizeHeatmapRow,
  normalizeTransaction,
  normalizeGameSession,
  normalizeCalendarBlock,
  normalizeAiResponse,
  normalizeAiAnalyticsSummary,
  normalizeAiHeatmapRow,
} from './adminAnalytics';
