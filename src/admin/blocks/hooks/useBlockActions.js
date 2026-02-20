import { expandRecurrenceDates } from '../utils/expandRecurrenceDates';
import { getEventTypeFromReason } from '../../calendar/utils.js';
import { logger } from '../../../lib/logger.js';

/**
 * Block management action handlers.
 * Reads form state from the useBlockForm hook and domain objects from props.
 */
export function useBlockActions({ form, backend, onApplyBlocks, onNotification }) {
  const {
    selectedCourts,
    blockReason,
    startTime,
    endTime,
    selectedDate,
    recurrence,
    isEvent,
    eventType,
    eventTitle,
    editingBlock,
    setSelectedCourts,
    setBlockReason,
    setStartTime,
    setEndTime,
    setActiveView,
    setShowTemplates,
    setShowCustomReason,
    setIsEvent,
    setEventType,
    setEventTitle,
    setSelectedBlock,
    setRefreshTrigger,
    resetForm,
  } = form;

  const handleTemplateSelect = (template) => {
    setBlockReason(template.reason);
    if (template.duration) {
      setStartTime('now');
      const end = new Date();
      end.setMinutes(end.getMinutes() + template.duration);
      setEndTime(end.toTimeString().slice(0, 5));
    } else {
      setStartTime(template.startTime);
      setEndTime(template.endTime);
    }
    setShowTemplates(false);
  };

  const handleRemoveBlock = async (blockId) => {
    if (!backend) {
      logger.error('BlockManager', 'No backend available for delete');
      onNotification('Backend not available', 'error');
      return;
    }

    try {
      const result = await backend.admin.cancelBlock({
        blockId: blockId,
      });

      if (result.ok) {
        logger.debug('BlockManager', 'Block deleted successfully');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        logger.error('BlockManager', 'Failed to delete block', result.message);
        onNotification('Failed to delete block: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      logger.error('BlockManager', 'Error deleting block', error);
      onNotification('Error deleting block: ' + error.message, 'error');
    }
  };

  const handleBlockCourts = () => {
    const blocks = expandRecurrenceDates(selectedDate, recurrence);
    const now = new Date();

    const appliedBlocks = [];

    blocks.forEach((blockInfo) => {
      selectedCourts.forEach((courtNum) => {
        let actualStartTime;
        if (startTime === 'now') {
          actualStartTime = now;
        } else {
          actualStartTime = new Date(blockInfo.date);
          const [hours, minutes] = startTime.split(':');
          actualStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        const actualEndTime = new Date(blockInfo.date);
        const [endHours, endMinutes] = endTime.split(':');
        actualEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (actualEndTime < actualStartTime) {
          actualEndTime.setDate(actualEndTime.getDate() + 1);
        }

        appliedBlocks.push({
          id: Date.now().toString() + Math.random(),
          courtNumber: courtNum,
          reason: blockReason,
          title: eventTitle || blockReason, // Always preserve the title
          startTime: actualStartTime.toISOString(),
          endTime: actualEndTime.toISOString(),
          isEvent: isEvent,
          eventDetails: isEvent
            ? {
                title: eventTitle || blockReason,
                type: eventType,
                courts: selectedCourts,
              }
            : null,
          createdAt: new Date().toISOString(),
        });
      });
    });

    // If editing, remove the old block first
    if (editingBlock) {
      handleRemoveBlock(editingBlock.id);
    }

    logger.debug('BlockManager', 'Sending to applyBlocks', appliedBlocks);
    onApplyBlocks(appliedBlocks);

    resetForm();
  };

  const toggleCourtSelection = (courtNum) => {
    setSelectedCourts((prev) =>
      prev.includes(courtNum) ? prev.filter((c) => c !== courtNum) : [...prev, courtNum]
    );
  };

  const handleEditBlock = (block) => {
    setSelectedBlock(block);
  };

  const handleDuplicateBlock = (block) => {
    setSelectedCourts([]);
    setBlockReason(block.reason);

    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const durationMs = end.getTime() - start.getTime();

    setStartTime('now');
    const newEnd = new Date(Date.now() + durationMs);
    setEndTime(newEnd.toTimeString().slice(0, 5));

    setActiveView('create');
  };

  const handleQuickReason = (reason) => {
    setBlockReason(reason);

    // Auto-set event type based on reason
    const autoEventType = getEventTypeFromReason(reason);
    if (autoEventType) {
      setEventType(autoEventType);
      setIsEvent(true); // Default to showing on calendar
      // Auto-generate event title
      if (!eventTitle || eventTitle.includes('(Copy)')) {
        setEventTitle(reason.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()));
      }
    } else {
      // Only WET COURT and similar should be hidden by default
      setIsEvent(false);
      setEventTitle('');
    }
  };

  // Wrapper for quick reason selection (calls handleQuickReason + clears custom mode)
  const handleQuickReasonSelect = (reason) => {
    handleQuickReason(reason);
    setShowCustomReason(false);
  };

  // Wrapper for "Other" button (enables custom mode + clears reason)
  const handleOtherClick = () => {
    setShowCustomReason(true);
    setBlockReason('');
  };

  return {
    handleTemplateSelect,
    handleBlockCourts,
    handleRemoveBlock,
    toggleCourtSelection,
    handleEditBlock,
    handleDuplicateBlock,
    handleQuickReasonSelect,
    handleOtherClick,
  };
}
