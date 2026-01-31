/**
 * Apply Blocks Operation
 * Extracted from AdminPanelV2 for maintainability.
 * Pure handler logic - no React hooks or state.
 */

export async function applyBlocksOp(ctx, blocks) {
  const { courts, backend, showNotification, TENNIS_CONFIG } = ctx;

  if (!blocks || !Array.isArray(blocks)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // Process all blocks and courts
  for (const block of blocks) {
    // read form values from existing variables
    const name = block.title || block.name || '';
    const reason = block.reason || '';
    const startTime = new Date(block.startTime);
    const endTime = new Date(block.endTime);
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    const selectedCourts = Array.isArray(block.courts) ? block.courts : [block.courtNumber];

    // validate minimally
    if (
      !name ||
      !reason ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0 ||
      !Array.isArray(selectedCourts) ||
      selectedCourts.length === 0
    ) {
      alert('Please provide name, reason, positive duration, and at least one court.');
      return;
    }

    // Map reason to block type for API
    const reasonLower = reason.toLowerCase();
    let blockType = 'other';
    if (reasonLower.includes('wet') || reasonLower.includes('rain')) {
      blockType = 'wet';
    } else if (reasonLower.includes('maintenance') || reasonLower.includes('repair')) {
      blockType = 'maintenance';
    } else if (reasonLower.includes('lesson') || reasonLower.includes('class')) {
      blockType = 'lesson';
    } else if (reasonLower.includes('clinic') || reasonLower.includes('camp')) {
      blockType = 'clinic';
    }

    // Create blocks via backend API for each selected court
    for (const courtNumber of selectedCourts) {
      const court = courts.find((c) => c.number === courtNumber);
      if (!court) {
        console.error(`[Admin] Court ${courtNumber} not found`);
        failCount++;
        continue;
      }

      try {
        const result = await backend.admin.createBlock({
          courtId: court.id,
          blockType: blockType,
          title: name,
          startsAt: block.startTime,
          endsAt: block.endTime,
          deviceId: TENNIS_CONFIG.DEVICES.ADMIN_ID,
          deviceType: 'admin',
        });

        if (result.ok) {
          console.log('[Admin] Created block via API:', result.block);
          successCount++;
        } else {
          console.error('[Admin] Failed to create block:', result.message);
          failCount++;
        }
      } catch (error) {
        console.error('[Admin] Error creating block:', error);
        failCount++;
      }
    }
  }

  if (failCount > 0) {
    showNotification(
      `Applied ${successCount} block(s), ${failCount} failed`,
      failCount === 0 ? 'success' : 'warning'
    );
  } else {
    showNotification(`Applied ${successCount} block(s) successfully`, 'success');
  }
}
