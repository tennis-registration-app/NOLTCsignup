/**
 * Admin Panel - Vite Entry Point
 *
 * This is the Vite-bundled version of the Admin panel.
 * The React code is extracted from Admin.html into App.jsx.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import { migrateOldKeys } from '../platform/prefsStorage.js';
import { logger } from '../lib/logger.js';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

logger.info('Admin Vite', 'Mounting React app');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary context="Admin Panel">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
