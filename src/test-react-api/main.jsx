import React from 'react';
import { createRoot } from 'react-dom/client';
import { ApiTestPanel } from '../registration/components/ApiTestPanel.jsx';

function App() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#2d5a27' }}>NOLTC React API Test</h1>
      <p>This page tests the React hooks and API integration.</p>
      <ApiTestPanel />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
