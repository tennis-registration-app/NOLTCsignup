import { useState, useEffect } from 'react';
import { logger } from '../../lib/logger.js';
import { normalizeSettings } from '../../lib/normalize/index.js';
import { createBackend } from '../../lib/backend/index.js';

const backend = createBackend();

/**
 * One-shot loader for admin settings (checkStatusMinutes, blockWarningMinutes).
 * Normalizes at the boundary and returns sensible defaults.
 */
export function useCourtboardSettings() {
  const [checkStatusMinutes, setCheckStatusMinutes] = useState(150);
  const [blockWarningMinutes, setBlockWarningMinutes] = useState(60);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        logger.debug('CourtDisplay', 'Loading settings, backend.admin:', !!backend.admin);
        const result = await backend.admin?.getSettings?.();
        const settings = normalizeSettings(result?.settings);
        logger.debug('CourtDisplay', 'Settings result', {
          ok: result?.ok,
          checkStatusMinutes: settings?.checkStatusMinutes,
        });
        if (result?.ok && settings?.checkStatusMinutes) {
          const minutes = parseInt(settings.checkStatusMinutes, 10);
          if (minutes > 0) {
            setCheckStatusMinutes(minutes);
            logger.debug('CourtDisplay', 'Loaded checkStatusMinutes:', minutes);
          }
        }
        if (result?.ok && settings?.blockWarningMinutes) {
          const blockWarnMin = parseInt(settings.blockWarningMinutes, 10);
          if (blockWarnMin > 0) {
            setBlockWarningMinutes(blockWarnMin);
            logger.debug('CourtDisplay', 'Loaded blockWarningMinutes:', blockWarnMin);
          }
        }
      } catch (err) {
        logger.warn('CourtDisplay', 'Failed to load settings, using default', err);
      }
    };
    loadSettings();
  }, []);

  return { checkStatusMinutes, blockWarningMinutes };
}
