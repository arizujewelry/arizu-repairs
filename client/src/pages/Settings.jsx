import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Admin: manage users in own business ───────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'employee', display_name: '' });
  const [editForm, setEditForm] = useState({ display_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { user } = useAuth();

  const load = () => api.get('/businesses/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleAdd = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/businesses/users', form);
      setToast({ message: 'משתמש נוצר בהצלחה', type: 'success' });
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'employee', display_name: '' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleEdit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/businesses/users/${editUser.id}`, editForm);
      setToast({ message: 'משתמש עודכן', type: 'success' });
      setEditUser(null);
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`למחוק את המשתמש ${u.display_name}?`)) return;
    try {
      await api.delete(`/businesses/users/${u.id}`);
      setToast({ message: 'משתמש נמחק', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה', type: 'error' });
    }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white";
  const lbl = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ניהול משתמשים</h2>
        <button onClick={() => setShowAdd(true)} className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          + הוסף משתמש
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">אין משתמשים</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-right font-medium">שם תצוגה</th>
                <th className="px-4 py-3 text-right font-medium">שם משתמש</th>
                <th className="px-4 py-3 text-right font-medium">תפקיד</th>
                <th className="px-4 py-3 text-right font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.display_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'admin' ? 'מנהל' : 'עובד'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== user?.id && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditUser(u); setEditForm({ display_name: u.display_name, password: '' }); }} className="text-xs text-brand-600 hover:text-brand-800">עריכה</button>
                        <button onClick={() => handleDelete(u)} className="text-xs text-red-400 hover:text-red-600">מחיקה</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="הוסף משתמש חדש" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-3">
            <div><label className={lbl}>שם תצוגה</label><input className={inp} value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="שם לתצוגה" /></div>
            <div><label className={lbl}>שם משתמש *</label><input className={inp} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required /></div>
            <div><label className={lbl}>סיסמה * (לפחות 6 תווים)</label><input type="password" className={inp} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required /></div>
            <div><label className={lbl}>תפקיד</label>
              <select className={inp} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="employee">עובד</option>
                <option value="admin">מנהל</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">ביטול</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{loading ? 'שומר...' : 'הוסף'}</button>
            </div>
          </form>
        </Modal>
      )}

      {editUser && (
        <Modal title={`עריכת ${editUser.display_name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div><label className={lbl}>שם תצוגה</label><input className={inp} value={editForm.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></div>
            <div><label className={lbl}>סיסמה חדשה (השאר ריק לאי שינוי)</label><input type="password" className={inp} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••" /></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">ביטול</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{loading ? 'שומר...' : 'שמור'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Superadmin: manage businesses ─────────────────────────────────────────
function BusinessManagement() {
  const [data, setData] = useState({ businesses: [], users: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', admin_username: '', admin_password: '', admin_display: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => api.get('/businesses').then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleAdd = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/businesses', form);
      setToast({ message: 'עסק חדש נוצר בהצלחה', type: 'success' });
      setShowAdd(false);
      setForm({ name: '', admin_username: '', admin_password: '', admin_display: '' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleDelete = async (biz) => {
    if (!confirm(`למחוק את העסק "${biz.name}"? כל הנתונים ימחקו לצמיתות!`)) return;
    try {
      await api.delete(`/businesses/${biz.id}`);
      setToast({ message: 'עסק נמחק', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'שגיאה', type: 'error' });
    }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white";
  const lbl = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">ניהול עסקים</h2>
        <button onClick={() => setShowAdd(true)} className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          + עסק חדש
        </button>
      </div>

      <div className="space-y-4">
        {data.businesses.map(biz => {
          const bizUsers = data.users.filter(u => u.business_id === biz.id);
          return (
            <div key={biz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{biz.name}</h3>
                  <p className="text-xs text-gray-400">מספר תיקון אחרון: ARZ-{biz.repair_counter}</p>
                </div>
                {biz.id !== 1 && (
                  <button onClick={() => handleDelete(biz)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5">מחק עסק</button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-500 text-xs uppercase mb-2">משתמשים ({bizUsers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {bizUsers.map(u => (
                    <span key={u.id} className="bg-gray-100 rounded-lg px-3 py-1 text-xs">
                      {u.display_name} <span className="text-gray-400">({u.role === 'admin' ? 'מנהל' : 'עובד'})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="עסק חדש" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-3">
            <div><label className={lbl}>שם העסק *</label><input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="לדוגמה: שעוני זהב" required /></div>
            <hr className="border-gray-100" />
            <p className="text-xs text-gray-500 font-medium">פרטי מנהל ראשוני</p>
            <div><label className={lbl}>שם תצוגה</label><input className={inp} value={form.admin_display} onChange={e => setForm(p => ({ ...p, admin_display: e.target.value }))} placeholder="לדוגמה: מנהל ראשי" /></div>
            <div><label className={lbl}>שם משתמש *</label><input className={inp} value={form.admin_username} onChange={e => setForm(p => ({ ...p, admin_username: e.target.value }))} required /></div>
            <div><label className={lbl}>סיסמה * (לפחות 6 תווים)</label><input type="password" className={inp} value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} required /></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">ביטול</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{loading ? 'יוצר...' : 'צור עסק'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <BusinessManagement />;
  return <UserManagement />;
}
