import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-800">{value}</span>
      </div>
      <p className="font-semibold text-gray-700 text-sm">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  const DEFAULT_STATUS_LABELS = {
    pending: 'ממתין לטיפול',
    in_progress: 'בטיפול',
    waiting_parts: 'ממתין לחלקים',
    ready: 'מוכן לאיסוף',
    collected: 'נאסף',
  };

  useEffect(() => {
    Promise.all([
      api.get('/repairs/stats'),
      api.get('/statuses'),
      api.get('/repairs', { params: { limit: 5, page: 1 } }),
    ]).then(([statsR, statusesR, repairsR]) => {
      setStats(statsR.data);
      setStatuses(statusesR.data);
      setRecentRepairs(repairsR.data.repairs);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusLabel = (key) => {
    const s = statuses.find(s => s.key === key);
    return s?.label || DEFAULT_STATUS_LABELS[key] || key;
  };

  const byStatus = stats?.by_status || [];

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">דשבורד</h1>
        <p className="text-gray-500 text-sm mt-1">סקירה כללית של פעילות התיקונים</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="תיקונים פתוחים"
          value={stats?.total_open ?? 0}
          icon="🔧"
          color="border-brand-200"
          sub="ללא נאספו"
        />
        <StatCard
          label="ממתין לטיפול"
          value={stats?.pending ?? 0}
          icon="⏳"
          color="border-orange-200"
        />
        <StatCard
          label="בטיפול"
          value={stats?.in_progress ?? 0}
          icon="🔵"
          color="border-blue-200"
        />
        <StatCard
          label="מוכן לאיסוף"
          value={stats?.ready ?? 0}
          icon="✅"
          color="border-green-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> פילוח לפי סטטוס
          </h2>
          {byStatus.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">אין נתונים</p>
          ) : (
            <div className="space-y-2.5">
              {byStatus.map(({ status, count }) => {
                const label = getStatusLabel(status);
                const total = byStatus.reduce((a, b) => a + b.count, 0);
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-sm font-bold text-gray-800">{count} <span className="font-normal text-gray-400 text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent repairs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>🕐</span> תיקונים אחרונים
            </h2>
            <Link to="/repairs" className="text-xs text-brand-500 hover:text-brand-700 font-medium">
              הצג הכל ←
            </Link>
          </div>
          {recentRepairs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">אין תיקונים עדיין</p>
          ) : (
            <div className="space-y-2">
              {recentRepairs.map(repair => {
                const st = statuses.find(s => s.key === repair.status);
                return (
                  <div key={repair.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{repair.customer_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{repair.repair_number}</p>
                    </div>
                    <StatusBadge status={repair.status} label={st?.label} color={st?.color} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link to="/new" className="bg-brand-500 text-white rounded-2xl p-5 hover:bg-brand-600 active:scale-[0.98] transition-all text-center shadow-md shadow-brand-200">
          <span className="text-2xl block mb-1">➕</span>
          <span className="font-semibold text-sm">תיקון חדש</span>
        </Link>
        <Link to="/repairs" className="bg-white border border-gray-200 rounded-2xl p-5 hover:bg-gray-50 active:scale-[0.98] transition-all text-center">
          <span className="text-2xl block mb-1">📋</span>
          <span className="font-semibold text-sm text-gray-700">כל התיקונים</span>
        </Link>
        <Link to="/statuses" className="bg-white border border-gray-200 rounded-2xl p-5 hover:bg-gray-50 active:scale-[0.98] transition-all text-center">
          <span className="text-2xl block mb-1">⚙️</span>
          <span className="font-semibold text-sm text-gray-700">ניהול סטטוסים</span>
        </Link>
      </div>
    </div>
  );
}
