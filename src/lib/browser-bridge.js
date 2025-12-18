/**
 * Tennis Court Registration System - Browser Bridge
 *
 * This module bridges the ES modules in /src/lib/ to the global
 * window.APP_UTILS namespace used by the HTML files with CDN React.
 *
 * Load this as a module script in HTML files:
 * <script type="module" src="/src/lib/browser-bridge.js"></script>
 */

import * as TennisLib from './index.js';

// Log loaded exports for verification
const exportNames = Object.keys(TennisLib).sort();
console.log(
  '%c[TennisLib Bridge]%c Loaded %d exports from /src/lib/',
  'color: #10b981; font-weight: bold',
  'color: inherit',
  exportNames.length
);
console.log('[TennisLib Bridge] Exports:', exportNames.join(', '));

// Expose to global scope for HTML files using CDN React
// Preserve any existing properties (in case shared-utils.js loaded first)
window.APP_UTILS = {
  ...window.APP_UTILS,
  ...TennisLib,
};

// Legacy namespace compatibility
window.Tennis = window.Tennis || {};
Object.assign(window.Tennis, {
  ...window.Tennis,
  // Map to expected Tennis.* structure
  Storage: {
    ...(window.Tennis.Storage || {}),
    STORAGE: TennisLib.STORAGE,
    readJSON: TennisLib.readJSON,
    writeJSON: TennisLib.writeJSON,
  },
  Config: {
    ...(window.Tennis.Config || {}),
    COURTS: { COUNT: TennisLib.COURT_COUNT },
  },
  Domain: {
    ...(window.Tennis.Domain || {}),
    waitlist: {
      ...(window.Tennis.Domain?.waitlist || {}),
      signature: TennisLib.waitlistSignature,
    },
  },
});

// Also expose the full library as Tennis.Lib for direct access
window.Tennis.Lib = TennisLib;

console.log('[TennisLib Bridge] window.APP_UTILS ready with', Object.keys(window.APP_UTILS).length, 'properties');

export default TennisLib;
