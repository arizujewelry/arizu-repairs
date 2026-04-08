import React, { useState, useEffect } from 'react';
import api from '../api';
import Toast from '../components/Toast';

export default function NewRepair() {
  const today = new Date().toISOString().split('T')[0];

  const [noDate, setNoDate] = useState(false);
  const [form, setForm] = useState({
    customer_name:    '',
    phone:            '',
    email:            '',
    intake_date:      today,
    received_date:    today,
    model:            '',
    purchase_place:   '',
    fault_description: '',
    payment:          '',
    send_email:       false,
  });
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);
  const [success, setSuccess]       = useState(null); // { repair_number, email_sent }

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImage = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'הקובץ גדול מדי. מקסימום 5MB', type: 'error' });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setNoDate(false);
    setForm({
      customer_name: '', phone: '', email: '',
      intake_date: today, received_date: today, model: '', purchase_place: '',
      fault_description: '', payment: '', send_email: false,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      setToast({ message: 'שם לקוח הוא שדה חובה', type: 'error' });
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'send_email') fd.append(k, v ? 'true' : 'false');
        else fd.append(k, v);
      });
      if (imageFile) fd.append('image', imageFile);

      const r = await api.post('/repairs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess({
        repair_number: r.data.repair.repair_number,
        email_sent: r.data.email_sent,
        email_error: r.data.email_error,
      });
      resetForm();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה בשמירת התיקון', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">תיקון חדש</h1>
        <p className="text-gray-500 text-sm mt-1">מלא את פרטי הלקוח והמוצר לתיקון</p>
      </div>

      {/* Success popup */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center slide-up">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">התיקון נרשם בהצלחה!</h2>
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-6 py-4 mb-4">
              <p className="text-sm text-brand-600 font-medium mb-1">מספר תיקון</p>
              <p className="text-3xl font-bold text-brand-600">{success.repair_number}</p>
            </div>
            {success.email_sent && (
              <p className="text-sm text-green-600 mb-3">📧 אישור נשלח במייל ללקוח</p>
            )}
            {success.email_error && (
              <p className="text-xs text-orange-500 mb-3">⚠️ {success.email_error}</p>
            )}
            <button
              onClick={() => setSuccess(null)}
              className="w-full bg-brand-500 text-white rounded-xl py-3 font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              תיקון חדש נוסף
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">

        {/* Section: Customer */}
        <div>
          <h3 className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">פרטי לקוח</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>שם לקוח <span className="text-red-400">*</span></label>
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="שם מלא של הלקוח"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>טלפון</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                type="tel"
                placeholder="05X-XXXXXXX"
                className={inputCls}
                inputMode="tel"
              />
            </div>
            <div>
              <label className={labelCls}>מייל לקוח</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="example@mail.com"
                className={inputCls}
                inputMode="email"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Section: Product */}
        <div>
          <h3 className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">פרטי מוצר</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>תאריך קבלת תיקון</label>
              <input
                name="intake_date"
                value={form.intake_date}
                onChange={handleChange}
                type="date"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>תאריך רכישה</label>
              <input
                name="received_date"
                value={noDate ? '' : form.received_date}
                onChange={handleChange}
                type="date"
                className={inputCls}
                disabled={noDate}
              />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noDate}
                  onChange={e => {
                    setNoDate(e.target.checked);
                    if (e.target.checked) setForm(p => ({ ...p, received_date: '' }));
                    else setForm(p => ({ ...p, received_date: today }));
                  }}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-xs text-gray-500">ללא תאריך רכישה / אין קבלה</span>
              </label>
            </div>
            <div>
              <label className={labelCls}>דגם / שם המוצר</label>
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="לדוגמה: טבעת זהב 14K"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>מקום רכישה</label>
              <input
                name="purchase_place"
                value={form.purchase_place}
                onChange={handleChange}
                placeholder="שם חנות / אתר / מגרש"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>תיאור תקלה</label>
              <textarea
                name="fault_description"
                value={form.fault_description}
                onChange={handleChange}
                rows={3}
                placeholder="תאר את הבעיה בפירוט..."
                className={inputCls + ' resize-none leading-relaxed'}
              />
            </div>
            <div>
              <label className={labelCls}>תשלום</label>
              <input
                name="payment"
                value={form.payment}
                onChange={handleChange}
                placeholder='לדוגמה: ₪150 / שולם / לא שולם'
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Section: Image */}
        <div>
          <h3 className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">תמונת מוצר</h3>
          {imagePreview ? (
            <div className="flex flex-col items-center gap-2">
              <img src={imagePreview} alt="תצוגה מקדימה" className="max-h-40 rounded-xl object-contain border border-gray-200" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                הסר תמונה
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <label className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-center">
                <span className="text-2xl">📷</span>
                <span className="text-xs text-gray-500">צלם תמונה</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
              </label>
              <label className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-center">
                <span className="text-2xl">🖼️</span>
                <span className="text-xs text-gray-500">בחר מגלריה</span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Email option */}
        {form.email && (
          <label className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl cursor-pointer border border-brand-100">
            <input
              type="checkbox"
              name="send_email"
              checked={form.send_email}
              onChange={handleChange}
              className="w-5 h-5 rounded accent-brand-500"
            />
            <div>
              <p className="text-sm font-medium text-brand-700">שלח מייל אישור ללקוח</p>
              <p className="text-xs text-brand-500">אישור קבלת תיקון יישלח אל {form.email}</p>
            </div>
          </label>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white rounded-xl py-4 text-base font-bold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-brand-200 mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              שומר תיקון...
            </span>
          ) : '✅ שמור תיקון'}
        </button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
