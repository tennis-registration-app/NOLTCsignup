/**
 * AnalyticsDashboard Component
 *
 * Main analytics dashboard with court usage, ball purchases, and guest charges.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UsageHeatmap,
  UtilizationChart,
  WaitTimeAnalysis,
  BallPurchaseLog,
  GuestChargeLog,
  WaitlistHeatmap,
  useAnalyticsQuery,
  useUsageComparisonQuery,
  UsageComparisonControls,
  UsageComparisonChart,
} from '../analytics';
import { logger } from '../../lib/logger.js';

// Access global dependencies
const TENNIS_CONFIG = window.TENNIS_CONFIG ||
  window.APP_UTILS?.TENNIS_CONFIG || {
    STORAGE: {
      UPDATE_EVENT: 'tennisDataUpdate',
    },
  };
const EVENTS = window.APP_UTILS?.EVENTS || { UPDATE: 'tennisDataUpdate' };

// Debounce helper
const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

// Timer management
const _timers = [];
const addTimer = (id) => {
  _timers.push({ id, type: 'interval' });
  return id;
};

const AnalyticsDashboard = ({ onClose, backend }) => {
  // Helper to set time to end of day (23:59:59.999)
  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const [activeTab, setActiveTab] = useState('usage');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: endOfDay(new Date()),
  });
  const [ballPurchases, setBallPurchases] = useState([]);
  const [guestCharges, setGuestCharges] = useState([]);

  // Usage Comparison state
  const [usageMetric, setUsageMetric] = useState('usage');
  const [usagePrimaryStart, setUsagePrimaryStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [usagePrimaryEnd, setUsagePrimaryEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [usageGranularity, setUsageGranularity] = useState('auto');
  const [usageComparisonEnabled, setUsageComparisonEnabled] = useState(false);
  const [usageComparisonStart, setUsageComparisonStart] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });

  // Unified analytics data via hook
  const getAnalyticsFn = useCallback(
    (params) => backend?.admin?.getAnalytics(params) || Promise.resolve({ ok: false }),
    [backend]
  );
  const {
    data: analyticsResult,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAnalyticsQuery(getAnalyticsFn, dateRange);

  // Usage Comparison data
  const {
    data: usageComparisonData,
    loading: usageComparisonLoading,
    error: usageComparisonError,
    effectiveGranularity,
  } = useUsageComparisonQuery({
    metric: usageMetric,
    primaryStart: usagePrimaryStart,
    primaryEnd: usagePrimaryEnd,
    granularity: usageGranularity,
    comparisonStart: usageComparisonEnabled ? usageComparisonStart : null,
  });

  // Calculate comparison end date for display
  const comparisonEnd = useMemo(() => {
    if (
      !usageComparisonEnabled ||
      !usageComparisonStart ||
      !usagePrimaryStart ||
      !usagePrimaryEnd
    ) {
      return null;
    }
    const primaryDays = Math.ceil(
      (new Date(usagePrimaryEnd) - new Date(usagePrimaryStart)) / (1000 * 60 * 60 * 24)
    );
    const endDate = new Date(usageComparisonStart);
    endDate.setDate(endDate.getDate() + primaryDays);
    return endDate.toISOString().split('T')[0];
  }, [usageComparisonEnabled, usageComparisonStart, usagePrimaryStart, usagePrimaryEnd]);

  // Load transactions data
  useEffect(() => {
    const loadTransactionsData = async () => {
      // Load ball purchases from API
      logger.debug('AdminAnalytics', 'Loading ball purchases...');
      let ballPurchasesData = [];
      if (backend) {
        try {
          const result = await backend.admin.getTransactions({ type: 'ball_purchase', limit: 500 });
          logger.debug('AdminAnalytics', 'Ball purchases result', result);
          if (result.ok && result.transactions) {
            // Transform API response to match expected shape
            ballPurchasesData = result.transactions.map((t) => ({
              id: t.id,
              timestamp: t.date + 'T' + (t.time || '00:00:00'),
              memberNumber: t.member_number,
              memberName: t.account_name || 'Unknown',
              amount: parseFloat(t.amount_dollars) || t.amount_cents / 100,
            }));
          }
        } catch (err) {
          logger.error('AdminAnalytics', 'Failed to fetch ball purchases', err);
        }
      }
      logger.debug('AdminAnalytics', 'Ball purchases found', ballPurchasesData.length);
      setBallPurchases(ballPurchasesData);

      // Load guest charges from API
      logger.debug('AdminAnalytics', 'Loading guest charges...');
      let guestChargesData = [];
      if (backend) {
        try {
          const result = await backend.admin.getTransactions({ type: 'guest_fee', limit: 500 });
          if (result.ok && result.transactions) {
            // Transform API response to match expected shape
            guestChargesData = result.transactions.map((t) => ({
              id: t.id,
              timestamp: t.date + 'T' + (t.time || '00:00:00'),
              sponsorNumber: t.member_number,
              sponsorName: t.account_name || 'Unknown',
              amount: parseFloat(t.amount_dollars) || t.amount_cents / 100,
              guestName: t.description || 'Guest',
            }));
          }
        } catch (err) {
          logger.error('AdminAnalytics', 'Failed to fetch guest charges', err);
        }
      }
      logger.debug('AdminAnalytics', 'Guest charges found', guestChargesData.length);
      setGuestCharges(guestChargesData);
    };

    // Initial load
    loadTransactionsData();

    // Set up event listener for real-time updates
    const handleDataUpdate = debounce(() => {
      logger.debug('AdminAnalytics', 'Received data update event, reloading...');
      loadTransactionsData();
    }, 150);

    window.addEventListener(TENNIS_CONFIG.STORAGE.UPDATE_EVENT, handleDataUpdate);
    window.addEventListener(EVENTS.UPDATE, handleDataUpdate);

    // Set up auto-refresh every 30 seconds as backup
    const refreshInterval = addTimer(setInterval(loadTransactionsData, 30000));

    return () => {
      try {
        clearInterval(refreshInterval);
      } catch {
        // Interval may already be cleared
      }
      window.removeEventListener(TENNIS_CONFIG.STORAGE.UPDATE_EVENT, handleDataUpdate);
      window.removeEventListener('tennisDataUpdate', handleDataUpdate);
    };
  }, [backend]);

  const handleDateRangeChange = (preset) => {
    const end = endOfDay(new Date());
    let start = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        break;
    }

    setDateRange({ start, end });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Date Range:</span>
            <div className="flex gap-2">
              {['today', 'week', 'month', 'year'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDateRangeChange(preset)}
                  className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm capitalize"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                className="px-2 py-1 border rounded text-sm"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: endOfDay(new Date(e.target.value)) })
                }
                className="px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-4 px-2 border-b-2 font-semibold text-base ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Court Usage
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-4 px-2 border-b-2 font-semibold text-base ${
                activeTab === 'purchases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ball Purchases
            </button>
            <button
              onClick={() => setActiveTab('guests')}
              className={`py-4 px-2 border-b-2 font-semibold text-base ${
                activeTab === 'guests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Guest Charges
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-testid="admin-analytics-charts"
      >
        {activeTab === 'usage' && (
          <div className="space-y-6">
            {analyticsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Error loading analytics: {analyticsError}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UtilizationChart
                summary={analyticsResult?.summary}
                loading={analyticsLoading}
                dateRange={dateRange}
              />
              <WaitTimeAnalysis
                waitlistData={analyticsResult?.waitlist || []}
                loading={analyticsLoading}
              />
            </div>
            {/* Heatmaps row - side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UsageHeatmap heatmapData={analyticsResult?.heatmap || []} />
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Waitlist Congestion</h3>
                <WaitlistHeatmap heatmapData={analyticsResult?.waitlistHeatmap || []} />
              </div>
            </div>

            {/* Usage Comparison Section */}
            <div className="mt-8">
              <UsageComparisonControls
                metric={usageMetric}
                onMetricChange={setUsageMetric}
                primaryStart={usagePrimaryStart}
                primaryEnd={usagePrimaryEnd}
                onPrimaryStartChange={setUsagePrimaryStart}
                onPrimaryEndChange={setUsagePrimaryEnd}
                granularity={usageGranularity}
                onGranularityChange={setUsageGranularity}
                comparisonEnabled={usageComparisonEnabled}
                onComparisonEnabledChange={setUsageComparisonEnabled}
                comparisonStart={usageComparisonStart}
                onComparisonStartChange={setUsageComparisonStart}
                effectiveGranularity={effectiveGranularity}
                comparisonEnd={comparisonEnd}
              />
              <div className="mt-4">
                <UsageComparisonChart
                  data={usageComparisonData}
                  loading={usageComparisonLoading}
                  error={usageComparisonError}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <BallPurchaseLog purchases={ballPurchases} dateRange={dateRange} />
        )}

        {activeTab === 'guests' && <GuestChargeLog charges={guestCharges} dateRange={dateRange} />}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
