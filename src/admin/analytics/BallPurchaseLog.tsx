/**
 * BallPurchaseLog Component
 *
 * Displays and exports ball purchase history.
 */
import React, { useState, useMemo } from 'react';
import { Download } from '../components';
import { useAdminNotification } from '../context/NotificationContext';


interface BallPurchasePlayer {
  memberNumber?: string;
  name?: string;
}

interface BallPurchase {
  id?: string;
  timestamp: string;
  memberNumber?: string;
  memberName?: string;
  amount?: number;
  players?: BallPurchasePlayer[];
  [key: string]: unknown;
}

interface DateRange {
  start: Date;
  end: Date;
}

// Helper function for formatting date/time
const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function for CSV download
const downloadCSV = (data: Record<string, string>[], filename: string, notify: (msg: string, type: string) => void): void => {
  if (!data || data.length === 0) {
    notify('No data to export', 'error');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map((row: Record<string, string>) =>
    headers
      .map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  const csv = [csvHeaders, ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const BallPurchaseLog = ({ purchases, dateRange }: { purchases: BallPurchase[]; dateRange: DateRange }) => {
  const showNotification = useAdminNotification();
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase: BallPurchase) => {
      const purchaseDate = new Date(purchase.timestamp);
      return purchaseDate >= dateRange.start && purchaseDate <= dateRange.end;
    });
  }, [purchases, dateRange]);

  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a: BallPurchase, b: BallPurchase) => {
      let aVal: unknown = a[sortField];
      let bVal: unknown = b[sortField];

      if (sortField === 'timestamp') {
        aVal = new Date(aVal as string);
        bVal = new Date(bVal as string);
      }

      if (sortOrder === 'asc') {
        return (aVal as number | Date) > (bVal as number | Date) ? 1 : -1;
      } else {
        return (aVal as number | Date) < (bVal as number | Date) ? 1 : -1;
      }
    });
  }, [filteredPurchases, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const exportData = sortedPurchases.flatMap((purchase: BallPurchase) => {
      // Handle old format (single memberNumber/memberName fields)
      if (!purchase.players || purchase.players.length === 0) {
        return {
          'Date/Time': formatDateTime(purchase.timestamp),
          'Member Number': purchase.memberNumber || '****',
          'Member Name': purchase.memberName || 'Unknown',
          Amount: `$${(purchase.amount || 0).toFixed(2)}`,
        };
      }

      // For new format with players array, create a row for each player
      return purchase.players.map((player: BallPurchasePlayer) => ({
        'Date/Time': formatDateTime(purchase.timestamp),
        'Member Number': player.memberNumber || '****',
        'Member Name': player.name || 'Unknown',
        Amount: `$${(purchase.amount || 0).toFixed(2)}`,
      }));
    });

    const filename = `ball_purchases_${dateRange.start.toISOString().split('T')[0]}_to_${dateRange.end.toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, filename, showNotification);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ball Purchase Log</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('timestamp')}
              >
                Date/Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('memberNumber')}
              >
                Member # {sortField === 'memberNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('memberName')}
              >
                Member Name {sortField === 'memberName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('amount')}
              >
                Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPurchases.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  No purchases in selected date range
                </td>
              </tr>
            ) : (
              sortedPurchases.flatMap((purchase: BallPurchase, purchaseIndex: number) => {
                // Handle old format (single memberNumber/memberName fields)
                if (!purchase.players || purchase.players.length === 0) {
                  return (
                    <tr key={purchase.id || purchaseIndex} className="border-b hover:bg-gray-50">
                      <td className="p-2">{formatDateTime(purchase.timestamp)}</td>
                      <td className="p-2">{purchase.memberNumber || '****'}</td>
                      <td className="p-2">{purchase.memberName || 'Unknown'}</td>
                      <td className="p-2">${(purchase.amount || 0).toFixed(2)}</td>
                    </tr>
                  );
                }

                // For new format with players array, create a row for each player
                return purchase.players.map((player: BallPurchasePlayer, playerIndex: number) => (
                  <tr
                    key={`${purchase.id || purchaseIndex}-${playerIndex}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-2">{formatDateTime(purchase.timestamp)}</td>
                    <td className="p-2">{player.memberNumber || '****'}</td>
                    <td className="p-2">{player.name || 'Unknown'}</td>
                    <td className="p-2">${(purchase.amount || 0).toFixed(2)}</td>
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing{' '}
        {sortedPurchases.reduce((count: number, purchase: BallPurchase) => {
          if (purchase.players && purchase.players.length > 0) {
            return count + purchase.players.length;
          }
          return count + 1;
        }, 0)}{' '}
        charges from {sortedPurchases.length} purchase{sortedPurchases.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default BallPurchaseLog;
