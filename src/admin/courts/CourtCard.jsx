/**
 * CourtCard — single court tile in the status grid.
 * Pure presentational component extracted from CourtStatusGrid.
 */
import React from 'react';
import { Edit2, X, RefreshCw } from '../components';
import { getStatusColor, formatTimeRemaining, getPlayerNames } from './courtStatusUtils.js';

const CourtCard = ({
  courtNum,
  status,
  info,
  currentTime,
  movingFrom,
  showActionsMenu,
  handlers,
}) => {
  const { onToggleActions, onWetToggle, onMoveTarget, onEditClick, onClearCourt, onInitiateMove } =
    handlers;

  const isMoving = movingFrom === courtNum;
  const canReceiveMove = movingFrom && movingFrom !== courtNum && status === 'available';

  return (
    <div
      className={`p-3 rounded-lg border-2 ${getStatusColor(status)} ${
        isMoving ? 'ring-2 ring-blue-500' : ''
      } ${canReceiveMove ? 'cursor-pointer hover:bg-green-200' : ''}
                ${status === 'wet' ? 'cursor-pointer hover:bg-gray-300' : ''}
                min-h-[120px] h-[120px] flex flex-col justify-between relative`}
      onClick={
        canReceiveMove
          ? () => {
              onMoveTarget(Number(movingFrom), Number(courtNum));
            }
          : status === 'wet'
            ? () => {
                onWetToggle(courtNum);
              }
            : undefined
      }
    >
      <div>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-lg">Court {courtNum}</h4>
          {status !== 'available' && status !== 'wet' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleActions(courtNum);
              }}
              className="p-1 hover:bg-white/50 rounded"
            >
              <span style={{ fontSize: '18px' }}>☰</span>
            </button>
          )}
        </div>

        {(status === 'occupied' || status === 'overtime') && info && (
          <div
            className={`text-xs font-medium ${
              status === 'overtime' ? 'text-red-600' : 'text-blue-600'
            }`}
          >
            {formatTimeRemaining(info.endTime, currentTime)}
          </div>
        )}

        {info && (
          <div className="mt-1">
            {status === 'wet' && (
              <>
                <p className="font-medium text-sm">💧 WET COURT</p>
                <p className="text-xs text-gray-600">Click to mark dry</p>
              </>
            )}
            {status === 'blocked' && (
              <>
                <p className="font-medium text-sm truncate">{info.reason}</p>
                <p className="text-xs text-gray-600">
                  Until{' '}
                  {new Date(info.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </>
            )}
            {(status === 'occupied' || status === 'overtime') && (
              <>
                <p className="font-medium text-sm truncate">{getPlayerNames(info.players)}</p>
                <p className="text-xs text-gray-600">
                  Since{' '}
                  {new Date(info.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </>
            )}
          </div>
        )}

        {canReceiveMove && (
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-green-700">Click to move here</p>
          </div>
        )}
      </div>

      {showActionsMenu && status !== 'available' && status !== 'wet' && (
        <div className="absolute top-12 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          {status !== 'blocked' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInitiateMove(courtNum);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={14} />
                Move Players
              </div>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(courtNum, info);
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
          >
            <div className="flex items-center gap-2">
              <Edit2 size={14} />
              Edit {info.type === 'block' ? 'Block' : 'Game'}
            </div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearCourt(courtNum);
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
          >
            <div className="flex items-center gap-2">
              <X size={14} />
              Clear Court
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default CourtCard;
