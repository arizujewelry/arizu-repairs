require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'repairs.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    display_name TEXT
  );
`);

const users = [
  { username: 'employee', password: 'arizu123',    role: 'employee', display_name: 'עובד חנות' },
  { username: 'admin',    password: 'arizuadmin',  role: 'admin',    display_name: 'מנהל' },
];

const insert = db.prepare(
  'INSERT OR REPLACE INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)'
);

for (const u of users) {
  const hashed = bcrypt.hashSync(u.password, 10);
  insert.run(u.username, hashed, u.role, u.display_name);
  console.log(`✅ משתמש נוצר: ${u.username} (${u.display_name})`);
}

console.log('\n✨ Seed הושלם בהצלחה!');
console.log('─────────────────────────────');
console.log('פרטי כניסה:');
console.log('  עובד:  employee / arizu123');
console.log('  מנהל:  admin    / arizuadmin');
console.log('─────────────────────────────\n');

db.close();
