import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import api from '../api';

function HistoryItem({ item }) {
  const d = new Date(item.changed_at);
  const dateStr = d.toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  return (
    <div className="flex gap-3 text-sm py-2 border-b border-gray-100 last:border-0">
      <div className="shrink-0 text-gray-400 text-xs mt-0.5 w-28">{dateStr}</div>
      <div className="flex-1">
        <span className="font-medium text-gray-700">{item.field_name}: </span>
        {item.old_value && (
          <><span className="line-through text-gray-400">{item.old_value}</span> → </>
        )}
        <span className="text-brand-600 font-medium">{item.new_value}</span>
        {item.changed_by && (
          <span className="text-gray-400 text-xs mr-2">({item.changed_by})</span>
        )}
      </div>
    </div>
  );
}

export default function RepairModal({ repair, statuses, onClose, onUpdated }) {
  const [sending, setSending]   = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [tab, setTab]           = useState('details');

  const statusObj = statuses?.find(s => s.key === repair.status);

  const handleSendEmail = async () => {
    setSending(true);
    setEmailMsg('');
    try {
      const r = await api.post(`/repairs/${repair.id}/send-email`);
      setEmailMsg('✅ ' + r.data.message);
      if (onUpdated) onUpdated();
    } catch (err) {
      setEmailMsg('❌ ' + (err.response?.data?.error || 'שגיאה בשליחת המייל'));
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  };

  const Field = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="py-2.5 border-b border-gray-100 last:border-0">
        <dt className="text-xs font-medium text-gray-400 mb-0.5">{label}</dt>
        <dd className="text-sm text-gray-800 leading-relaxed">{value}</dd>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-brand-600">{repair.repair_number}</h2>
            <p className="text-sm text-gray-500">{repair.customer_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={repair.status} label={statusObj?.label} color={statusObj?.color} />
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[['details','פרטים'],['history','היסטוריה']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === key
                  ? 'text-brand-600 border-b-2 border-brand-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tab === 'details' && (
            <dl>
              <Field label="טלפון" value={repair.phone} />
              <Field label="מייל לקוח" value={repair.email} />
              <Field label="תאריך קבלה" value={formatDate(repair.received_date)} />
              <Field label="דגם / מוצר" value={repair.model} />
              <Field label="מקום רכישה" value={repair.purchase_place} />
              <Field label="תיאור תקלה" value={repair.fault_description} />
              <Field label="תשלום" value={repair.payment} />
              <Field label="תאריך עדכון" value={formatDate(repair.updated_at)} />

              {repair.image_path && (
                <div className="py-2.5">
                  <dt className="text-xs font-medium text-gray-400 mb-2">תמונת המוצר</dt>
                  <a href={repair.image_path} target="_blank" rel="noopener noreferrer">
                    <img
                      src={repair.image_path}
                      alt="תמונת מוצר"
                      className="rounded-xl max-h-56 w-auto border border-gray-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </dl>
          )}

          {tab === 'history' && (
            <div>
              {!repair.history?.length ? (
                <p className="text-center text-gray-400 py-8 text-sm">אין היסטוריית שינויים</p>
              ) : (
                repair.history.map(h => <HistoryItem key={h.id} item={h} />)
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {repair.email && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            {emailMsg && (
              <p className="text-sm mb-2 text-center font-medium">{emailMsg}</p>
            )}
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? 'שולח...' : '📧 שלח מייל עדכון ללקוח'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
