/**
 * LocationQRCode - Displays a QR code for location verification
 *
 * Used on the kiosk when mobile users need an alternative to GPS.
 * The QR code contains a short-lived token that proves the user
 * scanned it at the club.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createBackend } from '../../lib/backend/index.js';

const TOKEN_VALIDITY_MINUTES = 5;
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000; // Refresh 1 minute before expiry

// Backend singleton for API operations
const backend = createBackend();

export function LocationQRCode({ onError }) {
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const refreshTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const generateToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await backend.commands.generateLocationToken({
        validityMinutes: TOKEN_VALIDITY_MINUTES,
      });

      if (!data.ok) {
        throw new Error(data.message || 'Failed to generate token');
      }

      setToken(data.token);
      setExpiresAt(new Date(data.expiresAt));
      setLoading(false);

      // Schedule refresh before expiry
      const expiryTime = new Date(data.expiresAt).getTime();
      const refreshTime = expiryTime - Date.now() - REFRESH_BEFORE_EXPIRY_MS;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          generateToken();
        }, refreshTime);
      }
    } catch (err) {
      console.error('Failed to generate location token:', err);
      setError(err.message);
      setLoading(false);
      if (onError) onError(err);
    }
  }, [onError]);

  // Initial token generation
  useEffect(() => {
    generateToken();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [generateToken]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = expiresAt.getTime() - now;

      if (remaining <= 0) {
        setTimeLeft(0);
        generateToken(); // Refresh expired token
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [expiresAt, generateToken]);

  const formatTimeLeft = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !token) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-500 text-4xl mb-4">!</div>
        <p className="text-red-600 font-medium">Failed to generate QR code</p>
        <p className="text-gray-500 text-sm mt-2">{error}</p>
        <button
          onClick={generateToken}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Build the QR code value - just the token (mobile app will know how to use it)
  const qrValue = token;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Verification</h3>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Scan with your phone if GPS isn&apos;t working
      </p>

      <div className="p-4 bg-white border-4 border-green-600 rounded-lg">
        <QRCodeSVG value={qrValue} size={200} level="M" includeMargin={false} />
      </div>

      <div className="mt-4 flex items-center text-sm">
        <span
          className={`font-mono text-lg ${timeLeft && timeLeft < 60 ? 'text-orange-500' : 'text-gray-700'}`}
        >
          {formatTimeLeft(timeLeft)}
        </span>
        <span className="ml-2 text-gray-500">until refresh</span>
      </div>

      {loading && <p className="mt-2 text-xs text-gray-400">Refreshing...</p>}
    </div>
  );
}

export default LocationQRCode;
