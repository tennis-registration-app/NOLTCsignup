// Registration - Vite Entry Point
import '../platform/attachLegacyConfig.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { migrateOldKeys } from '../platform/prefsStorage.js';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

// Wait for Tennis modules to be available before rendering
function waitForTennis(callback, maxWait = 10000) {
  const start = Date.now();

  function check() {
    if (window.Tennis?.Storage && window.Tennis?.Domain?.availability) {
      callback();
    } else if (Date.now() - start < maxWait) {
      setTimeout(check, 50);
    } else {
      console.error('Tennis modules failed to load within timeout');
      callback(); // Render anyway, components will show loading state
    }
  }

  check();
}

// Render the app once Tennis modules are ready
waitForTennis(() => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});
