import React from 'react';
import { Clock, Edit2, Copy, Trash2 } from '../components';
import { getStatusColor } from '../presenters/blockTimelinePresenter.js';

export interface TimelineBlock {
  id: string;
  courtNumber: number;
  startTime: string;
  endTime: string;
  reason?: string;
  title?: string;
  isRecurring?: boolean;
  recurrenceGroupId?: string | null;
  [key: string]: unknown;
}
interface BlockTimelineCardProps {
  block: TimelineBlock;
  status: string;
  onEdit: (block: TimelineBlock) => void;
  onDuplicate: (block: TimelineBlock) => void;
  onRemove: (block: TimelineBlock) => void | Promise<void>;
}
const BlockTimelineCard: React.FC<BlockTimelineCardProps> = function BlockTimelineCard({
  block,
  status,
  onEdit,
  onDuplicate,
  onRemove,
}) {
  const isEditable = status !== 'past';

  return (
    <div className={`p-4 rounded-lg border-2 ${getStatusColor(status)} transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-lg">Court {block.courtNumber}</span>
            <span className="px-2 py-1 bg-white/70 rounded text-sm font-medium">
              {block.title || block.reason}
            </span>
            {status === 'active' && (
              <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium animate-pulse">
                ACTIVE NOW
              </span>
            )}
            {block.isRecurring && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                Recurring
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} />
            <span>
              {new Date(block.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' - '}
              {new Date(block.endTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isEditable && (
            <>
              <button
                onClick={() => onEdit(block)}
                className="p-2 hover:bg-white/50 rounded transition-colors"
                title="Edit block"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDuplicate(block)}
                className="p-2 hover:bg-white/50 rounded transition-colors"
                title="Duplicate block"
              >
                <Copy size={16} />
              </button>
            </>
          )}
          <button
            onClick={() => onRemove(block)}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Remove block"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockTimelineCard;
