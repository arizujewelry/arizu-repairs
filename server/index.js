require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, 'repairs.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try { db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    repair_counter INTEGER DEFAULT 1000,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  INSERT OR IGNORE INTO businesses (id, name) VALUES (1, 'אריזו תכשיטים');

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    display_name TEXT,
    business_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS custom_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    is_supplier INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    business_id INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    received_date TEXT,
    model TEXT,
    purchase_place TEXT,
    fault_description TEXT,
    payment TEXT,
    image_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    business_id INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS repair_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS repair_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_number INTEGER DEFAULT 1000
  );

  INSERT OR IGNORE INTO repair_counter (id, last_number) VALUES (1, 1000);
`); } catch(e) { console.error('DB INIT ERROR:', e.message); process.exit(1); }

// Migrations
const migrations = [
  `ALTER TABLE repairs ADD COLUMN intake_date TEXT`,
  `ALTER TABLE repairs ADD COLUMN business_id INTEGER DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN business_id INTEGER DEFAULT 1`,
  `ALTER TABLE custom_statuses ADD COLUMN business_id INTEGER DEFAULT 1`,
  `ALTER TABLE businesses ADD COLUMN repair_counter INTEGER DEFAULT 1000`,
];
for (const sql of migrations) {
  try { db.exec(sql); console.log('Migration OK:', sql.substring(0, 60)); } catch(e) { console.log('Migration skip:', e.message.substring(0, 80)); }
}

// Sync repair_counter from old table into businesses for business 1
try {
  const old = db.prepare('SELECT last_number FROM repair_counter WHERE id = 1').get();
  if (old) db.prepare('UPDATE businesses SET repair_counter = ? WHERE id = 1 AND repair_counter < ?').run(old.last_number, old.last_number);
} catch(e) {}

function autoSeed() {
  const bcrypt = require('bcryptjs');

  // Default business users (business_id=1)
  const regularCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE business_id = 1").get().c;
  if (regularCount === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO users (username, password, role, display_name, business_id) VALUES (?, ?, ?, ?, ?)');
    ins.run('employee', bcrypt.hashSync('arizu123', 10),   'employee', 'עובד חנות', 1);
    ins.run('admin',    bcrypt.hashSync('arizuadmin', 10), 'admin',    'מנהל',      1);
    console.log('✅ משתמשי ברירת מחדל נוצרו אוטומטית');
  }

  // Superadmin (no business)
  const superExists = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'superadmin'").get().c;
  if (!superExists) {
    const bcrypt = require('bcryptjs');
    db.prepare('INSERT OR IGNORE INTO users (username, password, role, display_name, business_id) VALUES (?, ?, ?, ?, NULL)')
      .run('superadmin', bcrypt.hashSync('superadmin123', 10), 'superadmin', 'מנהל ראשי');
    console.log('✅ superadmin נוצר (superadmin / superadmin123)');
  }
}
try { autoSeed(); } catch(e) { console.error('AUTOSEED ERROR:', e.message, e.stack); }

app.locals.db = db;

app.use(cors({ origin: () => true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

const authRoutes       = require('./routes/auth');
const repairsRoutes    = require('./routes/repairs');
const statusesRoutes   = require('./routes/statuses');
const businessesRoutes = require('./routes/businesses');

app.use('/api/auth',       authRoutes);
app.use('/api/repairs',    repairsRoutes);
app.use('/api/statuses',   statusesRoutes);
app.use('/api/businesses', businessesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const possibleClientPaths = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(__dirname, 'public'),
];

let clientBuild = null;
for (const p of possibleClientPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) { clientBuild = p; break; }
}

if (clientBuild) {
  console.log(`✅ Serving React app from: ${clientBuild}`);
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads'))
      res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  console.log('⚠️  React build not found.');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏪 Arizu Jewelry Server running on port ${PORT}`);
  console.log(`📦 Database: ${path.join(dataDir, 'repairs.db')}`);
  console.log(`🌐 Client build: ${clientBuild || 'NOT FOUND'}\n`);
});
