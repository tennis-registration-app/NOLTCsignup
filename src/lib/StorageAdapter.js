/**
 * Storage Adapter - implements the storage interface for TennisDataService
 *
 * This adapter wraps localStorage operations with a consistent async interface.
 * Future: Replace with ApiAdapter that calls fetch() for backend integration.
 */
import { readJSON, writeJSON } from './storage.js';
import { STORAGE } from './constants.js';

// Simulate network latency in development (helps catch async bugs)
const DEV = import.meta?.env?.DEV ?? false;
const simulateLatency = (ms = 0) =>
  DEV && ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export class LocalStorageAdapter {
  constructor(options = {}) {
    this.latencyMs = options.latencyMs || 0; // Set to 50 for testing async behavior
  }

  async read(key) {
    await simulateLatency(this.latencyMs);
    return readJSON(key);
  }

  async write(key, data) {
    await simulateLatency(this.latencyMs);
    writeJSON(key, data);
    return data;
  }

  async getData() {
    await simulateLatency(this.latencyMs);
    return readJSON(STORAGE.DATA);
  }

  async saveData(data) {
    await simulateLatency(this.latencyMs);
    writeJSON(STORAGE.DATA, data);
    return data;
  }

  // Direct sync access for methods that require it
  readSync(key) {
    return readJSON(key);
  }

  writeSync(key, data) {
    writeJSON(key, data);
    return data;
  }
}

// Export singleton instance
export const storageAdapter = new LocalStorageAdapter();

/**
 * Future API Adapter template:
 *
 * export class ApiAdapter {
 *   constructor(baseUrl) {
 *     this.baseUrl = baseUrl;
 *   }
 *
 *   async getData() {
 *     const response = await fetch(`${this.baseUrl}/data`);
 *     return response.json();
 *   }
 *
 *   async saveData(data) {
 *     const response = await fetch(`${this.baseUrl}/data`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data)
 *     });
 *     return response.json();
 *   }
 * }
 */
