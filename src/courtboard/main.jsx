// CourtBoard - Vite-bundled React Entry Point
// Converted from inline Babel to ES module JSX
import './styles/index.css';
import '../platform/attachLegacyConfig.js';
import '../platform/attachLegacyTime.js';
import '../platform/attachLegacyEvents.js';
import '../platform/attachLegacyStorage.js';
import '../platform/attachLegacyDataStore.js';
import '../platform/attachLegacyRoster.js';
import '../platform/attachLegacyAvailability.js';
import '../platform/attachLegacyWaitlist.js';
import '../platform/attachLegacyBlocks.js';
import { logger } from '../lib/logger.js';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import { migrateOldKeys } from '../platform/prefsStorage.js';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

// Browser bridge - exposes window.CourtAvailability for non-bundled scripts (courtboard-bootstrap.js)
import './browser-bridge.js';

// Platform bridge for window global access
import { getTennisStorage, getTennisDomain } from '../platform/windowBridge.js';

// Extracted components
import { ToastHost } from './components/ToastHost';
import { LoadingPlaceholder } from './components/LoadingPlaceholder';
import { TennisCourtDisplay } from './components/TennisCourtDisplay';

// Mobile modal components
import { MobileModalApp } from './mobile/MobileModalApp';

// Main App wrapper that waits for Tennis modules
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if Tennis modules are loaded
    const checkReady = () => {
      const storage = getTennisStorage();
      const domain = getTennisDomain();
      if (storage && domain?.availability) {
        setReady(true);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    // Poll until ready
    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error('Tennis modules failed to load within timeout');
      setReady(true); // Show UI anyway, will show error state
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    return <LoadingPlaceholder />;
  }

  return (
    <>
      <ToastHost />
      <TennisCourtDisplay />
    </>
  );
}

// Mount the application
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary context="Courtboard Display">
      <App />
    </ErrorBoundary>
  );
}

// ============================================
// MOBILE MODAL SYSTEM
// ============================================

// Mount mobile modal system if in mobile view
if (window.IS_MOBILE_VIEW) {
  const modalNode = document.getElementById('mobile-modal-root');
  if (modalNode) {
    const modalRoot = ReactDOM.createRoot(modalNode);
    modalRoot.render(<MobileModalApp />);
    logger.debug('Courtboard', 'Mobile modal system mounted');

    // Debug listener
    document.addEventListener('mm:open', (e) =>
      logger.debug('ModalRoot', 'mm:open seen', /** @type {CustomEvent} */ (e).detail)
    );
    document.addEventListener('mm:close', () => logger.debug('ModalRoot', 'mm:close seen'));
  }
}
