/**
 * Pre-parses tennisClubData from localStorage before React loads.
 * This warms the JSON parse cache so subsequent reads are faster.
 * Errors are silently swallowed (localStorage may be unavailable).
 *
 * Extracted from inline <script> in registration/index.html and admin/index.html.
 */
export function warmLocalStorageCache() {
  try {
    var raw = localStorage.getItem('tennisClubData');
    if (raw) JSON.parse(raw);
  } catch {
    // Silently swallow — localStorage may be unavailable or data corrupt
  }
}
