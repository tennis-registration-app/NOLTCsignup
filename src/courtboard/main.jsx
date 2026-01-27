// CourtBoard - Vite-bundled React Entry Point
// Converted from inline Babel to ES module JSX
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Browser bridge - exposes window.CourtAvailability for non-bundled scripts (mobile-fallback-bar.js)
import './browser-bridge.js';

// Extracted components
import { ToastHost } from './components/ToastHost';
import { LoadingPlaceholder } from './components/LoadingPlaceholder';
import { TennisCourtDisplay } from './components/TennisCourtDisplay';

// Mobile modal components
import { MobileModalApp } from './mobile/MobileModalApp';

// Module references assigned in App() useEffect - only A and W are used
// eslint-disable-next-line no-unused-vars -- A and W are assigned in useEffect and used throughout; ESLint can't track dynamic assignment
let _Config, _Storage, _Events, A, W, _T, _DataStore, _Av, _Tm, _TimeFmt;

// Main App wrapper that waits for Tennis modules
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if Tennis modules are loaded
    const checkReady = () => {
      if (window.Tennis?.Storage && window.Tennis?.Domain?.availability) {
        // Initialize module references (only A and W are used)
        _Config = window.Tennis.Config;
        _Storage = window.Tennis.Storage;
        _Events = window.Tennis.Events;
        A = window.Tennis.Domain.availability || window.Tennis.Domain.Availability;
        W = window.Tennis.Domain.waitlist || window.Tennis.Domain.Waitlist;
        _T = window.Tennis.Domain.time || window.Tennis.Domain.Time;
        _DataStore = window.Tennis.DataStore;
        _Av = window.Tennis.Domain.availability || window.Tennis.Domain.Availability;
        _Tm = window.Tennis.Domain.time || window.Tennis.Domain.Time;
        _TimeFmt = window.Tennis.Domain.time || window.Tennis.Domain.Time;
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
  root.render(<App />);
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
    console.debug('Mobile modal system mounted');

    // Debug listener
    document.addEventListener('mm:open', (e) =>
      console.debug('[ModalRoot] mm:open seen', e.detail)
    );
    document.addEventListener('mm:close', () => console.debug('[ModalRoot] mm:close seen'));
  }
}
