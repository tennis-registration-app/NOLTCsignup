/**
 * Admin Panel - Vite Entry Point
 *
 * This is the Vite-bundled version of the Admin panel.
 * The React code is extracted from Admin.html into App.tsx.
 */
import './styles/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from '../shared/components/ErrorBoundary';
import { migrateOldKeys } from '../platform/prefsStorage';
import { logger } from '../lib/logger';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

logger.info('Admin Vite', 'Mounting React app');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary context="Admin Panel">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
