import { expandRecurrenceDates } from '../utils/expandRecurrenceDates';
import { getEventTypeFromReason } from '../../calendar/utils';
import { logger } from '../../../lib/logger';

/**
 * Block management action handlers.
 * Reads form state from the useBlockForm hook and domain objects from props.
 */
interface BlockFormState {
  selectedCourts: number[];
  blockReason: string;
  startTime: string;
  endTime: string;
  selectedDate: Date;
  recurrence: { pattern: string; frequency: number; endType: string; occurrences?: number; endDate?: string; daysOfWeek?: number[] } | null;
  isEvent: boolean;
  eventType: string;
  eventTitle: string;
  editingBlock: Record<string, unknown> | null;
  setSelectedCourts: (v: number[] | ((p: number[]) => number[])) => void;
  setBlockReason: (v: string) => void;
  setStartTime: (v: string) => void;
  setEndTime: (v: string) => void;
  setActiveView: (v: string) => void;
  setShowTemplates: (v: boolean) => void;
  setShowCustomReason: (v: boolean) => void;
  setIsEvent: (v: boolean) => void;
  setEventType: (v: string) => void;
  setEventTitle: (v: string) => void;
  setSelectedBlock: (v: Record<string, unknown> | null) => void;
  setRefreshTrigger: (v: number | ((p: number) => number)) => void;
  resetForm: () => void;
}

type AdminBackend = { admin: { cancelBlock: (opts: {blockId: string}) => Promise<{ok: boolean; message?: string; cancelledCount?: number}>; cancelBlockGroup: (opts: {recurrenceGroupId: string; futureOnly: boolean}) => Promise<{ok: boolean; message?: string; cancelledCount?: number}> } };

export function useBlockActions({ form, backend, onApplyBlocks, onNotification }: {
  form: BlockFormState;
  backend: AdminBackend | null;
  onApplyBlocks: (blocks: unknown[]) => void;
  onNotification: (msg: string, type: string) => void;
}) {
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
      const now = new Date();
      setStartTime(now.toTimeString().slice(0, 5));
      const end = new Date(now);
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
      return false;
    }

    try {
      const result = await backend.admin.cancelBlock({
        blockId: blockId,
      });

      if (result.ok) {
        logger.debug('BlockManager', 'Block deleted successfully');
        setRefreshTrigger((prev) => prev + 1);
        return true;
      } else {
        logger.error('BlockManager', 'Failed to delete block', result.message);
        onNotification('Failed to delete block: ' + (result.message || 'Unknown error'), 'error');
        return false;
      }
    } catch (error) {
      logger.error('BlockManager', 'Error deleting block', error);
      onNotification('Error deleting block: ' + error.message, 'error');
      return false;
    }
  };

  const handleRemoveBlockGroup = async (recurrenceGroupId, futureOnly) => {
    if (!backend) {
      logger.error('BlockManager', 'No backend available for group delete');
      onNotification('Backend not available', 'error');
      return false;
    }

    try {
      const result = await backend.admin.cancelBlockGroup({
        recurrenceGroupId,
        futureOnly,
      });

      if (result.ok) {
        logger.debug('BlockManager', 'Block group deleted', {
          cancelledCount: result.cancelledCount,
        });
        onNotification(`Cancelled ${result.cancelledCount} blocks`, 'success');
        setRefreshTrigger((prev) => prev + 1);
        return true;
      } else {
        logger.error('BlockManager', 'Failed to delete block group', result.message);
        onNotification('Failed to delete blocks: ' + (result.message || 'Unknown error'), 'error');
        return false;
      }
    } catch (error) {
      logger.error('BlockManager', 'Error deleting block group', error);
      onNotification('Error deleting blocks: ' + error.message, 'error');
      return false;
    }
  };

  const handleBlockCourts = async () => {
    const blocks = expandRecurrenceDates(selectedDate, recurrence);
    const appliedBlocks: unknown[] = [];
    const groupId = recurrence ? crypto.randomUUID() : null;

    blocks.forEach((blockInfo) => {
      selectedCourts.forEach((courtNum) => {
        const actualStartTime = new Date(blockInfo.date);
        const [hours, minutes] = startTime.split(':');
        actualStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const actualEndTime = new Date(blockInfo.date);
        const [endHours, endMinutes] = endTime.split(':');
        actualEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        if (actualEndTime < actualStartTime) {
          actualEndTime.setDate(actualEndTime.getDate() + 1);
        }

        appliedBlocks.push({
          id: crypto.randomUUID(),
          courtNumber: courtNum,
          reason: blockReason,
          title: eventTitle || blockReason, // Always preserve the title
          startTime: actualStartTime.toISOString(),
          endTime: actualEndTime.toISOString(),
          recurrenceGroupId: groupId,
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

    // If editing, remove the old block first — abort if cancel fails to prevent ghost duplicates
    if (editingBlock) {
      const removed = await handleRemoveBlock((editingBlock as {id: string}).id);
      if (!removed) return;
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

    const nowTime = new Date();
    setStartTime(nowTime.toTimeString().slice(0, 5));
    const newEnd = new Date(nowTime.getTime() + durationMs);
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
    handleRemoveBlockGroup,
    toggleCourtSelection,
    handleEditBlock,
    handleDuplicateBlock,
    handleQuickReasonSelect,
    handleOtherClick,
  };
}
