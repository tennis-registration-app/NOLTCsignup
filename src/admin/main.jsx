/**
 * Admin Panel - Vite Entry Point
 *
 * This is the Vite-bundled version of the Admin panel.
 * The React code is extracted from Admin.html into App.jsx.
 */
import '../platform/attachLegacyConfig.js';
import '../platform/attachLegacyTime.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { migrateOldKeys } from '../platform/prefsStorage.js';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

// Wait for shared scripts to be ready
const waitForDependencies = () => {
  return new Promise((resolve) => {
    const check = () => {
      if (window.Tennis?.Storage && window.Tennis?.DataStore) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
};

// Initialize the app
waitForDependencies().then(() => {
  console.log('[Admin Vite] Dependencies ready, mounting React app');

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
