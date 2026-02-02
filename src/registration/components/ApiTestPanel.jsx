/**
 * ApiTestPanel - Test component for verifying API integration
 *
 * This can be added to any page to test the backend connection.
 */

import React, { useState } from 'react';
import { useTennisService } from '../hooks/useTennisService.js';

export function ApiTestPanel() {
  const {
    isLoading,
    error,
    courts,
    waitlist,
    availableCourts,
    occupiedCourts,
    lastUpdate,
    assignCourt,
    clearCourt,
    searchMembers,
    refresh,
  } = useTennisService();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');

  // Test member IDs from seed data
  const TEST_PLAYERS = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'John Smith',
      accountId: 'b0000000-0000-0000-0000-000000000001',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      name: 'Bob Johnson',
      accountId: 'b0000000-0000-0000-0000-000000000002',
    },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchMembers(searchQuery);
      setSearchResults(results);
      setMessage(`Found ${results.length} members`);
    } catch (err) {
      setMessage(`Search error: ${err.message}`);
    }
  };

  const handleAssignCourt = async (courtNumber) => {
    try {
      setMessage('Assigning court...');
      await assignCourt(courtNumber, TEST_PLAYERS, { type: 'singles' });
      setMessage(`Successfully assigned Court ${courtNumber}!`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleClearCourt = async (courtNumber) => {
    try {
      setMessage('Clearing court...');
      await clearCourt(courtNumber);
      setMessage(`Successfully cleared Court ${courtNumber}!`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.panel}>
        <h3>API Test Panel</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.panel}>
        <h3>API Test Panel</h3>
        <p style={styles.error}>Error: {error}</p>
        <button onClick={refresh} style={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3>API Test Panel</h3>

      {/* Status */}
      <div style={styles.section}>
        <strong>Status:</strong> Connected | Last update:{' '}
        {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'never'}
        <button onClick={refresh} style={styles.smallButton}>
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && <div style={styles.message}>{message}</div>}

      {/* Courts Summary */}
      <div style={styles.section}>
        <strong>Courts:</strong> {availableCourts.length} available, {occupiedCourts.length}{' '}
        occupied
      </div>

      {/* Court Grid */}
      <div style={styles.courtGrid}>
        {courts.map((court) => (
          <div
            key={court.number}
            style={{
              ...styles.courtCard,
              backgroundColor: court.isAvailable
                ? '#e8f5e9'
                : court.isBlocked
                  ? '#ffebee'
                  : '#fff3e0',
            }}
          >
            <div style={styles.courtNumber}>Court {court.number}</div>
            <div style={styles.courtStatus}>
              {court.isAvailable ? 'Available' : court.isBlocked ? 'Blocked' : 'Occupied'}
            </div>
            {court.session && (
              <div style={styles.courtPlayers}>
                {court.session.players?.slice(0, 2).join(', ')}
                <br />
                <small>
                  {court.session.timeRemaining
                    ? Math.round(court.session.timeRemaining / 60000) + 'm left'
                    : ''}
                </small>
              </div>
            )}
            <div style={styles.courtActions}>
              {court.isAvailable ? (
                <button onClick={() => handleAssignCourt(court.number)} style={styles.smallButton}>
                  Assign
                </button>
              ) : court.isOccupied ? (
                <button
                  onClick={() => handleClearCourt(court.number)}
                  style={{ ...styles.smallButton, backgroundColor: '#c0392b' }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Waitlist */}
      <div style={styles.section}>
        <strong>Waitlist:</strong> {waitlist.length} groups waiting
        {waitlist.map((entry, i) => (
          <div key={entry.id || i} style={styles.waitlistEntry}>
            #{entry.position}: {entry.players?.join(', ')} ({entry.type})
          </div>
        ))}
      </div>

      {/* Member Search */}
      <div style={styles.section}>
        <strong>Member Search:</strong>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          style={styles.input}
        />
        <button onClick={handleSearch} style={styles.smallButton}>
          Search
        </button>
        {searchResults.length > 0 && (
          <div style={styles.searchResults}>
            {searchResults.map((m) => (
              <div key={m.id}>
                {m.displayName} ({m.memberNumber})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    margin: '20px',
  },
  section: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  courtGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '15px',
  },
  courtCard: {
    padding: '10px',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '12px',
  },
  courtNumber: {
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  courtStatus: {
    marginBottom: '5px',
  },
  courtPlayers: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '5px',
  },
  courtActions: {
    marginTop: '5px',
  },
  button: {
    backgroundColor: '#2d5a27',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  smallButton: {
    backgroundColor: '#2d5a27',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginLeft: '5px',
  },
  input: {
    padding: '5px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginLeft: '10px',
  },
  message: {
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  error: {
    color: '#c0392b',
  },
  waitlistEntry: {
    fontSize: '12px',
    padding: '5px',
    backgroundColor: '#fff',
    margin: '5px 0',
    borderRadius: '4px',
  },
  searchResults: {
    marginTop: '10px',
    fontSize: '12px',
  },
};

export default ApiTestPanel;
