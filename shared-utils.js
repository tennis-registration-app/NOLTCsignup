// ===== Shared utils (no UI changes) =====
(function () {
  // --- Core config
  const COURT_COUNT = 12;

  // --- Storage/Event keys
  const STORAGE = {
    DATA: 'tennisClubData',
    SETTINGS: 'tennisClubSettings',
    BLOCKS: 'courtBlocks',
    UPDATE_TICK: 'tennisDataUpdateTick',
  };
  const EVENTS = { UPDATE: 'tennisDataUpdate' };

  // --- Schema version (bump if you change structure later)
  const SCHEMA_VERSION = 1;

  // --- JSON helpers
  const readJSON = (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  const writeJSON = (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch {
      return false;
    }
  };

  // --- Default data shape
  const getEmptyData = () => ({
    __schema: SCHEMA_VERSION,
    courts: Array(COURT_COUNT).fill(null),
    waitingGroups: [],
    recentlyCleared: [],
    calculatedAvailability: null,
  });

  // --- Normalize any loaded data to current schema
  const normalizeData = (data) => {
    if (!data || typeof data !== 'object') return getEmptyData();
    const out = Object.assign(getEmptyData(), data);

    // Ensure courts is correct length
    if (!Array.isArray(out.courts)) out.courts = Array(COURT_COUNT).fill(null);
    if (out.courts.length !== COURT_COUNT) {
      const resized = Array(COURT_COUNT).fill(null);
      for (let i = 0; i < Math.min(COURT_COUNT, out.courts.length); i++) resized[i] = out.courts[i];
      out.courts = resized;
    }

    // Ensure arrays
    if (!Array.isArray(out.waitingGroups)) out.waitingGroups = [];
    if (!Array.isArray(out.recentlyCleared)) out.recentlyCleared = [];

    // Stamp/upgrade schema
    out.__schema = SCHEMA_VERSION;
    return out;
  };

  // --- Read, normalize, and self-heal storage if needed
  const readDataSafe = () => {
    const current = readJSON(STORAGE.DATA);
    const normalized = normalizeData(current);
    if (!current || JSON.stringify(current) !== JSON.stringify(normalized)) {
      // Self-heal silently
      writeJSON(STORAGE.DATA, normalized);
    }
    return normalized;
  };

  // Expose on window
  window.APP_UTILS = {
    COURT_COUNT,
    STORAGE,
    EVENTS,
    SCHEMA_VERSION,
    readJSON,
    writeJSON,
    getEmptyData,
    normalizeData,
    readDataSafe,
  };
})();