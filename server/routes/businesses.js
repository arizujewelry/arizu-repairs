const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');

function requireSuperadmin(req, res, next) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'גישה אסורה' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'גישה אסורה' });
  next();
}

// GET /api/businesses — all businesses (superadmin only)
router.get('/', authenticateToken, requireSuperadmin, (req, res) => {
  const db = req.app.locals.db;
  const businesses = db.prepare('SELECT id, name, repair_counter, created_at FROM businesses ORDER BY id ASC').all();
  const users = db.prepare("SELECT id, username, role, display_name, business_id FROM users WHERE role != 'superadmin' ORDER BY business_id, id").all();
  res.json({ businesses, users });
});

// POST /api/businesses — create new business (superadmin only)
router.post('/', authenticateToken, requireSuperadmin, (req, res) => {
  const db = req.app.locals.db;
  const { name, admin_username, admin_password, admin_display } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'שם עסק נדרש' });
  if (!admin_username?.trim()) return res.status(400).json({ error: 'שם משתמש למנהל נדרש' });
  if (!admin_password || admin_password.length < 6) return res.status(400).json({ error: 'סיסמה חייבת להיות לפחות 6 תווים' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(admin_username.trim());
  if (existing) return res.status(400).json({ error: 'שם משתמש כבר קיים' });

  try {
    const biz = db.prepare('INSERT INTO businesses (name) VALUES (?)').run(name.trim());
    const bizId = biz.lastInsertRowid;

    db.prepare('INSERT INTO users (username, password, role, display_name, business_id) VALUES (?, ?, ?, ?, ?)')
      .run(admin_username.trim(), bcrypt.hashSync(admin_password, 10), 'admin', admin_display?.trim() || admin_username.trim(), bizId);

    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(bizId);
    res.status(201).json({ business });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת העסק' });
  }
});

// DELETE /api/businesses/:id — delete business (superadmin only)
router.delete('/:id', authenticateToken, requireSuperadmin, (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id);
  if (id === 1) return res.status(400).json({ error: 'לא ניתן למחוק את העסק הראשי' });

  const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
  if (!biz) return res.status(404).json({ error: 'עסק לא נמצא' });

  db.prepare('DELETE FROM users WHERE business_id = ?').run(id);
  db.prepare('DELETE FROM custom_statuses WHERE business_id = ?').run(id);
  db.prepare('DELETE FROM repairs WHERE business_id = ?').run(id);
  db.prepare('DELETE FROM businesses WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/businesses/users — users in current business (admin)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.role === 'superadmin' ? null : req.user.business_id;
  const users = bizId
    ? db.prepare("SELECT id, username, role, display_name FROM users WHERE business_id = ? AND role != 'superadmin' ORDER BY id").all(bizId)
    : db.prepare("SELECT id, username, role, display_name, business_id FROM users WHERE role != 'superadmin' ORDER BY id").all();
  res.json(users);
});

// POST /api/businesses/users — create user in current business (admin)
router.post('/users', authenticateToken, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id;
  const { username, password, role, display_name } = req.body;

  if (!username?.trim()) return res.status(400).json({ error: 'שם משתמש נדרש' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'סיסמה חייבת להיות לפחות 6 תווים' });
  if (!['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'תפקיד לא תקין' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(400).json({ error: 'שם משתמש כבר קיים' });

  try {
    const result = db.prepare('INSERT INTO users (username, password, role, display_name, business_id) VALUES (?, ?, ?, ?, ?)')
      .run(username.trim(), bcrypt.hashSync(password, 10), role, display_name?.trim() || username.trim(), bizId);
    const user = db.prepare('SELECT id, username, role, display_name FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת המשתמש' });
  }
});

// PUT /api/businesses/users/:id — update user password/display_name
router.put('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id;
  const { display_name, password } = req.body;

  const user = bizId
    ? db.prepare('SELECT * FROM users WHERE id = ? AND business_id = ?').get(req.params.id, bizId)
    : db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

  const updates = [];
  const params = [];
  if (display_name?.trim()) { updates.push('display_name = ?'); params.push(display_name.trim()); }
  if (password && password.length >= 6) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (!updates.length) return res.status(400).json({ error: 'אין שדות לעדכון' });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// DELETE /api/businesses/users/:id — delete user
router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const bizId = req.user.business_id;

  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'לא ניתן למחוק את המשתמש הנוכחי' });

  const user = bizId
    ? db.prepare('SELECT * FROM users WHERE id = ? AND business_id = ?').get(req.params.id, bizId)
    : db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
