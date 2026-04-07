import React, { useState, useEffect } from 'react';
import api from '../api';
import Toast from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

const DEFAULT_STATUSES = [
  { key: 'pending',       label: 'ממתין לטיפול',   color: '#F97316', is_default: true },
  { key: 'in_progress',   label: 'בטיפול',          color: '#3B82F6', is_default: true },
  { key: 'waiting_parts', label: 'ממתין לחלקים',    color: '#EAB308', is_default: true },
  { key: 'ready',         label: 'מוכן לאיסוף',     color: '#22C55E', is_default: true },
  { key: 'collected',     label: 'נאסף',             color: '#6B7280', is_default: true },
];

const SUPPLIER_COLORS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981',
  '#F59E0B', '#EF4444', '#6366F1', '#84CC16',
];

export default function StatusManager() {
  const [statuses, setStatuses] = useState([]);
  const [toast, setToast]       = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(SUPPLIER_COLORS[0]);
  const [newIsSupplier, setNewIsSupplier] = useState(true);
  const [adding, setAdding]     = useState(false);
  const [deleteKey, setDeleteKey] = useState(null);

  const fetchStatuses = async () => {
    try {
      const r = await api.get('/statuses');
      setStatuses(r.data.filter(s => !s.is_default));
    } catch {}
  };

  useEffect(() => { fetchStatuses(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim()) { setToast({ message: 'יש להזין שם לסטטוס', type: 'error' }); return; }
    setAdding(true);
    try {
      await api.post('/statuses', {
        label: newLabel.trim(),
        color: newColor,
        is_supplier: newIsSupplier ? 1 : 0,
      });
      setNewLabel('');
      setNewColor(SUPPLIER_COLORS[0]);
      setShowAdd(false);
      fetchStatuses();
      setToast({ message: 'הסטטוס נוסף בהצלחה', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה בהוספת הסטטוס', type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    try {
      await api.delete(`/statuses/${deleteKey}`);
      setDeleteKey(null);
      fetchStatuses();
      setToast({ message: 'הסטטוס נמחק', type: 'info' });
    } catch {
      setToast({ message: 'שגיאה במחיקה', type: 'error' });
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">ניהול סטטוסים</h1>
        <p className="text-gray-500 text-sm mt-1">הוסף ספקים וסטטוסים מותאמים לתיקונים</p>
      </div>

      {/* Default statuses */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
          <span>🏷️</span> סטטוסים ברירת מחדל
        </h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_STATUSES.map(s => (
            <StatusBadge key={s.key} status={s.key} label={s.label} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">סטטוסים אלו קבועים ולא ניתן למחוק אותם</p>
      </div>

      {/* Custom statuses */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
            <span>🏪</span> ספקים וסטטוסים מותאמים
          </h2>
          <button
            onClick={() => setShowAdd(p => !p)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 active:scale-[0.97] transition-all"
          >
            <span>+</span> הוסף
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-4 space-y-3 fade-in">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">שם הסטטוס / ספק</label>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder='לדוגמה: "אצל ראובן ספק" / "בייצור"'
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">צבע</label>
              <div className="flex flex-wrap gap-2">
                {SUPPLIER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsSupplier}
                onChange={e => setNewIsSupplier(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-gray-600">סמן כסטטוס ספק</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60"
              >
                {adding ? 'מוסיף...' : 'הוסף סטטוס'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {statuses.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-2xl mb-2">🏷️</p>
            <p className="text-sm">אין סטטוסים מותאמים עדיין</p>
            <p className="text-xs mt-1">לחץ על "הוסף" ליצירת ספק או סטטוס חדש</p>
          </div>
        ) : (
          <div className="space-y-2">
            {statuses.map(s => (
              <div key={s.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: s.color }} />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.label}</p>
                    {s.is_supplier === 1 && (
                      <span className="text-xs text-gray-400">ספק</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.key} label={s.label} color={s.color} size="sm" />
                  <button
                    onClick={() => setDeleteKey(s.key)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="מחק"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center slide-up">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">מחיקת סטטוס</h3>
            <p className="text-gray-500 text-sm mb-5">
              תיקונים עם סטטוס זה לא יימחקו, אך הסטטוס לא יופיע יותר ברשימה.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteKey(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">ביטול</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600">מחק</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
