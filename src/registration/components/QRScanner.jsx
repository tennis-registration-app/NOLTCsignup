/**
 * QRScanner - Scans QR codes for location token verification
 *
 * Used on mobile when GPS fails. User scans the QR code displayed
 * on the kiosk to prove they are at the club.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function QRScanner({ onScan, onClose, onError }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Successfully scanned
          console.log('[QRScanner] Scanned:', decodedText);

          // Validate it looks like a location token (32 uppercase chars)
          if (/^[A-Z0-9]{32}$/.test(decodedText)) {
            stopScanner();
            onScan(decodedText);
          } else {
            console.warn('[QRScanner] Invalid token format:', decodedText);
            setError('Invalid QR code. Please scan the location code from the kiosk.');
          }
        },
        (errorMessage) => {
          // Ignore continuous scan errors (expected when no QR in frame)
        }
      );

      setHasPermission(true);
    } catch (err) {
      console.error('[QRScanner] Error starting scanner:', err);
      setIsScanning(false);

      if (err.message?.includes('Permission')) {
        setHasPermission(false);
        setError('Camera permission denied. Please enable camera access.');
      } else if (err.message?.includes('NotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError(`Failed to start camera: ${err.message}`);
      }

      if (onError) onError(err);
    }
  }, [onScan, onError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.warn('[QRScanner] Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Scan Location QR Code</h2>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-800 rounded-full"
          aria-label="Close scanner"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center p-6 bg-white rounded-lg max-w-sm">
            <div className="text-red-500 text-4xl mb-4">!</div>
            <p className="text-red-600 font-medium mb-2">Scanner Error</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            {hasPermission === false ? (
              <p className="text-gray-500 text-xs">
                Please enable camera access in your browser settings and reload.
              </p>
            ) : (
              <button
                onClick={startScanner}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              ref={containerRef}
              className="w-full max-w-sm bg-black rounded-lg overflow-hidden"
              style={{ minHeight: '300px' }}
            />
            <p className="mt-4 text-white text-center text-sm">
              Point your camera at the QR code on the kiosk screen
            </p>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-900 text-white text-center text-sm">
        <p>Can't find the QR code? Ask a staff member for help.</p>
      </div>
    </div>
  );
}

export default QRScanner;
