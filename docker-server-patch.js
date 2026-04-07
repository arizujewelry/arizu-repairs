// This file is used in Docker to patch the server to serve the React build
// It's automatically loaded instead of index.js when running in Docker

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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
    phone TEXT, email TEXT, received_date TEXT,
    model TEXT, purchase_place TEXT, fault_description TEXT,
    payment TEXT, image_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS repair_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT, new_value TEXT, changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS repair_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_number INTEGER DEFAULT 1000
  );
  INSERT OR IGNORE INTO repair_counter (id, last_number) VALUES (1, 1000);
`);

app.locals.db = db;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

const authRoutes    = require('./routes/auth');
const repairsRoutes = require('./routes/repairs');
const statusesRoutes = require('./routes/statuses');

app.use('/api/auth',    authRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/statuses', statusesRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React app
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🏪 Arizu Jewelry running on port ${PORT}`);
});
