const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { authenticateToken } = require('../middleware/auth');
const XLSX = require('xlsx');

const FROM_EMAIL = process.env.GMAIL_USER || 'info@arizu.co.il';
const FROM_NAME  = process.env.FROM_NAME  || 'אריזו תכשיטים';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'data', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `repair_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) &&
        allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('סוג קובץ לא נתמך. ניתן להעלות jpg, png או webp בלבד.'));
    }
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function statusLabel(status, db) {
  const defaults = {
    pending: 'ממתין לטיפול',
    in_progress: 'בטיפול',
    waiting_parts: 'ממתין לחלקים',
    ready: 'מוכן לאיסוף',
    collected: 'נאסף',
  };
  if (defaults[status]) return defaults[status];
  const custom = db.prepare('SELECT label FROM custom_statuses WHERE key = ?').get(status);
  return custom ? custom.label : status;
}

async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'מפתח Gmail לא מוגדר בשרת' };
  try {
    await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error('Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

function buildIntakeEmailHtml(repair) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <tr><td style="background:#B85C38;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:2px;">ARIZU</h1>
          <p style="color:#f5e6df;margin:5px 0 0;font-size:13px;">תכשיטים ותיקונים</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#B85C38;margin:0 0 6px;font-size:19px;">קיבלנו את המוצר שלך לתיקון!</h2>
          <p style="color:#555;margin:0 0 22px;font-size:14px;">שלום ${repair.customer_name}, המוצר שלך התקבל ונרשם במערכת.</p>
          <div style="background:#fdf6f3;border:2px solid #B85C38;border-radius:10px;padding:20px;text-align:center;margin-bottom:22px;">
            <p style="color:#B85C38;font-size:13px;margin:0 0 6px;font-weight:bold;">מספר תיקון שלך</p>
            <p style="color:#B85C38;font-size:32px;font-weight:bold;margin:0;letter-spacing:2px;">${repair.repair_number}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${repair.model ? `<tr><td style="padding:9px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;width:40%;">דגם / מוצר</td><td style="padding:9px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;color:#333;">${repair.model}</td></tr>` : ''}
            ${repair.fault_description ? `<tr><td style="padding:9px 12px;background:#fff;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;">תיאור תקלה</td><td style="padding:9px 12px;background:#fff;border-bottom:1px solid #f0e0d8;color:#333;">${repair.fault_description}</td></tr>` : ''}
            <tr><td style="padding:9px 12px;background:#fdf6f3;font-weight:bold;color:#B85C38;">תאריך קבלה</td><td style="padding:9px 12px;background:#fdf6f3;color:#333;">${formatDate(repair.intake_date)}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;margin:20px 0 0;line-height:1.6;">נעדכן אותך כשהמוצר יהיה מוכן לאיסוף.<br>לשאלות ניתן ליצור קשר עם החנות.<br>תודה שבחרת באריזו תכשיטים!</p>
        </td></tr>
        <tr><td style="background:#f9f0ec;padding:14px 40px;text-align:center;border-top:1px solid #f0e0d8;">
          <p style="color:#B85C38;font-size:12px;margin:0;">© ARIZU Jewelry — info@arizu.co.il</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildReadyEmailHtml(repair) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <tr><td style="background:#B85C38;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:2px;">ARIZU</h1>
          <p style="color:#f5e6df;margin:5px 0 0;font-size:13px;">תכשיטים ותיקונים</p>
        </td></tr>
        <tr><td style="padding:32px 40px;text-align:center;">
          <div style="font-size:52px;margin-bottom:12px;">✅</div>
          <h2 style="color:#B85C38;margin:0 0 8px;font-size:22px;">המוצר שלך מוכן לאיסוף!</h2>
          <p style="color:#555;margin:0 0 22px;font-size:14px;">שלום ${repair.customer_name}, התיקון הושלם ומחכה לך בחנות.</p>
          <div style="background:#fdf6f3;border:2px solid #B85C38;border-radius:10px;padding:18px;margin-bottom:22px;">
            <p style="color:#B85C38;font-size:13px;margin:0 0 4px;font-weight:bold;">מספר תיקון</p>
            <p style="color:#B85C38;font-size:28px;font-weight:bold;margin:0;">${repair.repair_number}</p>
          </div>
          ${repair.model ? `<p style="color:#666;font-size:14px;margin:0 0 6px;">מוצר: <strong>${repair.model}</strong></p>` : ''}
          ${repair.payment ? `<p style="color:#666;font-size:14px;margin:0 0 6px;">תשלום: <strong>${repair.payment}</strong></p>` : ''}
          <p style="color:#888;font-size:13px;margin:20px 0 0;line-height:1.6;">ניתן לאסוף את המוצר בשעות פעילות החנות.<br>תודה שבחרת באריזו תכשיטים!</p>
        </td></tr>
        <tr><td style="background:#f9f0ec;padding:14px 40px;text-align:center;border-top:1px solid #f0e0d8;">
          <p style="color:#B85C38;font-size:12px;margin:0;">© ARIZU Jewelry — info@arizu.co.il</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildEmailHtml(repair, db) {
  const currentStatus = statusLabel(repair.status, db);
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>עדכון תיקון אריזו</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#B85C38;padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:2px;">ARIZU</h1>
              <p style="color:#f5e6df;margin:6px 0 0;font-size:14px;">תכשיטים ותיקונים</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#B85C38;margin:0 0 8px;font-size:20px;">עדכון תיקון מספר ${repair.repair_number}</h2>
              <p style="color:#555;margin:0 0 24px;font-size:14px;">שלום ${repair.customer_name}, להלן פרטי התיקון שלך:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${repair.model ? `
                <tr>
                  <td style="padding:10px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;width:40%;border-radius:4px 0 0 0;">דגם / מוצר</td>
                  <td style="padding:10px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;color:#333;border-radius:0 4px 0 0;">${repair.model}</td>
                </tr>` : ''}
                ${repair.fault_description ? `
                <tr>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;">תיאור תקלה</td>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;color:#333;">${repair.fault_description}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:10px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;">תאריך קבלת תיקון</td>
                  <td style="padding:10px 12px;background:#fdf6f3;border-bottom:1px solid #f0e0d8;color:#333;">${formatDate(repair.intake_date)}</td>
                </tr>
                ${repair.received_date ? `
                <tr>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;">תאריך רכישה</td>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;color:#333;">${formatDate(repair.received_date)}</td>
                </tr>` : ''}
                ${repair.payment ? `
                <tr>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;font-weight:bold;color:#B85C38;">תשלום</td>
                  <td style="padding:10px 12px;background:#fff;border-bottom:1px solid #f0e0d8;color:#333;">${repair.payment}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:10px 12px;background:#fdf6f3;font-weight:bold;color:#B85C38;">סטטוס נוכחי</td>
                  <td style="padding:10px 12px;background:#fdf6f3;">
                    <span style="background:#B85C38;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;">${currentStatus}</span>
                  </td>
                </tr>
              </table>

              <p style="color:#888;font-size:13px;margin:24px 0 0;line-height:1.6;">
                לשאלות ניתן ליצור קשר עם החנות.<br>
                תודה שבחרת באריזו תכשיטים!
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f0ec;padding:16px 40px;text-align:center;border-top:1px solid #f0e0d8;">
              <p style="color:#B85C38;font-size:12px;margin:0;">© 2024 ARIZU Jewelry — info@arizu.co.il</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// GET /api/repairs - list with filters
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { search, status, date_from, date_to, payment, page = 1, limit = 50 } = req.query;

  let where = [];
  let params = [];

  if (search) {
    where.push('(customer_name LIKE ? OR repair_number LIKE ? OR phone LIKE ? OR model LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (date_from) {
    where.push('received_date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('received_date <= ?');
    params.push(date_to);
  }
  if (payment) {
    where.push('payment LIKE ?');
    params.push(`%${payment}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as count FROM repairs ${whereClause}`).get(...params);
  const repairs = db.prepare(
    `SELECT * FROM repairs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  res.json({ repairs, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/repairs/export - export to Excel
router.get('/export', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { status, date_from, date_to, search } = req.query;

  let where = [];
  let params = [];

  if (search) {
    where.push('(customer_name LIKE ? OR repair_number LIKE ? OR phone LIKE ? OR model LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) { where.push('status = ?'); params.push(status); }
  if (date_from) { where.push('received_date >= ?'); params.push(date_from); }
  if (date_to) { where.push('received_date <= ?'); params.push(date_to); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const repairs = db.prepare(`SELECT * FROM repairs ${whereClause} ORDER BY repair_number ASC`).all(...params);

  const statusLabels = {
    pending: 'ממתין לטיפול',
    in_progress: 'בטיפול',
    waiting_parts: 'ממתין לחלקים',
    ready: 'מוכן לאיסוף',
    collected: 'נאסף',
  };
  const customStatuses = db.prepare('SELECT key, label FROM custom_statuses').all();
  customStatuses.forEach(cs => { statusLabels[cs.key] = cs.label; });

  const data = repairs.map(r => ({
    'מספר תיקון': r.repair_number,
    'שם לקוח': r.customer_name,
    'טלפון': r.phone || '',
    'מייל': r.email || '',
    'תאריך קבלת תיקון': formatDate(r.intake_date),
    'תאריך רכישה': formatDate(r.received_date),
    'דגם / מוצר': r.model || '',
    'מקום רכישה': r.purchase_place || '',
    'תיאור תקלה': r.fault_description || '',
    'תשלום': r.payment || '',
    'סטטוס': statusLabels[r.status] || r.status,
    'תאריך יצירה': formatDate(r.created_at),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 24 },
    { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
    { wch: 16 }, { wch: 18 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'תיקונים');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="arizu-repairs-${Date.now()}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/repairs/stats - dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  const db = req.app.locals.db;

  const total = db.prepare("SELECT COUNT(*) as c FROM repairs WHERE status != 'collected'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM repairs WHERE status = 'pending'").get().c;
  const ready = db.prepare("SELECT COUNT(*) as c FROM repairs WHERE status = 'ready'").get().c;
  const inProgress = db.prepare("SELECT COUNT(*) as c FROM repairs WHERE status = 'in_progress'").get().c;
  const waitingParts = db.prepare("SELECT COUNT(*) as c FROM repairs WHERE status = 'waiting_parts'").get().c;

  // Count by all statuses
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM repairs GROUP BY status
  `).all();

  res.json({
    total_open: total,
    pending,
    ready,
    in_progress: inProgress,
    waiting_parts: waitingParts,
    by_status: byStatus,
  });
});

// GET /api/repairs/:id
router.get('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'תיקון לא נמצא' });

  const history = db.prepare(
    'SELECT * FROM repair_history WHERE repair_id = ? ORDER BY changed_at DESC'
  ).all(repair.id);

  res.json({ ...repair, history });
});

// POST /api/repairs - create new repair
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const db = req.app.locals.db;
  const {
    customer_name, phone, email, received_date, intake_date, model,
    purchase_place, fault_description, payment, send_email
  } = req.body;

  if (!customer_name || !customer_name.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'שם לקוח הוא שדה חובה' });
  }

  // Generate repair number
  const counter = db.prepare('UPDATE repair_counter SET last_number = last_number + 1 WHERE id = 1').run();
  const { last_number } = db.prepare('SELECT last_number FROM repair_counter WHERE id = 1').get();
  const repair_number = `ARZ-${last_number}`;

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;
  const today = new Date().toISOString().split('T')[0];

  try {
    const stmt = db.prepare(`
      INSERT INTO repairs (repair_number, customer_name, phone, email, received_date, intake_date, model,
        purchase_place, fault_description, payment, image_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(
      repair_number,
      customer_name.trim(),
      phone || null,
      email || null,
      received_date || null,
      intake_date || today,
      model || null,
      purchase_place || null,
      fault_description || null,
      payment || null,
      image_path
    );

    const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(result.lastInsertRowid);

    // Log history
    db.prepare(`
      INSERT INTO repair_history (repair_id, field_name, old_value, new_value, changed_by)
      VALUES (?, 'סטטוס', NULL, 'ממתין לטיפול', ?)
    `).run(repair.id, req.user.username);

    // Send intake confirmation email if requested
    let emailSent = false;
    let emailError = null;
    if (send_email === 'true' && email) {
      const result = await sendEmail({
        to: email,
        subject: `קבלת תיקון אריזו — מספר ${repair_number}`,
        html: buildIntakeEmailHtml(repair),
      });
      emailSent = result.ok;
      if (!result.ok) emailError = result.error;
    }

    res.status(201).json({ repair, email_sent: emailSent, email_error: emailError });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'שגיאה בשמירת התיקון' });
  }
});

// PUT /api/repairs/:id - update repair
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
  const db = req.app.locals.db;
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'תיקון לא נמצא' });

  const {
    customer_name, phone, email, received_date, intake_date, model,
    purchase_place, fault_description, payment, status
  } = req.body;

  const fields = {
    customer_name: customer_name?.trim() || repair.customer_name,
    phone: phone !== undefined ? phone : repair.phone,
    email: email !== undefined ? email : repair.email,
    received_date: received_date !== undefined ? (received_date || null) : repair.received_date,
    intake_date: intake_date || repair.intake_date,
    model: model !== undefined ? model : repair.model,
    purchase_place: purchase_place !== undefined ? purchase_place : repair.purchase_place,
    fault_description: fault_description !== undefined ? fault_description : repair.fault_description,
    payment: payment !== undefined ? payment : repair.payment,
    status: status || repair.status,
    image_path: req.file ? `/uploads/${req.file.filename}` : repair.image_path,
  };

  const fieldLabels = {
    customer_name: 'שם לקוח',
    phone: 'טלפון',
    email: 'מייל',
    received_date: 'תאריך רכישה',
    intake_date: 'תאריך קבלת תיקון',
    model: 'דגם',
    purchase_place: 'מקום רכישה',
    fault_description: 'תיאור תקלה',
    payment: 'תשלום',
    status: 'סטטוס',
    image_path: 'תמונה',
  };

  // Track changes
  const historyInsert = db.prepare(`
    INSERT INTO repair_history (repair_id, field_name, old_value, new_value, changed_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const [key, newVal] of Object.entries(fields)) {
    const oldVal = repair[key];
    if (String(oldVal || '') !== String(newVal || '')) {
      let oldLabel = oldVal;
      let newLabel = newVal;
      if (key === 'status') {
        oldLabel = statusLabel(oldVal, db);
        newLabel = statusLabel(newVal, db);
      }
      historyInsert.run(repair.id, fieldLabels[key] || key, oldLabel || '', newLabel || '', req.user.username);
    }
  }

  db.prepare(`
    UPDATE repairs SET
      customer_name=?, phone=?, email=?, received_date=?, intake_date=?, model=?,
      purchase_place=?, fault_description=?, payment=?, status=?, image_path=?,
      updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(
    fields.customer_name, fields.phone, fields.email, fields.received_date,
    fields.intake_date, fields.model, fields.purchase_place, fields.fault_description,
    fields.payment, fields.status, fields.image_path, repair.id
  );

  const updated = db.prepare('SELECT * FROM repairs WHERE id = ?').get(repair.id);
  const history = db.prepare('SELECT * FROM repair_history WHERE repair_id = ? ORDER BY changed_at DESC').all(repair.id);

  // Auto-send "ready for pickup" email when status changes to 'ready'
  if (status === 'ready' && repair.status !== 'ready' && updated.email) {
    sendEmail({
      to: updated.email,
      subject: `המוצר שלך מוכן לאיסוף — אריזו תכשיטים`,
      html: buildReadyEmailHtml(updated),
    }).catch(err => console.error('Ready email error:', err));
  }

  res.json({ ...updated, history });
});

// POST /api/repairs/:id/send-email - send status email manually
router.post('/:id/send-email', authenticateToken, async (req, res) => {
  const db = req.app.locals.db;
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'תיקון לא נמצא' });
  if (!repair.email) return res.status(400).json({ error: 'אין כתובת מייל ללקוח זה' });

  const transporter = getTransporter();
  if (!transporter) {
    return res.status(503).json({ error: 'שירות המייל אינו מוגדר. הוסף GMAIL_USER ו-GMAIL_APP_PASSWORD לרכבת' });
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: repair.email,
      subject: `עדכון תיקון אריזו — מספר ${repair.repair_number}`,
      html: buildEmailHtml(repair, db),
    });

    db.prepare(`
      INSERT INTO repair_history (repair_id, field_name, old_value, new_value, changed_by)
      VALUES (?, 'מייל', NULL, 'נשלח מייל עדכון ללקוח', ?)
    `).run(repair.id, req.user.username);

    res.json({ success: true, message: 'המייל נשלח בהצלחה' });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'שגיאה בשליחת המייל: ' + err.message });
  }
});

// DELETE /api/repairs/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) return res.status(404).json({ error: 'תיקון לא נמצא' });

  if (repair.image_path) {
    const fullPath = path.join(__dirname, '..', repair.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  db.prepare('DELETE FROM repair_history WHERE repair_id = ?').run(repair.id);
  db.prepare('DELETE FROM repairs WHERE id = ?').run(repair.id);
  res.json({ success: true });
});

module.exports = router;
