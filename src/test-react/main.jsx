import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { COURT_COUNT, formatTime } from '@lib';

function TestApp() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#10b981' }}>Vite + React Test</h1>

      <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>@lib Imports Test</h3>
        <p style={{ margin: '4px 0' }}>
          <strong>COURT_COUNT:</strong> {COURT_COUNT}
          {COURT_COUNT === 12 ? ' ✅' : ' ❌'}
        </p>
        <p style={{ margin: '4px 0' }}>
          <strong>formatTime(new Date()):</strong> {formatTime(new Date())}
          {formatTime(new Date()) ? ' ✅' : ' ❌'}
        </p>
      </div>

      <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>useState Test</h3>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Clicked {count} times
        </button>
        {count > 0 && <span style={{ marginLeft: '8px' }}>✅</span>}
      </div>

      <p style={{ color: '#6b7280', fontSize: '14px' }}>
        If you see checkmarks above, the Vite React pipeline is working correctly!
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
