// Registration - Vite Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from '../shared/components/ErrorBoundary.jsx';
import { migrateOldKeys } from '../platform/prefsStorage.js';

// Run migration for legacy localStorage keys (idempotent, safe to call multiple times)
migrateOldKeys();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary context="Court Registration">
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
