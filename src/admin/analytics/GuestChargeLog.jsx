/**
 * GuestChargeLog Component
 *
 * Displays and exports guest charge history.
 */
import React, { useState, useMemo } from 'react';
import { Download } from '../components';

// Helper function for formatting date/time
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function for CSV download
const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
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

const GuestChargeLog = ({ charges, dateRange }) => {
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredCharges = useMemo(() => {
    return charges.filter(charge => {
      const chargeDate = new Date(charge.timestamp);
      return chargeDate >= dateRange.start && chargeDate <= dateRange.end;
    });
  }, [charges, dateRange]);

  const sortedCharges = useMemo(() => {
    return [...filteredCharges].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [filteredCharges, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const exportData = sortedCharges.map(charge => ({
      'Date/Time': formatDateTime(charge.timestamp),
      'Guest Name': charge.guestName || 'Unknown',
      'Sponsor Name': charge.sponsorName || 'Unknown',
      'Sponsor #': charge.sponsorNumber || '****',
      'Amount': `$${(charge.amount || 15.00).toFixed(2)}`
    }));

    const filename = `guest_charges_${dateRange.start.toISOString().split('T')[0]}_to_${dateRange.end.toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, filename);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Guest Charge Log</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
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
                onClick={() => handleSort('guestName')}
              >
                Guest Name {sortField === 'guestName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('sponsorName')}
              >
                Sponsor Name {sortField === 'sponsorName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('sponsorNumber')}
              >
                Sponsor # {sortField === 'sponsorNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
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
            {sortedCharges.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No guest charges in selected date range
                </td>
              </tr>
            ) : (
              sortedCharges.map((charge, index) => (
                <tr key={charge.id || index} className="border-b hover:bg-gray-50">
                  <td className="p-2">{formatDateTime(charge.timestamp)}</td>
                  <td className="p-2">{charge.guestName || 'Unknown'}</td>
                  <td className="p-2">{charge.sponsorName || 'Unknown'}</td>
                  <td className="p-2">{charge.sponsorNumber || '****'}</td>
                  <td className="p-2">${(charge.amount || 15.00).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {sortedCharges.length} guest charge{sortedCharges.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default GuestChargeLog;
