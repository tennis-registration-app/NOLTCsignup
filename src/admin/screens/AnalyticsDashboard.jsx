/**
 * AnalyticsDashboard Component
 *
 * Main analytics dashboard with court usage, ball purchases, and guest charges.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  UsageHeatmap,
  UtilizationChart,
  WaitTimeAnalysis,
  BallPurchaseLog,
  GuestChargeLog
} from '../analytics';

// Access global dependencies
const TENNIS_CONFIG = window.TENNIS_CONFIG || window.APP_UTILS?.TENNIS_CONFIG || {
  STORAGE: {
    ANALYTICS_KEY: 'tennisAnalytics',
    BALL_SALES_KEY: 'tennisBallPurchases',
    GUEST_CHARGES_KEY: 'tennisGuestCharges',
    UPDATE_EVENT: 'tennisDataUpdate'
  }
};
const EVENTS = window.APP_UTILS?.EVENTS || { UPDATE: 'tennisDataUpdate' };
const dataStore = window.TennisCourtDataStore ? new window.TennisCourtDataStore() : null;

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

const AnalyticsDashboard = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('usage');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });
  const [analyticsData, setAnalyticsData] = useState([]);
  const [waitlistData, setWaitlistData] = useState([]);
  const [ballPurchases, setBallPurchases] = useState([]);
  const [guestCharges, setGuestCharges] = useState([]);

  // Load data from localStorage with auto-refresh
  useEffect(() => {
    const loadAnalyticsData = async () => {
      // Load analytics data
      if (dataStore) {
        const storedAnalytics = await dataStore.get(TENNIS_CONFIG.STORAGE.ANALYTICS_KEY);
        if (storedAnalytics) {
          setAnalyticsData(storedAnalytics);
        }

      }

      // Load ball purchases - use localStorage as source of truth for real-time updates
      console.log('📊 Loading ball purchases...');
      const localStoragePurchases = localStorage.getItem(TENNIS_CONFIG.STORAGE.BALL_SALES_KEY);
      let ballPurchasesData = [];
      if (localStoragePurchases) {
        try { ballPurchasesData = JSON.parse(localStoragePurchases); }
        catch { /* transient partial write; use empty array */ }
      }
      console.log('📊 Ball purchases found:', ballPurchasesData.length);
      setBallPurchases(ballPurchasesData);

      // Load guest charges - use localStorage as source of truth for real-time updates
      console.log('📊 Loading guest charges...');
      const localStorageCharges = localStorage.getItem(TENNIS_CONFIG.STORAGE.GUEST_CHARGES_KEY);
      let guestChargesData = [];
      if (localStorageCharges) {
        try { guestChargesData = JSON.parse(localStorageCharges); }
        catch { /* transient partial write; use empty array */ }
      }

      console.log('📊 Guest charges found:', guestChargesData.length);
      setGuestCharges(guestChargesData);

      // Generate sample data if none exists (for testing)
      if (dataStore && !analyticsData.length) {
        const storedAnalytics = await dataStore.get(TENNIS_CONFIG.STORAGE.ANALYTICS_KEY);
        if (!storedAnalytics) {
          generateSampleAnalytics();
        }
      }
    };

    // Initial load
    loadAnalyticsData();

    // Set up event listener for real-time updates
    const handleDataUpdate = debounce(() => {
      console.log('📡 Analytics received data update event, reloading...');
      loadAnalyticsData();
    }, 150);

    window.addEventListener(TENNIS_CONFIG.STORAGE.UPDATE_EVENT, handleDataUpdate);
    window.addEventListener(EVENTS.UPDATE, handleDataUpdate);

    // Set up auto-refresh every 30 seconds as backup
    const refreshInterval = addTimer(setInterval(loadAnalyticsData, 30000));

    return () => {
      try { clearInterval(refreshInterval); } catch {}
      window.removeEventListener(TENNIS_CONFIG.STORAGE.UPDATE_EVENT, handleDataUpdate);
      window.removeEventListener('tennisDataUpdate', handleDataUpdate);
    };
  }, []);

  // Generate sample analytics data for testing
  const generateSampleAnalytics = () => {
    const sampleData = [];
    const now = new Date();

    for (let days = 0; days < 30; days++) {
      const date = new Date(now);
      date.setDate(date.getDate() - days);

      // Generate 20-40 sessions per day
      const sessionsPerDay = 20 + Math.floor(Math.random() * 20);

      for (let i = 0; i < sessionsPerDay; i++) {
        const hour = 7 + Math.floor(Math.random() * 14); // 7 AM to 9 PM
        const startTime = new Date(date);
        startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        sampleData.push({
          id: `session_${days}_${i}`,
          courtNumber: Math.floor(Math.random() * 12) + 1,
          startTime: startTime.toISOString(),
          duration: 60 + Math.floor(Math.random() * 60), // 60-120 minutes
          playerCount: Math.floor(Math.random() * 3) + 2, // 2-4 players
          dayOfWeek: startTime.getDay(),
          hourOfDay: startTime.getHours()
        });
      }
    }

    if (dataStore) {
      dataStore.set(TENNIS_CONFIG.STORAGE.ANALYTICS_KEY, sampleData, { immediate: true });
    }
    setAnalyticsData(sampleData);
  };

  // Filter data by date range
  const filteredAnalytics = useMemo(() => {
    return analyticsData.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
  }, [analyticsData, dateRange]);

  const handleDateRangeChange = (preset) => {
    const end = new Date();
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
              {['today', 'week', 'month', 'year'].map(preset => (
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
                onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
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
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Court Usage
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'purchases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ball Purchases
            </button>
            <button
              onClick={() => setActiveTab('guests')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UtilizationChart analyticsData={filteredAnalytics} dateRange={dateRange} />
              <WaitTimeAnalysis waitlistData={waitlistData} />
            </div>
            <UsageHeatmap analyticsData={filteredAnalytics} />
          </div>
        )}

        {activeTab === 'purchases' && (
          <BallPurchaseLog purchases={ballPurchases} dateRange={dateRange} />
        )}

        {activeTab === 'guests' && (
          <GuestChargeLog charges={guestCharges} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
