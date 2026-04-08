const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });

  let business_name = null;
  if (user.business_id) {
    const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(user.business_id);
    business_name = biz?.name || null;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name, business_id: user.business_id, business_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name || user.username, business_id: user.business_id, business_name },
  });
});

router.get('/me', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const user = db.prepare('SELECT id, username, role, display_name, business_id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
  let business_name = null;
  if (user.business_id) {
    const biz = db.prepare('SELECT name FROM businesses WHERE id = ?').get(user.business_id);
    business_name = biz?.name || null;
  }
  res.json({ ...user, business_name });
});

module.exports = router;
