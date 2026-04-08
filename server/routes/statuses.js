const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const DEFAULT_STATUSES = [
  { key: 'pending',       label: 'ממתין לטיפול',  color: '#F97316', is_supplier: 0, is_default: true },
  { key: 'in_progress',   label: 'בטיפול',         color: '#3B82F6', is_supplier: 0, is_default: true },
  { key: 'waiting_parts', label: 'ממתין לחלקים',   color: '#EAB308', is_supplier: 0, is_default: true },
  { key: 'ready',         label: 'מוכן לאיסוף',    color: '#22C55E', is_supplier: 0, is_default: true },
  { key: 'collected',     label: 'נאסף',            color: '#6B7280', is_supplier: 0, is_default: true },
];

router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id || 1;
  const custom = db.prepare('SELECT * FROM custom_statuses WHERE business_id = ? ORDER BY created_at ASC').all(bizId);
  res.json([...DEFAULT_STATUSES, ...custom.map(s => ({ ...s, is_default: false }))]);
});

router.post('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id || 1;
  const { label, color, is_supplier } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'שם הסטטוס נדרש' });

  const key = 'custom_' + Date.now();
  try {
    const result = db.prepare('INSERT INTO custom_statuses (key, label, color, is_supplier, business_id) VALUES (?, ?, ?, ?, ?)')
      .run(key, label.trim(), color || '#8B5CF6', is_supplier ? 1 : 0, bizId);
    const created = db.prepare('SELECT * FROM custom_statuses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...created, is_default: false });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת הסטטוס' });
  }
});

router.delete('/:key', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id || 1;
  const status = db.prepare('SELECT * FROM custom_statuses WHERE key = ? AND business_id = ?').get(req.params.key, bizId);
  if (!status) return res.status(404).json({ error: 'סטטוס לא נמצא' });
  db.prepare('DELETE FROM custom_statuses WHERE key = ? AND business_id = ?').run(req.params.key, bizId);
  res.json({ success: true });
});

module.exports = router;
module.exports.DEFAULT_STATUSES = DEFAULT_STATUSES;
