const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const DEFAULT_STATUSES = [
  { key: 'pending',       label: 'ממתין לטיפול',    color: '#F97316', is_supplier: 0, is_default: true },
  { key: 'in_progress',   label: 'בטיפול',           color: '#3B82F6', is_supplier: 0, is_default: true },
  { key: 'waiting_parts', label: 'ממתין לחלקים',     color: '#EAB308', is_supplier: 0, is_default: true },
  { key: 'ready',         label: 'מוכן לאיסוף',      color: '#22C55E', is_supplier: 0, is_default: true },
  { key: 'collected',     label: 'נאסף',              color: '#6B7280', is_supplier: 0, is_default: true },
];

// GET /api/statuses - all statuses (default + custom)
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const custom = db.prepare('SELECT * FROM custom_statuses ORDER BY created_at ASC').all();
  const all = [
    ...DEFAULT_STATUSES,
    ...custom.map(s => ({ ...s, is_default: false })),
  ];
  res.json(all);
});

// POST /api/statuses - add custom status (supplier)
router.post('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { label, color, is_supplier } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'שם הסטטוס נדרש' });
  }

  const key = 'custom_' + Date.now();
  try {
    const stmt = db.prepare(
      'INSERT INTO custom_statuses (key, label, color, is_supplier) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(key, label.trim(), color || '#8B5CF6', is_supplier ? 1 : 0);
    const created = db.prepare('SELECT * FROM custom_statuses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...created, is_default: false });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת הסטטוס' });
  }
});

// DELETE /api/statuses/:key - delete custom status
router.delete('/:key', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { key } = req.params;

  const status = db.prepare('SELECT * FROM custom_statuses WHERE key = ?').get(key);
  if (!status) {
    return res.status(404).json({ error: 'סטטוס לא נמצא' });
  }

  db.prepare('DELETE FROM custom_statuses WHERE key = ?').run(key);
  res.json({ success: true });
});

module.exports = router;
module.exports.DEFAULT_STATUSES = DEFAULT_STATUSES;
