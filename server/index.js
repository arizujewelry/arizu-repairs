require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
// dataDir is mounted as a Railway Volume — persists across deployments
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads'); // inside the volume
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Database setup
const db = new Database(path.join(dataDir, 'repairs.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    display_name TEXT
  );

  CREATE TABLE IF NOT EXISTS custom_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    is_supplier INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_number TEXT UNIQUE NOT NULL,
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
    updated_at TEXT DEFAULT (datetime('now','localtime'))
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
`);

// Migrations — add new columns if not exist
const migrations = [
  `ALTER TABLE repairs ADD COLUMN intake_date TEXT`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch(e) { /* column already exists */ }
}

// Auto-seed: create default users if none exist
function autoSeed() {
  const bcrypt = require('bcryptjs');
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    const users = [
      { username: 'employee', password: 'arizu123',   role: 'employee', display_name: 'עובד חנות' },
      { username: 'admin',    password: 'arizuadmin', role: 'admin',    display_name: 'מנהל' },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)');
    for (const u of users) {
      insert.run(u.username, bcrypt.hashSync(u.password, 10), u.role, u.display_name);
    }
    console.log('✅ משתמשי ברירת מחדל נוצרו אוטומטית');
  }
}
autoSeed();

// Make db available to routes
app.locals.db = db;

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:4173',
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // allow all in prod
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir)); // serves /app/server/data/uploads

// Routes
const authRoutes = require('./routes/auth');
const repairsRoutes = require('./routes/repairs');
const statusesRoutes = require('./routes/statuses');

app.use('/api/auth', authRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/statuses', statusesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Arizu Jewelry Server is running' });
});

// In production: serve the built React app
// Try multiple possible paths for the client build
const possibleClientPaths = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(__dirname, 'public'),
];

let clientBuild = null;
for (const p of possibleClientPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    clientBuild = p;
    break;
  }
}

if (clientBuild) {
  console.log(`✅ Serving React app from: ${clientBuild}`);
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
} else {
  console.log('⚠️  React build not found. Searched:', possibleClientPaths);
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'API is running. React build not found.' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏪 Arizu Jewelry Server running on port ${PORT}`);
  console.log(`📦 Database: ${path.join(dataDir, 'repairs.db')}`);
  console.log(`🖼️  Uploads: ${uploadsDir}`);
  console.log(`🌐 Client build: ${clientBuild || 'NOT FOUND'}`);
  console.log('');
});
