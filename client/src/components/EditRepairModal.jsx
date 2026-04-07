import React, { useState } from 'react';
import api from '../api';

export default function EditRepairModal({ repair, statuses, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_name:    repair.customer_name || '',
    phone:            repair.phone || '',
    email:            repair.email || '',
    intake_date:      repair.intake_date || '',
    received_date:    repair.received_date || '',
    model:            repair.model || '',
    purchase_place:   repair.purchase_place || '',
    fault_description: repair.fault_description || '',
    payment:          repair.payment || '',
    status:           repair.status || 'pending',
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('שם לקוח הוא שדה חובה'); return; }
    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const r = await api.put(`/repairs/${repair.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSaved(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] flex flex-col slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-brand-600">עריכת {repair.repair_number}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>שם לקוח *</label>
              <input name="customer_name" value={form.customer_name} onChange={handleChange} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>טלפון</label>
              <input name="phone" value={form.phone} onChange={handleChange} type="tel" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>מייל</label>
              <input name="email" value={form.email} onChange={handleChange} type="email" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>תאריך קבלת תיקון</label>
              <input name="intake_date" value={form.intake_date} onChange={handleChange} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>תאריך רכישה</label>
              <input name="received_date" value={form.received_date} onChange={handleChange} type="date" className={inputCls} placeholder="ללא תאריך" />
            </div>
            <div>
              <label className={labelCls}>סטטוס</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                {statuses?.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>דגם / שם המוצר</label>
              <input name="model" value={form.model} onChange={handleChange} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>מקום רכישה</label>
              <input name="purchase_place" value={form.purchase_place} onChange={handleChange} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>תיאור תקלה</label>
              <textarea name="fault_description" value={form.fault_description} onChange={handleChange} rows={3} className={inputCls + ' resize-none'} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>תשלום</label>
              <input name="payment" value={form.payment} onChange={handleChange} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>תמונה חדשה (אופציונלי)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setImageFile(e.target.files[0])}
                className="w-full text-sm text-gray-500 file:ml-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
              {repair.image_path && !imageFile && (
                <p className="text-xs text-gray-400 mt-1">תמונה קיימת תישמר אם לא תבחר חדשה</p>
              )}
            </div>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}
