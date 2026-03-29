// CourtBoard - Vite-bundled React Entry Point
import './styles/index.css';
import '../platform/attachLegacyConfig.js';
import '../platform/attachLegacyEvents.js';
import '../platform/attachLegacyStorage.js';
import '../platform/attachLegacyAvailability.js';
import '../platform/attachLegacyWaitlist.js';
import { logger } from '../lib/logger';
import React, { useState } from 'react';
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

// Main App wrapper — synchronous readiness gate.
// All 5 attachLegacy imports above are synchronous side effects that complete
// before React renders, so this check always passes on first evaluation.
// Kept as a fail-safe: if readiness is false, LoadingPlaceholder renders.
function App() {
  const [ready] = useState(() => {
    const storage = getTennisStorage();
    const domain = getTennisDomain();
    return !!(storage && domain?.availability);
  });

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
      logger.debug('ModalRoot', 'mm:open seen', (e as CustomEvent).detail)
    );
    document.addEventListener('mm:close', () => logger.debug('ModalRoot', 'mm:close seen'));
  }
}
