/**
 * GeolocationService - Location verification for tennis club access
 *
 * Verifies that users are physically at the tennis club before
 * allowing court registration. Uses browser Geolocation API.
 */

import { TENNIS_CONFIG as _sharedTennisConfig } from '@lib';

const TENNIS_CONFIG = _sharedTennisConfig;

export const GeolocationService = {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  /**
   * Check if user is within club boundaries
   * @returns {Promise<Object>} Result with success status, distance, and optional message
   */
  async verifyAtClub() {
    return new Promise((resolve, reject) => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, TENNIS_CONFIG.GEOLOCATION.TIMEOUT_MS);

      // Request current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);

          const distance = this.calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            TENNIS_CONFIG.GEOLOCATION.CLUB_CENTER.latitude,
            TENNIS_CONFIG.GEOLOCATION.CLUB_CENTER.longitude
          );

          console.log(`Distance from club: ${Math.round(distance)}m`);

          if (distance <= TENNIS_CONFIG.GEOLOCATION.ALLOWED_RADIUS_METERS) {
            resolve({ success: true, distance: Math.round(distance) });
          } else {
            resolve({
              success: false,
              distance: Math.round(distance),
              message: TENNIS_CONFIG.GEOLOCATION.DENIAL_MESSAGE
            });
          }
        },
        (error) => {
          clearTimeout(timeout);
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: TENNIS_CONFIG.GEOLOCATION.TIMEOUT_MS,
          maximumAge: 0
        }
      );
    });
  }
};

// Export singleton for backward compatibility
export const geolocationService = GeolocationService;

// Default export
export default GeolocationService;
