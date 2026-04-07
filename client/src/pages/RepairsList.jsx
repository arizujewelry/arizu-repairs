import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import RepairModal from '../components/RepairModal';
import EditRepairModal from '../components/EditRepairModal';
import Toast from '../components/Toast';

export default function RepairsList() {
  const [repairs, setRepairs]     = useState([]);
  const [statuses, setStatuses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);

  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 30;

  const [selected, setSelected]   = useState(null); // view modal
  const [editing, setEditing]     = useState(null);  // edit modal
  const [deleteId, setDeleteId]   = useState(null);
  const [toast, setToast]         = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchStatuses = async () => {
    try {
      const r = await api.get('/statuses');
      setStatuses(r.data);
    } catch {}
  };

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search)       params.search    = search;
      if (filterStatus) params.status    = filterStatus;
      if (dateFrom)     params.date_from = dateFrom;
      if (dateTo)       params.date_to   = dateTo;

      const r = await api.get('/repairs', { params });
      setRepairs(r.data.repairs);
      setTotal(r.data.total);
    } catch (err) {
      setToast({ message: 'שגיאה בטעינת התיקונים', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, dateFrom, dateTo, page]);

  useEffect(() => { fetchStatuses(); }, []);
  useEffect(() => {
    const t = setTimeout(fetchRepairs, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchRepairs]);

  // When filters change, reset to page 1
  useEffect(() => { setPage(1); }, [search, filterStatus, dateFrom, dateTo]);

  const getStatusObj = (key) => statuses.find(s => s.key === key) || { key, label: key, color: '#6B7280' };

  const handleStatusChange = async (repairId, newStatus) => {
    try {
      await api.put(`/repairs/${repairId}`, { status: newStatus });
      setRepairs(prev => prev.map(r => r.id === repairId ? { ...r, status: newStatus } : r));
      setToast({ message: 'סטטוס עודכן', type: 'success' });
    } catch {
      setToast({ message: 'שגיאה בעדכון הסטטוס', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/repairs/${deleteId}`);
      setRepairs(prev => prev.filter(r => r.id !== deleteId));
      setTotal(p => p - 1);
      setDeleteId(null);
      setToast({ message: 'התיקון נמחק', type: 'info' });
    } catch {
      setToast({ message: 'שגיאה במחיקה', type: 'error' });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (search)       params.search    = search;
      if (filterStatus) params.status    = filterStatus;
      if (dateFrom)     params.date_from = dateFrom;
      if (dateTo)       params.date_to   = dateTo;

      const r = await api.get('/repairs/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arizu-repairs-${new Date().toLocaleDateString('he-IL').replace(/\//g,'-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: 'הקובץ הורד בהצלחה', type: 'success' });
    } catch {
      setToast({ message: 'שגיאה בייצוא', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo('');
  };
  const hasFilters = search || filterStatus || dateFrom || dateTo;

  const formatDate = d => d ? new Date(d).toLocaleDateString('he-IL') : '—';

  const openViewModal = async (repair) => {
    try {
      const r = await api.get(`/repairs/${repair.id}`);
      setSelected(r.data);
    } catch {
      setSelected(repair);
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">תיקונים</h1>
          <p className="text-gray-400 text-sm">{total} תיקונים{hasFilters ? ' (מסונן)' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'מייצא...' : 'Excel'}
          </button>
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              hasFilters
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            סינון
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, מספר תיקון, טלפון, דגם..."
          className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
        />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3 fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">סטטוס</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">הכל</option>
                {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">מתאריך</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">עד תאריך</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
              >
                נקה סינון
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : repairs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">לא נמצאו תיקונים</p>
          {hasFilters && <p className="text-sm mt-1">נסה לשנות את הסינון</p>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-50 text-brand-700 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-right font-semibold">מספר</th>
                    <th className="px-4 py-3 text-right font-semibold">לקוח</th>
                    <th className="px-4 py-3 text-right font-semibold">טלפון</th>
                    <th className="px-4 py-3 text-right font-semibold">דגם</th>
                    <th className="px-4 py-3 text-right font-semibold">תאריך</th>
                    <th className="px-4 py-3 text-right font-semibold">תשלום</th>
                    <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
                    <th className="px-4 py-3 text-right font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {repairs.map(repair => {
                    const st = getStatusObj(repair.status);
                    return (
                      <tr key={repair.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand-600 whitespace-nowrap">{repair.repair_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{repair.customer_name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{repair.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{repair.model || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(repair.received_date)}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{repair.payment || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={repair.status}
                            onChange={e => handleStatusChange(repair.id, e.target.value)}
                            className="text-xs border-0 bg-transparent focus:outline-none cursor-pointer"
                            style={{ direction: 'rtl' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openViewModal(repair)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                              title="צפה בפרטים"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditing(repair)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                              title="ערוך"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteId(repair.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="מחק"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {repairs.map(repair => {
              const st = getStatusObj(repair.status);
              return (
                <div key={repair.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-brand-600 font-mono text-sm">{repair.repair_number}</p>
                      <p className="font-semibold text-gray-800 text-base">{repair.customer_name}</p>
                    </div>
                    <StatusBadge status={repair.status} label={st.label} color={st.color} />
                  </div>
                  {repair.model && <p className="text-sm text-gray-500 mb-1">📦 {repair.model}</p>}
                  {repair.phone && <p className="text-sm text-gray-500 mb-1">📞 {repair.phone}</p>}
                  <p className="text-xs text-gray-400 mb-3">📅 {formatDate(repair.received_date)}{repair.payment ? ` · 💰 ${repair.payment}` : ''}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openViewModal(repair)}
                      className="flex-1 py-2 text-sm font-medium rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50"
                    >
                      פרטים
                    </button>
                    <button
                      onClick={() => setEditing(repair)}
                      className="flex-1 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      עריכה
                    </button>
                    <div className="flex-1">
                      <select
                        value={repair.status}
                        onChange={e => handleStatusChange(repair.id, e.target.value)}
                        className="w-full py-2 text-sm rounded-xl border border-gray-200 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 text-center"
                      >
                        {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
              >
                הקודם
              </button>
              <span className="text-sm text-gray-500">עמוד {page} מתוך {Math.ceil(total / LIMIT)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
              >
                הבא
              </button>
            </div>
          )}
        </>
      )}

      {/* View Modal */}
      {selected && (
        <RepairModal
          repair={selected}
          statuses={statuses}
          onClose={() => setSelected(null)}
          onUpdated={fetchRepairs}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditRepairModal
          repair={editing}
          statuses={statuses}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setRepairs(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditing(null);
            setToast({ message: 'התיקון עודכן בהצלחה', type: 'success' });
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center slide-up">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">מחיקת תיקון</h3>
            <p className="text-gray-500 text-sm mb-5">האם אתה בטוח שברצונך למחוק תיקון זה? הפעולה אינה הפיכה.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">ביטול</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600">מחק</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
